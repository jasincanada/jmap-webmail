import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_DEDUPE_MATCH_CONFIG,
  type DedupeCriteriaKey,
  type DedupeMatchConfig,
  type DedupeMatchMode,
} from '@/lib/dedupe-config';

function sanitizeConfig(raw: Partial<DedupeMatchConfig> | undefined): DedupeMatchConfig {
  const merged = { ...DEFAULT_DEDUPE_MATCH_CONFIG, ...raw };
  if (merged.mode !== 'messageIdFirst' && merged.mode !== 'allEnabled') {
    merged.mode = DEFAULT_DEDUPE_MATCH_CONFIG.mode;
  }
  return {
    mode: merged.mode,
    messageId: Boolean(merged.messageId),
    subject: Boolean(merged.subject),
    from: Boolean(merged.from),
    to: Boolean(merged.to),
    receivedAt: Boolean(merged.receivedAt),
    sentAt: Boolean(merged.sentAt),
    size: Boolean(merged.size),
    hasAttachment: Boolean(merged.hasAttachment),
    body: Boolean(merged.body),
    threadId: Boolean(merged.threadId),
  };
}

interface DedupeConfigStore {
  config: DedupeMatchConfig;
  setMode: (mode: DedupeMatchMode) => void;
  setCriterion: (key: DedupeCriteriaKey, enabled: boolean) => void;
  resetConfig: () => void;
}

export const useDedupeConfigStore = create<DedupeConfigStore>()(
  persist(
    (set) => ({
      config: DEFAULT_DEDUPE_MATCH_CONFIG,

      setMode: (mode) => {
        set((state) => ({
          config: { ...state.config, mode },
        }));
      },

      setCriterion: (key, enabled) => {
        set((state) => ({
          config: { ...state.config, [key]: enabled },
        }));
      },

      resetConfig: () => {
        set({ config: DEFAULT_DEDUPE_MATCH_CONFIG });
      },
    }),
    {
      name: 'dedupe-config-storage',
      version: 1,
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<DedupeConfigStore>),
        config: sanitizeConfig((persisted as Partial<DedupeConfigStore> | undefined)?.config),
      }),
    },
  ),
);