import type {
  DedupeActionDefinition,
  DedupeActionExecutor,
  DedupeApplyOptions,
  DedupeApplyPreview,
} from '@/lib/dedupe-actions/types';
import type { DedupeScanResult } from '@/lib/mail-dedupe';

export const reviewOnlyDefinition: DedupeActionDefinition = {
  id: 'review_only',
  labelKey: 'dedupe.actions.reviewOnly',
  tier: 0,
  requiresDestination: false,
  destructive: false,
  usesRetentionFolder: false,
  enabled: () => true,
};

function buildPreview(scan: DedupeScanResult): DedupeApplyPreview {
  return {
    actionId: 'review_only',
    affectedCount: 0,
    duplicateCount: scan.duplicateCount,
    jmapWrites: false,
    summary:
      scan.duplicateCount === 0
        ? 'No duplicates to review.'
        : `Review ${scan.duplicateCount.toLocaleString()} duplicate(s) without changing mailboxes.`,
  };
}

export const reviewOnlyExecutor: DedupeActionExecutor = {
  id: 'review_only',

  preview(scan: DedupeScanResult, _opts: DedupeApplyOptions): DedupeApplyPreview {
    return buildPreview(scan);
  },

  async execute(_client, scan, _opts, _signal, _audit) {
    return {
      actionId: 'review_only',
      affectedCount: 0,
      duplicateCount: scan.duplicateCount,
      moved: 0,
    };
  },
};