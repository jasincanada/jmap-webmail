'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { History, Loader2 } from 'lucide-react';
import { dedupeAuditClient } from '@/lib/dedupe-audit/client';
import type { DedupeRunRecord } from '@/lib/dedupe-audit/writer';
import { cn, formatMailboxCount } from '@/lib/utils';

interface DedupeRecentRunsProps {
  activeRunId?: string | null;
  refreshKey?: number;
  className?: string;
}

export function DedupeRecentRuns({ activeRunId, refreshKey = 0, className }: DedupeRecentRunsProps) {
  const t = useTranslations('dedupe.runs');
  const [runs, setRuns] = useState<DedupeRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const list = await dedupeAuditClient.listRuns(8);
      setRuns(list);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns, refreshKey]);

  const toggleRun = async (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setDetailMessage(null);
      return;
    }
    setExpandedRunId(runId);
    setDetailMessage(null);
    try {
      const detail = await dedupeAuditClient.getRun(runId);
      const lastProgress = detail.progress.at(-1);
      setDetailMessage(lastProgress?.message ?? null);
    } catch {
      setDetailMessage(t('detail_unavailable'));
    }
  };

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('loading')}
        </div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed border-border bg-card p-4', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="w-4 h-4" />
          {t('empty')}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <History className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">{t('title')}</h3>
      </div>
      <ul className="divide-y divide-border">
        {runs.map((run) => {
          const stats = run.stats ?? {};
          const scanned = typeof stats.scanned === 'number' ? stats.scanned : null;
          const duplicates = typeof stats.duplicates === 'number' ? stats.duplicates : null;
          const moved = typeof stats.moved === 'number' ? stats.moved : null;
          const isActive = run.id === activeRunId || run.status === 'running';

          return (
            <li key={run.id}>
              <button
                type="button"
                onClick={() => void toggleRun(run.id)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
                  isActive && 'bg-primary/5',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {t(`type_${run.type}`)} · {t(`scope_${run.scope}`)}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{run.id}</p>
                  </div>
                  <StatusBadge status={run.status} label={t(`status_${run.status}`)} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {scanned != null && t('stat_scanned', { count: formatMailboxCount(scanned) })}
                  {duplicates != null && ` · ${t('stat_duplicates', { count: formatMailboxCount(duplicates) })}`}
                  {moved != null && ` · ${t('stat_moved', { count: formatMailboxCount(moved) })}`}
                </p>
              </button>
              {expandedRunId === run.id && detailMessage && (
                <div className="px-4 pb-3 text-xs text-muted-foreground border-t border-border bg-muted/20">
                  {detailMessage}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone =
    status === 'complete'
      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
      : status === 'running'
        ? 'bg-primary/10 text-primary'
        : status === 'error'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted text-muted-foreground';

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium shrink-0', tone)}>
      {label}
    </span>
  );
}