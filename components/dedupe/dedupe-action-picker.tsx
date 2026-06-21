'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { RadioGroup, Select } from '@/components/settings/settings-section';
import { listEnabledActions } from '@/lib/dedupe-actions/registry';
import type { DedupeActionId, DedupeKeeperPolicy } from '@/lib/dedupe-actions/types';
import { DEDUPE_DELETED_RETENTION_DAYS } from '@/lib/mail-dedupe';
import type { Mailbox } from '@/lib/jmap/types';

interface DedupeActionPickerProps {
  mailboxes: Mailbox[];
  selectedAction: DedupeActionId;
  onActionChange: (actionId: DedupeActionId) => void;
  destinationMailboxId: string | null;
  onDestinationChange: (mailboxId: string | null) => void;
  keeperPolicy: DedupeKeeperPolicy;
  onKeeperPolicyChange: (policy: DedupeKeeperPolicy) => void;
}

export function DedupeActionPicker({
  mailboxes,
  selectedAction,
  onActionChange,
  destinationMailboxId,
  onDestinationChange,
  keeperPolicy,
  onKeeperPolicyChange,
}: DedupeActionPickerProps) {
  const t = useTranslations('dedupe.actions');

  const actionContext = useMemo(
    () => ({ mailboxes, allowDestructiveActions: false }),
    [mailboxes],
  );

  const enabledActions = useMemo(
    () => listEnabledActions(actionContext),
    [actionContext],
  );

  const selectedDefinition = enabledActions.find((def) => def.id === selectedAction)
    ?? enabledActions[0];

  const folderOptions = useMemo(
    () =>
      mailboxes
        .filter((mb) => !mb.role && mb.name !== 'dupes' && mb.name !== 'deleted')
        .map((mb) => ({ value: mb.id, label: mb.name })),
    [mailboxes],
  );

  if (!selectedDefinition) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-lg font-medium text-foreground">{t('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('action_label')}</p>
        <div className="space-y-2">
          {enabledActions.map((definition) => (
            <label
              key={definition.id}
              className="flex items-start gap-3 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/50"
            >
              <input
                type="radio"
                name="dedupe-action"
                checked={selectedAction === definition.id}
                onChange={() => onActionChange(definition.id)}
                className="mt-1"
              />
              <span className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">
                  {t(`items.${definition.id}.label`)}
                </span>
                <span className="text-xs text-muted-foreground block">
                  {t(`items.${definition.id}.description`)}
                </span>
                {definition.id === 'delete_with_retention' && selectedAction === definition.id && (
                  <span className="text-xs text-amber-700 dark:text-amber-400 block mt-1">
                    {t('retention_notice', { days: DEDUPE_DELETED_RETENTION_DAYS })}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      {selectedDefinition.requiresDestination && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('destination_label')}</p>
          <Select
            value={destinationMailboxId ?? ''}
            onChange={(value) => onDestinationChange(value || null)}
            options={[
              { value: '', label: t('destination_placeholder') },
              ...folderOptions,
            ]}
          />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('keeper_label')}</p>
        <RadioGroup
          value={keeperPolicy}
          onChange={(value) => onKeeperPolicyChange(value as DedupeKeeperPolicy)}
          options={[
            { value: 'oldest', label: t('keeper_oldest') },
            { value: 'newest', label: t('keeper_newest') },
          ]}
        />
      </div>
    </div>
  );
}