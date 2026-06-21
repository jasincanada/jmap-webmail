'use client';

import { useTranslations } from 'next-intl';
import { Copy, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDedupeHighlightStore } from '@/stores/dedupe-highlight-store';
import { useDedupeOperationsStore } from '@/stores/dedupe-operations-store';
import { useActiveMailboxDedupeHighlight } from '@/hooks/use-dedupe-highlight';
import { useEmailStore } from '@/stores/email-store';

export function DedupeHighlightBanner() {
  const t = useTranslations('sidebar.dedupe');
  const highlight = useActiveMailboxDedupeHighlight();
  const selectedMailbox = useEmailStore((state) => state.selectedMailbox);
  const hasMoreEmails = useEmailStore((state) => state.hasMoreEmails);
  const scanningMailboxId = useDedupeHighlightStore((state) => state.scanningMailboxId);
  const clearMailbox = useDedupeHighlightStore((state) => state.clearMailbox);
  const accountDedupeActive = useDedupeOperationsStore(
    (state) =>
      state.scope === 'account' &&
      (state.phase === 'scanning' || state.phase === 'applying'),
  );
  const accountDedupeProgress = useDedupeOperationsStore((state) => state.progress);

  if (accountDedupeActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm border-b border-border bg-muted/40">
        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />
        <p className="flex-1 text-foreground truncate">
          {accountDedupeProgress || t('scanning')}
        </p>
      </div>
    );
  }

  if (selectedMailbox && scanningMailboxId === selectedMailbox) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm border-b border-border bg-muted/40">
        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />
        <p className="flex-1 text-foreground">{t('scanning')}</p>
      </div>
    );
  }

  if (!highlight || !selectedMailbox || highlight.duplicateCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm border-b border-border bg-primary/5">
      <Copy className="w-4 h-4 shrink-0 text-primary" />
      <p className="flex-1 text-foreground">
        {t('highlight_banner', {
          duplicates: highlight.duplicateCount,
          groups: highlight.groupCount,
        })}
      </p>
      <span className="hidden sm:inline text-xs text-muted-foreground">
        {t('highlight_legend')}
        {hasMoreEmails ? ` ${t('highlight_load_more')}` : ''}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={() => clearMailbox(selectedMailbox)}
      >
        <X className="w-3.5 h-3.5 mr-1" />
        {t('clear_highlights')}
      </Button>
    </div>
  );
}