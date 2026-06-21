'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ExternalLink, Play, RotateCcw, Search } from 'lucide-react';
import { SettingsSection, SettingItem, ToggleSwitch, RadioGroup } from './settings-section';
import { Button } from '@/components/ui/button';
import { useDedupeConfigStore } from '@/stores/dedupe-config-store';
import { hasEnabledCriteria, type DedupeCriteriaKey } from '@/lib/dedupe-config';

const CRITERIA_KEYS: DedupeCriteriaKey[] = [
  'messageId',
  'subject',
  'from',
  'to',
  'receivedAt',
  'sentAt',
  'size',
  'hasAttachment',
  'body',
  'threadId',
];

export function DedupeSettings() {
  const t = useTranslations('settings.dedupe');
  const router = useRouter();
  const { config, setMode, setCriterion, resetConfig } = useDedupeConfigStore();

  const criteriaEnabled = hasEnabledCriteria(config);

  return (
    <div className="space-y-6">
      <SettingsSection title={t('criteria_title')} description={t('criteria_description')}>
        <SettingItem label={t('match_mode_label')} description={t('match_mode_description')}>
          <RadioGroup
            value={config.mode}
            onChange={(value) => setMode(value as typeof config.mode)}
            options={[
              { value: 'messageIdFirst', label: t('match_mode_messageIdFirst') },
              { value: 'allEnabled', label: t('match_mode_allEnabled') },
            ]}
          />
        </SettingItem>

        {CRITERIA_KEYS.map((key) => (
          <SettingItem
            key={key}
            label={t(`criteria.${key}.label`)}
            description={t(`criteria.${key}.description`)}
          >
            <ToggleSwitch
              checked={config[key]}
              onChange={(enabled) => setCriterion(key, enabled)}
            />
          </SettingItem>
        ))}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={resetConfig}>
            <RotateCcw className="w-4 h-4 mr-1" />
            {t('reset_criteria')}
          </Button>
        </div>

        {!criteriaEnabled && (
          <p className="text-sm text-destructive">{t('criteria_none_enabled')}</p>
        )}
      </SettingsSection>

      <SettingsSection title={t('title')} description={t('description')}>
        <p className="text-sm text-muted-foreground">{t('how_it_works')}</p>
        <p className="text-sm text-muted-foreground pt-2">{t('operations_hint')}</p>
        <div className="flex flex-wrap items-center gap-3 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!criteriaEnabled}
            onClick={() => router.push('/dedupe?scope=account&action=scan')}
          >
            <Search className="w-4 h-4 mr-1" />
            {t('scan')}
          </Button>
          <Button
            size="sm"
            disabled={!criteriaEnabled}
            onClick={() => router.push('/dedupe?scope=account&action=remove')}
          >
            <Play className="w-4 h-4 mr-1" />
            {t('run')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dedupe')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            {t('open_operations')}
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}