import { useDedupeHighlightStore } from '@/stores/dedupe-highlight-store';
import { useEmailStore } from '@/stores/email-store';
import type { DedupeEmailHighlight } from '@/lib/dedupe-highlight-styles';

export function useDedupeEmailHighlight(emailId: string): DedupeEmailHighlight | null {
  const selectedMailbox = useEmailStore((state) => state.selectedMailbox);
  return useDedupeHighlightStore(
    (state) => (selectedMailbox ? state.byMailbox[selectedMailbox]?.emailMap[emailId] : null) ?? null,
  );
}

export function useActiveMailboxDedupeHighlight() {
  const selectedMailbox = useEmailStore((state) => state.selectedMailbox);
  return useDedupeHighlightStore(
    (state) => (selectedMailbox ? state.byMailbox[selectedMailbox] : null) ?? null,
  );
}

export function useThreadDedupeHighlight(emailIds: string[]): DedupeEmailHighlight | null {
  const selectedMailbox = useEmailStore((state) => state.selectedMailbox);
  return useDedupeHighlightStore((state) => {
    if (!selectedMailbox) return null;
    const emailMap = state.byMailbox[selectedMailbox]?.emailMap;
    if (!emailMap) return null;

    let keeperMatch: DedupeEmailHighlight | null = null;
    for (const emailId of emailIds) {
      const highlight = emailMap[emailId];
      if (!highlight) continue;
      if (!highlight.isKeeper) {
        return highlight;
      }
      keeperMatch ??= highlight;
    }
    return keeperMatch;
  });
}