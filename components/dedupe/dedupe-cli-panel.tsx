'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/stores/toast-store';

const CLI_HELP =
  'docker compose --profile tools run --rm mail-dedupe --help';

const CLI_DRY_RUN =
  'docker compose --profile tools run --rm mail-dedupe --dry-run';

interface DedupeCliPanelProps {
  variant?: 'default' | 'prominent';
  className?: string;
}

export function DedupeCliPanel({ variant = 'default', className }: DedupeCliPanelProps) {
  const t = useTranslations('dedupe.cli');

  const copyCommand = useCallback(async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      toast.success(t('copy_done'));
    } catch {
      toast.error(t('copy_failed'));
    }
  }, [t]);

  const borderClass =
    variant === 'prominent'
      ? 'border-amber-500/40 bg-amber-500/5'
      : 'border-border bg-muted/30';

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${borderClass} ${className ?? ''}`}>
      <div className="flex items-start gap-3">
        <Terminal className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
          <p className="text-xs text-muted-foreground">{t('compose_hint')}</p>
        </div>
      </div>

      <div className="space-y-2">
        <CliCommandRow
          label={t('command_help')}
          command={CLI_HELP}
          onCopy={() => void copyCommand(CLI_HELP)}
          copyLabel={t('copy')}
        />
        <CliCommandRow
          label={t('command_dry_run')}
          command={CLI_DRY_RUN}
          onCopy={() => void copyCommand(CLI_DRY_RUN)}
          copyLabel={t('copy')}
        />
      </div>
    </div>
  );
}

function CliCommandRow({
  label,
  command,
  onCopy,
  copyLabel,
}: {
  label: string;
  command: string;
  onCopy: () => void;
  copyLabel: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border bg-secondary/50">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onCopy}>
          <Copy className="w-3.5 h-3.5 mr-1" />
          {copyLabel}
        </Button>
      </div>
      <pre className="px-3 py-2 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
        {command}
      </pre>
    </div>
  );
}