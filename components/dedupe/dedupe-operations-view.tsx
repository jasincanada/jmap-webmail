'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useEmailStore } from '@/stores/email-store';
import { useDedupeConfigStore } from '@/stores/dedupe-config-store';
import { useDedupeHighlightStore } from '@/stores/dedupe-highlight-store';
import { useDedupeOperationsStore } from '@/stores/dedupe-operations-store';
import {
  dedupeScanNeedsConfirmation,
  hasEnabledCriteria,
} from '@/lib/dedupe-config';
import {
  DedupeAbortedError,
  getAccountScanMaxFolderCount,
  runFolderDedupe,
  runMailboxDedupe,
  scanFolderDuplicates,
  type DedupeGroup,
} from '@/lib/mail-dedupe';
import { getDedupeHighlightClasses, getDedupeStripeColor } from '@/lib/dedupe-highlight-styles';
import { cn, formatMailboxCount } from '@/lib/utils';
import { toast } from '@/stores/toast-store';

function PhaseBadge({ phase }: { phase: string }) {
  const t = useTranslations('dedupe.operations');
  if (phase === 'scanning' || phase === 'removing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium">
        <Loader2 className="w-4 h-4 animate-spin" />
        {phase === 'removing' ? t('status_removing') : t('status_scanning')}
      </span>
    );
  }
  if (phase === 'complete') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1 text-sm font-medium">
        <CheckCircle2 className="w-4 h-4" />
        {t('status_complete')}
      </span>
    );
  }
  if (phase === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive px-3 py-1 text-sm font-medium">
        <AlertCircle className="w-4 h-4" />
        {t('status_error')}
      </span>
    );
  }
  return null;
}

function GroupCard({ group, index }: { group: DedupeGroup; index: number }) {
  const t = useTranslations('dedupe.operations');
  const [open, setOpen] = useState(index < 3);

  const copyKey = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(group.key);
      toast.success(t('copy_done'));
    } catch {
      toast.error(t('copy_failed'));
    }
  };
  const keeperClasses = getDedupeHighlightClasses({
    colorIndex: index,
    isKeeper: true,
    groupKey: group.key,
  });
  const duplicateClasses = getDedupeHighlightClasses({
    colorIndex: index,
    isKeeper: false,
    groupKey: group.key,
  });

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className={cn('w-1.5 h-8 rounded-full shrink-0 border-l-4', getDedupeStripeColor(index))} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {group.key || t('group_unknown_key')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('group_summary', { total: group.emailIds.length, duplicates: group.duplicateIds.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={copyKey}
          className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
          title={t('copy_key')}
          aria-label={t('copy_key')}
        >
          <Copy className="w-4 h-4" />
        </button>
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          <div className={cn('px-4 py-2 text-sm', keeperClasses)}>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-2">
              {t('keeper')}
            </span>
            <span className="font-mono text-xs">{group.keeperId}</span>
          </div>
          {group.duplicateIds.map((emailId) => (
            <div key={emailId} className={cn('px-4 py-2 text-sm', duplicateClasses)}>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-2">
                {t('duplicate')}
              </span>
              <span className="font-mono text-xs">{emailId}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DedupeOperationsView() {
  const t = useTranslations('dedupe.operations');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client } = useAuthStore();
  const { mailboxes, selectMailbox, fetchEmails, fetchMailboxes } = useEmailStore();
  const config = useDedupeConfigStore((state) => state.config);
  const setScanResult = useDedupeHighlightStore((state) => state.setScanResult);
  const clearMailboxHighlight = useDedupeHighlightStore((state) => state.clearMailbox);
  const clearAllHighlights = useDedupeHighlightStore((state) => state.clearAll);
  const setScanningMailbox = useDedupeHighlightStore((state) => state.setScanning);
  const {
    phase,
    action,
    mailboxId,
    mailboxName,
    scope,
    progress,
    folderResult,
    accountResult,
    moved,
    error,
    startedAt,
    completedAt,
    begin,
    setProgress,
    completeFolder,
    completeAccount,
    fail,
    reset,
  } = useDedupeOperationsStore();

  const startedRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState<'scan' | 'remove' | null>(null);
  const [folderMessageCount, setFolderMessageCount] = useState<number | null>(null);

  const handleAbort = useCallback(() => {
    abortRef.current = null;
    setScanningMailbox(null);
    reset();
    startedRef.current = null;
    setAwaitingConfirm(null);
  }, [reset, setScanningMailbox]);

  const cancelOperation = useCallback(() => {
    abortRef.current?.abort();
    handleAbort();
  }, [handleAbort]);

  const folderParam = searchParams.get('folder');
  const actionParam = (searchParams.get('action') || 'scan') as 'scan' | 'remove';
  const scopeParam = searchParams.get('scope') === 'account' ? 'account' : 'folder';

  const resolvedMailbox = useMemo(() => {
    if (!folderParam) return null;
    return mailboxes.find((mailbox) => mailbox.id === folderParam) ?? null;
  }, [folderParam, mailboxes]);

  const runOperation = useCallback(async () => {
    if (!client) {
      fail(t('not_connected'));
      return;
    }
    if (!hasEnabledCriteria(config)) {
      fail(t('criteria_disabled'));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const isAccount = scopeParam === 'account';
    const operationAction = isAccount
      ? (actionParam === 'remove' ? 'account-remove' : 'account-scan')
      : (actionParam === 'remove' ? 'remove' : 'scan');

    if (!isAccount && !folderParam) {
      fail(t('missing_folder'));
      return;
    }

    begin({
      action: operationAction,
      scope: isAccount ? 'account' : 'folder',
      mailboxId: folderParam,
      mailboxName: resolvedMailbox?.name ?? null,
    });
    setScanningMailbox(isAccount ? null : folderParam);

    const abortIfCancelled = () => {
      if (signal.aborted) {
        handleAbort();
        return true;
      }
      return false;
    };

    try {
      if (isAccount) {
        const dryRun = actionParam !== 'remove';
        if (!dryRun) clearAllHighlights();
        const outcome = await runMailboxDedupe(client, dryRun, setProgress, config, signal);
        if (abortIfCancelled()) return;
        if (dryRun) {
          clearAllHighlights();
          for (const folder of outcome.folderResults) {
            setScanResult(folder);
          }
          if (outcome.folderResults.some((folder) => folder.createdDupesFolder)) {
            await fetchMailboxes(client);
          }
        } else if (outcome.moved > 0) {
          clearAllHighlights();
          await fetchMailboxes(client);
        }
        completeAccount(outcome, outcome.moved);
        toast.success(
          dryRun
            ? t('account_scan_done', { count: outcome.duplicateCount })
            : t('account_remove_done', { count: outcome.moved }),
        );
        return;
      }

      const mailbox = resolvedMailbox;
      if (!mailbox) {
        fail(t('missing_folder'));
        return;
      }

      if (actionParam === 'remove') {
        const outcome = await runFolderDedupe(client, mailbox.id, setProgress, config, signal);
        if (abortIfCancelled()) return;
        clearMailboxHighlight(mailbox.id);
        await Promise.all([
          fetchMailboxes(client),
          fetchEmails(client, mailbox.id),
        ]);
        if (abortIfCancelled()) return;
        selectMailbox(mailbox.id);
        const folderScan = outcome.folderResults[0] ?? {
          mailboxId: outcome.mailboxId,
          mailboxName: mailbox.name,
          scanned: outcome.scanned,
          duplicateCount: outcome.duplicateCount,
          groups: [],
          moves: outcome.moves,
        };
        completeFolder(folderScan, outcome.moved);
        toast.success(t('folder_remove_done', { count: outcome.moved, folder: mailbox.name }));
        return;
      }

      const result = await scanFolderDuplicates(
        client,
        mailbox.id,
        config,
        undefined,
        setProgress,
        false,
        signal,
      );
      if (abortIfCancelled()) return;
      setScanResult(result);
      selectMailbox(mailbox.id);
      if (result.createdDupesFolder) {
        await fetchMailboxes(client);
      }
      await fetchEmails(client, mailbox.id);
      if (abortIfCancelled()) return;
      completeFolder(result);
      if (result.duplicateCount > 0) {
        toast.success(t('folder_scan_done', { count: result.duplicateCount, folder: mailbox.name }));
      } else {
        toast.info(t('folder_scan_none', { folder: mailbox.name }));
      }
    } catch (err) {
      if (err instanceof DedupeAbortedError) {
        handleAbort();
        return;
      }
      const message = err instanceof Error ? err.message : t('failed');
      fail(message);
      toast.error(message);
    } finally {
      if (abortRef.current) {
        abortRef.current = null;
        setScanningMailbox(null);
      }
    }
  }, [
    actionParam,
    begin,
    clearAllHighlights,
    clearMailboxHighlight,
    client,
    completeAccount,
    completeFolder,
    config,
    fail,
    fetchEmails,
    fetchMailboxes,
    folderParam,
    handleAbort,
    resolvedMailbox,
    scopeParam,
    selectMailbox,
    setProgress,
    setScanResult,
    setScanningMailbox,
    t,
  ]);

  const requestScanConfirmation = useCallback(async (): Promise<boolean> => {
    if (!client) return true;

    if (scopeParam === 'folder' && folderParam && resolvedMailbox) {
      const mailboxRef = resolvedMailbox.originalId || resolvedMailbox.id;
      const accountId = resolvedMailbox.isShared ? resolvedMailbox.accountId : undefined;
      const total = await client.countMailboxEmails(mailboxRef, accountId);
      setFolderMessageCount(total);
      if (dedupeScanNeedsConfirmation(total)) {
        setAwaitingConfirm('scan');
        return false;
      }
      return true;
    }

    if (scopeParam === 'account') {
      const maxCount = await getAccountScanMaxFolderCount(client, mailboxes);
      setFolderMessageCount(maxCount);
      if (dedupeScanNeedsConfirmation(maxCount)) {
        setAwaitingConfirm('scan');
        return false;
      }
    }

    return true;
  }, [client, folderParam, mailboxes, resolvedMailbox, scopeParam]);

  useEffect(() => {
    if (!client) return;

    const signature = `${scopeParam}:${actionParam}:${folderParam ?? 'all'}`;
    if (startedRef.current === signature) return;

    const startRemoveFlow = () => {
      startedRef.current = signature;
      setAwaitingConfirm('remove');
    };

    const startScanFlow = async () => {
      startedRef.current = signature;
      const confirmed = await requestScanConfirmation();
      if (confirmed) {
        void runOperation();
      }
    };

    if (actionParam === 'remove') {
      startRemoveFlow();
      return;
    }

    void startScanFlow();
  }, [client, runOperation, requestScanConfirmation, scopeParam, actionParam, folderParam, resolvedMailbox]);

  useEffect(() => () => {
    const { phase } = useDedupeOperationsStore.getState();
    if (phase === 'scanning' || phase === 'removing') {
      abortRef.current?.abort();
      handleAbort();
    }
    startedRef.current = null;
  }, [handleAbort]);

  const elapsedMs =
    startedAt && (completedAt ?? Date.now()) - startedAt;

  const openInMailbox = async () => {
    if (!client || !mailboxId) return;
    selectMailbox(mailboxId);
    await fetchEmails(client, mailboxId);
    router.push('/');
  };

  const groups = folderResult?.groups ?? [];
  const accountFolders = accountResult?.folderResults ?? [];

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Copy className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <PhaseBadge phase={phase} />
      </div>

      {awaitingConfirm && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-4">
          <h2 className="text-lg font-medium text-foreground">
            {awaitingConfirm === 'scan'
              ? (scopeParam === 'account' ? t('confirm_scan_account_title') : t('confirm_scan_title'))
              : scopeParam === 'account'
                ? t('confirm_remove_account_title')
                : t('confirm_remove_folder_title', {
                    folder: mailboxName || resolvedMailbox?.name || folderParam || '—',
                  })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {awaitingConfirm === 'scan' && folderMessageCount != null
              ? (scopeParam === 'account'
                ? t('confirm_scan_account_body', { count: folderMessageCount })
                : t('confirm_scan_body', { count: folderMessageCount }))
              : scopeParam === 'account'
                ? t('confirm_remove_account_body')
                : t('confirm_remove_folder_body')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setAwaitingConfirm(null);
                void runOperation();
              }}
            >
              <Play className="w-4 h-4 mr-2" />
              {awaitingConfirm === 'scan' ? t('confirm_scan_start') : t('confirm_remove_start')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAwaitingConfirm(null);
                reset();
                startedRef.current = null;
                router.push(scopeParam === 'account' ? '/dedupe?scope=account&action=scan' : '/');
              }}
            >
              {t('confirm_cancel')}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('operation')}</p>
            <p className="text-sm font-medium text-foreground">
              {action === 'account-remove'
                ? t('action_account_remove')
                : action === 'account-scan'
                  ? t('action_account_scan')
                  : action === 'remove'
                    ? t('action_folder_remove')
                    : t('action_folder_scan')}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('target')}</p>
            <p className="text-sm font-medium text-foreground">
              {scope === 'account'
                ? t('target_account')
                : mailboxName || resolvedMailbox?.name || mailboxId || '—'}
            </p>
          </div>
        </div>

        {(phase === 'scanning' || phase === 'removing') && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm text-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <span className="flex-1 min-w-0">{progress || t('working')}</span>
            <Button variant="outline" size="sm" onClick={cancelOperation}>
              {t('cancel_operation')}
            </Button>
          </div>
        )}

        {phase === 'error' && error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {elapsedMs != null && phase !== 'idle' && (
          <p className="text-xs text-muted-foreground">
            {t('elapsed', { seconds: Math.max(1, Math.round(elapsedMs / 1000)) })}
          </p>
        )}
      </div>

      {phase === 'complete' && folderResult && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('stat_scanned')}</p>
            <p className="text-2xl font-semibold tabular-nums">{formatMailboxCount(folderResult.scanned)}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('stat_duplicates')}</p>
            <p className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
              {formatMailboxCount(folderResult.duplicateCount)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('stat_groups')}</p>
            <p className="text-2xl font-semibold tabular-nums">{formatMailboxCount(groups.length)}</p>
          </div>
        </div>
      )}

      {phase === 'complete' && accountResult && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('stat_scanned')}</p>
            <p className="text-2xl font-semibold tabular-nums">{formatMailboxCount(accountResult.scanned)}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('stat_duplicates')}</p>
            <p className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
              {formatMailboxCount(accountResult.duplicateCount)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('stat_moved')}</p>
            <p className="text-2xl font-semibold tabular-nums">{formatMailboxCount(moved)}</p>
          </div>
        </div>
      )}

      {phase === 'complete' && groups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">{t('groups_title')}</h2>
          <p className="text-sm text-muted-foreground">{t('groups_hint')}</p>
          <div className="space-y-2">
            {groups.map((group, index) => (
              <GroupCard key={`${group.key}-${index}`} group={group} index={index} />
            ))}
          </div>
        </div>
      )}

      {phase === 'complete' && accountFolders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">{t('folders_title')}</h2>
          <div className="rounded-lg border border-border divide-y divide-border">
            {accountFolders.map((folder) => (
              <div key={folder.mailboxId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{folder.mailboxName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('folder_row', {
                      scanned: folder.scanned,
                      duplicates: folder.duplicateCount,
                      groups: folder.groups.length,
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dedupe?folder=${encodeURIComponent(folder.mailboxId)}&action=scan`)}
                >
                  {t('open_folder_scan')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'complete' && folderResult && folderResult.duplicateCount === 0 && (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t('no_duplicates')}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back_to_mail')}
        </Button>

        {scope === 'folder' && mailboxId && phase === 'complete' && (
          <Button variant="outline" onClick={() => void openInMailbox()}>
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('view_in_mailbox')}
          </Button>
        )}

        {phase === 'complete' || phase === 'error' ? (
          <Button
            variant="outline"
            onClick={() => {
              reset();
              startedRef.current = null;
              setAwaitingConfirm(null);
              if (actionParam === 'remove') {
                setAwaitingConfirm('remove');
              } else {
                void (async () => {
                  const confirmed = await requestScanConfirmation();
                  if (confirmed) {
                    void runOperation();
                  }
                })();
              }
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('run_again')}
          </Button>
        ) : null}

        {scope === 'folder' && folderParam && actionParam === 'scan' && phase === 'complete' && (folderResult?.duplicateCount ?? 0) > 0 && (
          <Button onClick={() => router.push(`/dedupe?folder=${encodeURIComponent(folderParam)}&action=remove`)}>
            <Play className="w-4 h-4 mr-2" />
            {t('remove_duplicates')}
          </Button>
        )}

        {scope === 'account' && actionParam === 'scan' && phase === 'complete' && (accountResult?.duplicateCount ?? 0) > 0 && (
          <Button onClick={() => router.push('/dedupe?scope=account&action=remove')}>
            <Play className="w-4 h-4 mr-2" />
            {t('remove_all_duplicates')}
          </Button>
        )}
      </div>
    </div>
  );
}