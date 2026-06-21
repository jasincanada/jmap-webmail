import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DedupeActionId, DedupeKeeperPolicy } from '@/lib/dedupe-actions/types';

interface DedupeActionStore {
  lastChosenAction: DedupeActionId;
  defaultDestinationMailboxId: string | null;
  keeperPolicy: DedupeKeeperPolicy;
  allowDestructiveActions: boolean;
  setLastChosenAction: (actionId: DedupeActionId) => void;
  setDefaultDestinationMailboxId: (mailboxId: string | null) => void;
  setKeeperPolicy: (policy: DedupeKeeperPolicy) => void;
  setAllowDestructiveActions: (allowed: boolean) => void;
  resetPreferences: () => void;
}

const DEFAULT_STATE = {
  lastChosenAction: 'review_only' as DedupeActionId,
  defaultDestinationMailboxId: null as string | null,
  keeperPolicy: 'oldest' as DedupeKeeperPolicy,
  allowDestructiveActions: false,
};

function sanitizeKeeperPolicy(raw: unknown): DedupeKeeperPolicy {
  return raw === 'newest' ? 'newest' : 'oldest';
}

function sanitizeActionId(raw: unknown): DedupeActionId {
  const allowed: DedupeActionId[] = [
    'review_only',
    'move_to_folder',
    'move_to_dupes',
    'move_to_trash',
    'move_to_archive',
    'delete_with_retention',
  ];
  return allowed.includes(raw as DedupeActionId) ? (raw as DedupeActionId) : 'review_only';
}

export const useDedupeActionStore = create<DedupeActionStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setLastChosenAction: (actionId) => {
        set({ lastChosenAction: actionId });
      },

      setDefaultDestinationMailboxId: (mailboxId) => {
        set({ defaultDestinationMailboxId: mailboxId });
      },

      setKeeperPolicy: (policy) => {
        set({ keeperPolicy: policy });
      },

      setAllowDestructiveActions: (allowed) => {
        set({ allowDestructiveActions: allowed });
      },

      resetPreferences: () => {
        set(DEFAULT_STATE);
      },
    }),
    {
      name: 'dedupe-action-storage',
      version: 1,
      merge: (persisted, current) => {
        const saved = persisted as Partial<DedupeActionStore> | undefined;
        return {
          ...current,
          ...saved,
          lastChosenAction: sanitizeActionId(saved?.lastChosenAction),
          keeperPolicy: sanitizeKeeperPolicy(saved?.keeperPolicy),
          allowDestructiveActions: Boolean(saved?.allowDestructiveActions),
          defaultDestinationMailboxId:
            typeof saved?.defaultDestinationMailboxId === 'string'
              ? saved.defaultDestinationMailboxId
              : null,
        };
      },
    },
  ),
);