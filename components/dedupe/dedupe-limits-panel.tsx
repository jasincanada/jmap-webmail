'use client';

import { useTranslations } from 'next-intl';
import { Gauge } from 'lucide-react';
import type { DedupeBrowserLimits } from '@/lib/dedupe-config';
import { formatMailboxCount } from '@/lib/utils';

interface DedupeLimitsPanelProps {
  limits: DedupeBrowserLimits;
  className?: string;
}

export function DedupeLimitsPanel({ limits, className }: DedupeLimitsPanelProps) {
  const t = useTranslations('dedupe.limits');

  const rows = [
    { label: t('server_batch'), value: formatMailboxCount(limits.maxObjectsInGet) },
    { label: t('confirm_threshold'), value: formatMailboxCount(limits.confirmThreshold) },
    { label: t('body_max'), value: formatMailboxCount(limits.bodyMaxFolderMessages) },
    { label: t('browser_max'), value: formatMailboxCount(limits.browserHardMax) },
  ];

  return (
    <div className={`rounded-lg border border-border bg-card p-4 space-y-3 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">{t('title')}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{t('description')}</p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-2 text-sm">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium tabular-nums text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}