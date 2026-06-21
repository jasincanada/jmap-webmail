import type { JMAPClient } from '@/lib/jmap/client';
import type { Mailbox } from '@/lib/jmap/types';
import type { DedupeScanResult } from '@/lib/mail-dedupe';

export type DedupeActionId =
  | 'review_only'
  | 'move_to_folder'
  | 'move_to_dupes'
  | 'move_to_trash'
  | 'move_to_archive'
  | 'delete_with_retention';

export type DedupeKeeperPolicy = 'oldest' | 'newest';

export interface DedupeAuditChange {
  emailId: string;
  groupKey?: string;
  fromMailboxId: string;
  toMailboxId?: string | null;
  actionId: DedupeActionId;
  keeper: boolean;
  purgeAfter?: number;
}

export interface DedupeAuditWriter {
  recordChange(change: DedupeAuditChange): void;
}

export interface DedupeActionContext {
  mailboxes: Mailbox[];
  allowDestructiveActions?: boolean;
}

export interface DedupeActionDefinition {
  id: DedupeActionId;
  labelKey: string;
  tier: 0 | 1 | 2 | 3;
  requiresDestination: boolean;
  destructive: boolean;
  usesRetentionFolder: boolean;
  enabled: (ctx: DedupeActionContext) => boolean;
}

export interface DedupeApplyOptions {
  destinationMailboxId?: string;
  keeperPolicy?: DedupeKeeperPolicy;
  dryRun?: boolean;
  onProgress?: (message: string) => void;
}

export interface DedupeApplyPreview {
  actionId: DedupeActionId;
  affectedCount: number;
  duplicateCount: number;
  jmapWrites: boolean;
  summary: string;
  destinationMailboxId?: string;
  retentionDays?: number;
}

export interface DedupeApplyResult {
  actionId: DedupeActionId;
  affectedCount: number;
  duplicateCount: number;
  moved: number;
  dryRun?: boolean;
}

export interface DedupeActionExecutor {
  id: DedupeActionId;
  preview: (scan: DedupeScanResult, opts: DedupeApplyOptions) => DedupeApplyPreview;
  execute: (
    client: JMAPClient,
    scan: DedupeScanResult,
    opts: DedupeApplyOptions,
    signal: AbortSignal | undefined,
    audit: DedupeAuditWriter,
  ) => Promise<DedupeApplyResult>;
}