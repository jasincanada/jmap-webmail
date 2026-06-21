import { create } from 'zustand';
import type { DedupeApplyResult } from '@/lib/dedupe-actions/types';
import type { DedupeActionId } from '@/lib/dedupe-actions/types';
import type { DedupeScanResult, FolderDedupeScanResult } from '@/lib/mail-dedupe';

export type DedupeOperationPhase = 'idle' | 'scanning' | 'applying' | 'complete' | 'error';
export type DedupeOperationAction = 'scan' | 'account-scan';

interface DedupeOperationsStore {
  phase: DedupeOperationPhase;
  action: DedupeOperationAction | null;
  mailboxId: string | null;
  mailboxName: string | null;
  scope: 'folder' | 'account';
  progress: string | null;
  folderResult: FolderDedupeScanResult | null;
  accountResult: DedupeScanResult | null;
  moved: number;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  runId: string | null;
  pendingAction: DedupeActionId | null;
  applyResult: DedupeApplyResult | null;

  begin: (params: {
    action: DedupeOperationAction;
    scope: 'folder' | 'account';
    mailboxId?: string | null;
    mailboxName?: string | null;
  }) => void;
  beginApply: (actionId: DedupeActionId) => void;
  setRunId: (runId: string | null) => void;
  setProgress: (message: string) => void;
  completeFolder: (result: FolderDedupeScanResult, moved?: number) => void;
  completeAccount: (result: DedupeScanResult, moved?: number) => void;
  completeApply: (result: DedupeApplyResult) => void;
  fail: (message: string) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as DedupeOperationPhase,
  action: null,
  mailboxId: null,
  mailboxName: null,
  scope: 'folder' as const,
  progress: null,
  folderResult: null,
  accountResult: null,
  moved: 0,
  error: null,
  startedAt: null,
  completedAt: null,
  runId: null,
  pendingAction: null,
  applyResult: null,
};

export const useDedupeOperationsStore = create<DedupeOperationsStore>((set) => ({
  ...initialState,

  begin: ({ action, scope, mailboxId = null, mailboxName = null }) => {
    set({
      ...initialState,
      phase: 'scanning',
      action,
      scope,
      mailboxId,
      mailboxName,
      startedAt: Date.now(),
    });
  },

  beginApply: (actionId) => {
    set({
      phase: 'applying',
      pendingAction: actionId,
      progress: null,
      error: null,
      applyResult: null,
    });
  },

  setRunId: (runId) => set({ runId }),

  setProgress: (message) => set({ progress: message }),

  completeFolder: (result, moved = 0) => {
    set({
      phase: 'complete',
      folderResult: result,
      accountResult: null,
      moved,
      progress: null,
      completedAt: Date.now(),
      mailboxName: result.mailboxName || null,
      mailboxId: result.mailboxId,
    });
  },

  completeAccount: (result, moved = 0) => {
    set({
      phase: 'complete',
      folderResult: null,
      accountResult: result,
      moved,
      progress: null,
      completedAt: Date.now(),
    });
  },

  completeApply: (result) => {
    set({
      phase: 'complete',
      moved: result.moved,
      applyResult: result,
      progress: null,
      completedAt: Date.now(),
    });
  },

  fail: (message) => {
    set({
      phase: 'error',
      error: message,
      progress: null,
      completedAt: Date.now(),
    });
  },

  reset: () => set(initialState),
}));