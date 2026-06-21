import { create } from 'zustand';
import type { DedupeEmailHighlight } from '@/lib/dedupe-highlight-styles';
import type { FolderDedupeScanResult } from '@/lib/mail-dedupe';

interface MailboxDedupeHighlight {
  mailboxId: string;
  scannedAt: number;
  duplicateCount: number;
  groupCount: number;
  emailMap: Record<string, DedupeEmailHighlight>;
}

interface DedupeHighlightStore {
  byMailbox: Record<string, MailboxDedupeHighlight>;
  scanningMailboxId: string | null;

  setScanResult: (result: FolderDedupeScanResult) => void;
  clearMailbox: (mailboxId: string) => void;
  clearAll: () => void;
  setScanning: (mailboxId: string | null) => void;
  getEmailHighlight: (mailboxId: string | undefined, emailId: string) => DedupeEmailHighlight | null;
  getMailboxHighlight: (mailboxId: string) => MailboxDedupeHighlight | null;
}

export const useDedupeHighlightStore = create<DedupeHighlightStore>((set, get) => ({
  byMailbox: {},
  scanningMailboxId: null,

  setScanResult: (result) => {
    const emailMap: Record<string, DedupeEmailHighlight> = {};

    result.groups.forEach((group, colorIndex) => {
      for (const emailId of group.emailIds) {
        emailMap[emailId] = {
          colorIndex,
          isKeeper: emailId === group.keeperId,
          groupKey: group.key,
        };
      }
    });

    set((state) => ({
      byMailbox: {
        ...state.byMailbox,
        [result.mailboxId]: {
          mailboxId: result.mailboxId,
          scannedAt: Date.now(),
          duplicateCount: result.duplicateCount,
          groupCount: result.groups.length,
          emailMap,
        },
      },
    }));
  },

  clearMailbox: (mailboxId) => {
    set((state) => {
      const next = { ...state.byMailbox };
      delete next[mailboxId];
      return { byMailbox: next };
    });
  },

  clearAll: () => set({ byMailbox: {} }),

  setScanning: (mailboxId) => set({ scanningMailboxId: mailboxId }),

  getEmailHighlight: (mailboxId, emailId) => {
    if (!mailboxId) return null;
    return get().byMailbox[mailboxId]?.emailMap[emailId] ?? null;
  },

  getMailboxHighlight: (mailboxId) => get().byMailbox[mailboxId] ?? null,
}));