import type {
  CreateRunInput,
  DedupeProgressRecord,
  DedupeRunDetail,
  DedupeRunRecord,
  DedupeRunStatus,
  MessageChangeInput,
  ProgressInput,
} from './writer';

export interface CreateRunRequest {
  type: CreateRunInput['type'];
  scope: CreateRunInput['scope'];
  mailboxId?: string | null;
  actionId?: string | null;
  stats?: Record<string, unknown>;
}

export interface UpdateRunRequest {
  status?: DedupeRunStatus;
  progress?: ProgressInput;
  stats?: Record<string, unknown>;
}

export interface PurgeResult {
  runId: string;
  purgedCount: number;
  emailIds: string[];
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return body;
}

/** Browser-side fetch wrapper for dedupe audit API routes. */
export const dedupeAuditClient = {
  async createRun(input: CreateRunRequest): Promise<DedupeRunRecord> {
    const response = await fetch('/api/dedupe/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseJsonResponse<DedupeRunRecord>(response);
  },

  async listRuns(limit?: number): Promise<DedupeRunRecord[]> {
    const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
    const response = await fetch(`/api/dedupe/runs${query}`);
    const body = await parseJsonResponse<{ runs: DedupeRunRecord[] }>(response);
    return body.runs;
  },

  async getRun(runId: string): Promise<DedupeRunDetail> {
    const response = await fetch(`/api/dedupe/runs/${encodeURIComponent(runId)}`);
    return parseJsonResponse<DedupeRunDetail>(response);
  },

  async updateRun(runId: string, input: UpdateRunRequest): Promise<DedupeRunRecord> {
    const response = await fetch(`/api/dedupe/runs/${encodeURIComponent(runId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseJsonResponse<DedupeRunRecord>(response);
  },

  async appendProgress(runId: string, progress: ProgressInput): Promise<DedupeProgressRecord> {
    const response = await fetch(`/api/dedupe/runs/${encodeURIComponent(runId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    });
    const body = await parseJsonResponse<{ run: DedupeRunRecord; progress: DedupeProgressRecord }>(
      response,
    );
    return body.progress;
  },

  async recordChanges(runId: string, changes: MessageChangeInput[]): Promise<number> {
    const response = await fetch(`/api/dedupe/runs/${encodeURIComponent(runId)}/changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    });
    const body = await parseJsonResponse<{ recorded: number }>(response);
    return body.recorded;
  },

  async purgeDueMessages(): Promise<PurgeResult> {
    const response = await fetch('/api/dedupe/purge', { method: 'POST' });
    return parseJsonResponse<PurgeResult>(response);
  },
};