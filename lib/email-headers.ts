import { AuthenticationResults } from './jmap/types';
import { parseUnsubscribeUrls } from './validation';

/**
 * Parse Authentication-Results header to extract SPF, DKIM, DMARC results
 */
export function parseAuthenticationResults(header: string): AuthenticationResults {
  const results: AuthenticationResults = {};

  type SpfResult = 'pass' | 'fail' | 'softfail' | 'neutral' | 'none' | 'temperror' | 'permerror';
  type DkimResult = 'pass' | 'fail' | 'policy' | 'neutral' | 'temperror' | 'permerror';
  type DmarcResult = 'pass' | 'fail' | 'none';
  type DmarcPolicy = 'reject' | 'quarantine' | 'none';

  // Parse SPF
  const spfMatch = header.match(/spf=(\w+)(?:\s+\([^)]*\))?\s+(?:smtp\.(?:mailfrom|helo)=([^\s;]+))?/);
  if (spfMatch) {
    results.spf = {
      result: spfMatch[1] as SpfResult,
      domain: spfMatch[2]
    };
  }

  // Parse DKIM
  const dkimMatch = header.match(/dkim=(\w+)(?:\s+header\.d=([^\s]+))?(?:\s+header\.s=([^\s]+))?/);
  if (dkimMatch) {
    results.dkim = {
      result: dkimMatch[1] as DkimResult,
      domain: dkimMatch[2],
      selector: dkimMatch[3]
    };
  }

  // Parse DMARC
  const dmarcMatch = header.match(/dmarc=(\w+)(?:\s+header\.from=([^\s]+))?(?:\s+policy\.dmarc=(\w+))?/);
  if (dmarcMatch) {
    results.dmarc = {
      result: dmarcMatch[1] as DmarcResult,
      domain: dmarcMatch[2],
      policy: dmarcMatch[3] as DmarcPolicy | undefined
    };
  }

  // Parse IP reverse lookup
  const iprevMatch = header.match(/iprev=(\w+)(?:\s+policy\.iprev=([\d.]+))?/);
  if (iprevMatch) {
    results.iprev = {
      result: iprevMatch[1] as 'pass' | 'fail',
      ip: iprevMatch[2]
    };
  }

  return results;
}

/**
 * Parse spam score from X-Spam-Result or X-Spam-Status headers
 */
export function parseSpamScore(header: string): { score: number; status: string } | null {
  // Try X-Spam-Status format: "No, score=-0.25"
  const statusMatch = header.match(/^(Yes|No),?\s+score=([-\d.]+)/i);
  if (statusMatch) {
    return {
      status: statusMatch[1].toLowerCase(),
      score: parseFloat(statusMatch[2])
    };
  }

  // Try to extract just the score
  const scoreMatch = header.match(/score[=:]?\s*([-\d.]+)/i);
  if (scoreMatch) {
    const score = parseFloat(scoreMatch[1]);
    return {
      score,
      status: score > 5 ? 'spam' : 'ham'
    };
  }

  return null;
}

/**
 * Parse Received headers to extract mail routing path
 */
interface ReceivedHeaderInfo {
  from: string;
  by: string;
  timestamp?: string;
  protocol?: string;
  id?: string;
}

export function parseReceivedHeaders(headers: string[]): ReceivedHeaderInfo[] {
  const path: ReceivedHeaderInfo[] = [];

  for (const header of headers) {
    const fromMatch = header.match(/from\s+([^\s]+)(?:\s+\([^)]+\))?/);
    const byMatch = header.match(/by\s+([^\s]+)/);
    const dateMatch = header.match(/;\s+(.+)$/);
    const protoMatch = header.match(/with\s+(\w+)/);
    const idMatch = header.match(/id\s+([^\s;]+)/);

    if (fromMatch || byMatch) {
      path.push({
        from: fromMatch?.[1] || 'unknown',
        by: byMatch?.[1] || 'unknown',
        timestamp: dateMatch?.[1],
        protocol: protoMatch?.[1],
        id: idMatch?.[1]
      });
    }
  }

  return path;
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Get security status color and icon based on result
 */
export function getSecurityStatus(result?: string): {
  color: string;
  icon: 'check' | 'x' | 'alert' | 'minus';
  bgColor: string;
  borderColor: string;
} {
  switch (result) {
    case 'pass':
      return {
        color: 'text-green-700 dark:text-green-400',
        icon: 'check',
        bgColor: 'bg-gray-50 dark:bg-gray-800',
        borderColor: 'border-l-4 border-green-600 dark:border-green-500'
      };
    case 'fail':
    case 'permerror':
      return {
        color: 'text-red-700 dark:text-red-400',
        icon: 'x',
        bgColor: 'bg-gray-50 dark:bg-gray-800',
        borderColor: 'border-l-4 border-red-600 dark:border-red-500'
      };
    case 'softfail':
    case 'neutral':
    case 'temperror':
      return {
        color: 'text-amber-700 dark:text-amber-400',
        icon: 'alert',
        bgColor: 'bg-gray-50 dark:bg-gray-800',
        borderColor: 'border-l-4 border-amber-600 dark:border-amber-500'
      };
    default:
      return {
        color: 'text-gray-700 dark:text-gray-400',
        icon: 'minus',
        bgColor: 'bg-gray-50 dark:bg-gray-800',
        borderColor: 'border-l-4 border-gray-400 dark:border-gray-600'
      };
  }
}

export interface SpamLLMResult {
  verdict: string;
  explanation: string;
  category?: string;
  confidence?: string;
}

const STALWART_CATEGORIES = new Set(['unsolicited', 'commercial', 'harmful', 'legitimate']);
const STALWART_CONFIDENCE = new Set(['high', 'medium', 'low']);

function mapStalwartCategoryToVerdict(category: string): string {
  switch (category.toLowerCase()) {
    case 'legitimate':
      return 'LEGITIMATE';
    case 'harmful':
      return 'SUSPICIOUS';
    case 'unsolicited':
    case 'commercial':
      return 'SPAM';
    default:
      return 'SUSPICIOUS';
  }
}

/**
 * Parse X-Spam-LLM header to extract verdict and explanation.
 * Supports legacy "VERDICT (explanation)" and Stalwart "Category,Confidence,Explanation".
 */
export function parseSpamLLM(header: string): SpamLLMResult | null {
  const trimmed = header.trim();
  if (!trimmed) return null;

  const legacyMatch = trimmed.match(/^(LEGITIMATE|SPAM|SUSPICIOUS)\s*\((.+)\)\s*$/i);
  if (legacyMatch) {
    return {
      verdict: legacyMatch[1].toUpperCase(),
      explanation: legacyMatch[2].trim(),
    };
  }

  const firstComma = trimmed.indexOf(',');
  if (firstComma === -1) return null;
  const secondComma = trimmed.indexOf(',', firstComma + 1);
  if (secondComma === -1) return null;

  const category = trimmed.slice(0, firstComma).trim();
  const confidence = trimmed.slice(firstComma + 1, secondComma).trim();
  const explanation = trimmed.slice(secondComma + 1).trim();

  if (
    !STALWART_CATEGORIES.has(category.toLowerCase()) ||
    !STALWART_CONFIDENCE.has(confidence.toLowerCase()) ||
    !explanation
  ) {
    return null;
  }

  return {
    verdict: mapStalwartCategoryToVerdict(category),
    explanation,
    category,
    confidence,
  };
}

/**
 * Extract list headers (List-Unsubscribe, List-Id, etc.)
 */
interface ListHeaders {
  listId?: string;
  listUnsubscribe?: {
    http?: string;
    mailto?: string;
    preferred?: 'http' | 'mailto';
  };
  listHelp?: string;
  listPost?: string;
}

export function extractListHeaders(headers: Record<string, string | string[]>): ListHeaders {
  const result: ListHeaders = {};

  if (headers['List-Id']) {
    result.listId = Array.isArray(headers['List-Id'])
      ? headers['List-Id'][0]
      : headers['List-Id'];
  }

  if (headers['List-Unsubscribe']) {
    const unsub = Array.isArray(headers['List-Unsubscribe'])
      ? headers['List-Unsubscribe'][0]
      : headers['List-Unsubscribe'];

    const parsed = parseUnsubscribeUrls(unsub);
    if (parsed.preferred) {
      result.listUnsubscribe = parsed;
    }
  }

  if (headers['List-Help']) {
    result.listHelp = Array.isArray(headers['List-Help'])
      ? headers['List-Help'][0]
      : headers['List-Help'];
  }

  if (headers['List-Post']) {
    result.listPost = Array.isArray(headers['List-Post'])
      ? headers['List-Post'][0]
      : headers['List-Post'];
  }

  return result;
}