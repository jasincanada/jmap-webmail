import { create } from 'zustand';
import type { DedupeScanResult, FolderDedupeScanResult } from '@/lib/mail-dedupe';

export type DedupeOperationPhase = 'idle' | 'scanning' | 'removing' | 'complete' | 'error';
export type DedupeOperationAction = 'scan' | 'remove' | 'account-scan' | 'account-remove';

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

  begin: (params: {
    action: DedupeOperationAction;
    scope: 'folder' | 'account';
    mailboxId?: string | null;
    mailboxName?: string | null;
  }) => void;
  setProgress: (message: string) => void;
  completeFolder: (result: FolderDedupeScanResult, moved?: number) => void;
  completeAccount: (result: DedupeScanResult, moved?: number) => void;
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
};

export const useDedupeOperationsStore = create<DedupeOperationsStore>((set) => ({
  ...initialState,

  begin: ({ action, scope, mailboxId = null, mailboxName = null }) => {
    set({
      ...initialState,
      phase: action === 'remove' || action === 'account-remove' ? 'removing' : 'scanning',
      action,
      scope,
      mailboxId,
      mailboxName,
      startedAt: Date.now(),
    });
  },

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