import { AuthenticationResults } from './jmap/types';

/**
 * Parse Authentication-Results header to extract SPF, DKIM, DMARC results
 */
export function parseAuthenticationResults(header: string): AuthenticationResults {
  const results: AuthenticationResults = {};

  // Parse SPF
  const spfMatch = header.match(/spf=(\w+)(?:\s+\([^)]*\))?\s+(?:smtp\.(?:mailfrom|helo)=([^\s;]+))?/);
  if (spfMatch) {
    results.spf = {
      result: spfMatch[1] as any,
      domain: spfMatch[2]
    };
  }

  // Parse DKIM
  const dkimMatch = header.match(/dkim=(\w+)(?:\s+header\.d=([^\s]+))?(?:\s+header\.s=([^\s]+))?/);
  if (dkimMatch) {
    results.dkim = {
      result: dkimMatch[1] as any,
      domain: dkimMatch[2],
      selector: dkimMatch[3]
    };
  }

  // Parse DMARC
  const dmarcMatch = header.match(/dmarc=(\w+)(?:\s+header\.from=([^\s]+))?(?:\s+policy\.dmarc=(\w+))?/);
  if (dmarcMatch) {
    results.dmarc = {
      result: dmarcMatch[1] as any,
      domain: dmarcMatch[2],
      policy: dmarcMatch[3] as any
    };
  }

  // Parse IP reverse lookup
  const iprevMatch = header.match(/iprev=(\w+)(?:\s+policy\.iprev=([\d.]+))?/);
  if (iprevMatch) {
    results.iprev = {
      result: iprevMatch[1] as any,
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
export function parseReceivedHeaders(headers: string[]): Array<{
  from: string;
  by: string;
  timestamp?: string;
  protocol?: string;
  id?: string;
}> {
  const path: any[] = [];

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
        color: 'text-green-600 dark:text-green-400',
        icon: 'check',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800'
      };
    case 'fail':
    case 'permerror':
      return {
        color: 'text-red-600 dark:text-red-400',
        icon: 'x',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800'
      };
    case 'softfail':
    case 'neutral':
    case 'temperror':
      return {
        color: 'text-amber-600 dark:text-amber-400',
        icon: 'alert',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800'
      };
    default:
      return {
        color: 'text-gray-400 dark:text-gray-500',
        icon: 'minus',
        bgColor: 'bg-gray-50 dark:bg-gray-900',
        borderColor: 'border-gray-200 dark:border-gray-700'
      };
  }
}

/**
 * Extract list headers (List-Unsubscribe, List-Id, etc.)
 */
export function extractListHeaders(headers: Record<string, string | string[]>): {
  listId?: string;
  listUnsubscribe?: string;
  listHelp?: string;
  listPost?: string;
} {
  const result: any = {};

  if (headers['List-Id']) {
    result.listId = Array.isArray(headers['List-Id'])
      ? headers['List-Id'][0]
      : headers['List-Id'];
  }

  if (headers['List-Unsubscribe']) {
    const unsub = Array.isArray(headers['List-Unsubscribe'])
      ? headers['List-Unsubscribe'][0]
      : headers['List-Unsubscribe'];
    // Extract URL from <url> format
    const match = unsub.match(/<([^>]+)>/);
    result.listUnsubscribe = match ? match[1] : unsub;
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