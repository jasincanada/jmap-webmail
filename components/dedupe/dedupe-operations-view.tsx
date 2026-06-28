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
import { DedupeActionPicker } from '@/components/dedupe/dedupe-action-picker';
import { DedupeCliPanel } from '@/components/dedupe/dedupe-cli-panel';
import { DedupeLimitsPanel } from '@/components/dedupe/dedupe-limits-panel';
import { DedupeRecentRuns } from '@/components/dedupe/dedupe-recent-runs';
import { useAuthStore } from '@/stores/auth-store';
import { useEmailStore } from '@/stores/email-store';
import { useDedupeActionStore } from '@/stores/dedupe-action-store';
import { useDedupeConfigStore } from '@/stores/dedupe-config-store';
import { useDedupeHighlightStore } from '@/stores/dedupe-highlight-store';
import { useDedupeOperationsStore } from '@/stores/dedupe-operations-store';
import { createBrowserAuditWriter } from '@/lib/dedupe-audit/browser-writer';
import { dedupeAuditClient } from '@/lib/dedupe-audit/client';
import {
  DedupeScanError,
  dedupeScanNeedsConfirmation,
  formatDedupeScanErrorMessage,
  hasEnabledCriteria,
} from '@/lib/dedupe-config';
import { isLegacyRemoveAction, redirectRemoveToScanParams } from '@/lib/dedupe-url-utils';
import { getExecutor } from '@/lib/dedupe-actions/registry';
import type { DedupeActionId } from '@/lib/dedupe-actions/types';
import {
  DedupeAbortedError,
  applyDuplicateAction,
  getAccountScanMaxFolderCount,
  getDedupeLimits,
  rebuildScanWithKeeperPolicy,
  scanFolderDuplicates,
  scanMailboxDuplicates,
  type DedupeGroup,
  type DedupeScanResult,
  type FolderDedupeScanResult,
} from '@/lib/mail-dedupe';
import { getDedupeHighlightClasses, getDedupeStripeColor } from '@/lib/dedupe-highlight-styles';
import { cn, formatMailboxCount } from '@/lib/utils';
import { toast } from '@/stores/toast-store';

function folderToScanResult(folder: FolderDedupeScanResult): DedupeScanResult {
  return {
    scanned: folder.scanned,
    duplicateCount: folder.duplicateCount,
    moves: folder.moves,
    folderResults: folder.duplicateCount > 0 ? [folder] : [],
  };
}

function PhaseBadge({ phase }: { phase: string }) {
  const t = useTranslations('dedupe.operations');
  if (phase === 'scanning' || phase === 'applying') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium">
        <Loader2 className="w-4 h-4 animate-spin" />
        {phase === 'applying' ? t('status_applying') : t('status_scanning')}
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
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setOpen((value) => !value);
            }
          }}
          className="flex flex-1 items-center gap-3 min-w-0 text-left cursor-pointer"
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
      </div>
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
  const tActions = useTranslations('dedupe.actions');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client } = useAuthStore();
  const { mailboxes, selectMailbox, fetchEmails, fetchMailboxes } = useEmailStore();
  const config = useDedupeConfigStore((state) => state.config);
  const {
    lastChosenAction,
    defaultDestinationMailboxId,
    keeperPolicy,
    setLastChosenAction,
    setDefaultDestinationMailboxId,
    setKeeperPolicy,
  } = useDedupeActionStore();
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
    runId,
    applyResult,
    begin,
    beginApply,
    setRunId,
    setProgress,
    completeFolder,
    completeAccount,
    completeApply,
    fail,
    reset,
  } = useDedupeOperationsStore();

  const startedRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState<'scan' | 'apply' | null>(null);
  const [folderMessageCount, setFolderMessageCount] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<DedupeActionId>(lastChosenAction);
  const [destinationMailboxId, setDestinationMailboxId] = useState<string | null>(
    defaultDestinationMailboxId,
  );
  const [runsRefreshKey, setRunsRefreshKey] = useState(0);
  const [suggestCli, setSuggestCli] = useState(false);

  const serverLimits = useMemo(
    () => (client ? getDedupeLimits(client) : null),
    [client],
  );

  const folderParam = searchParams.get('folder');
  const rawActionParam = searchParams.get('action') || 'scan';
  const scopeParam = searchParams.get('scope') === 'account' ? 'account' : 'folder';


  useEffect(() => {
    if (isLegacyRemoveAction(rawActionParam)) {
      router.replace(`/dedupe?${redirectRemoveToScanParams(searchParams.toString())}`);
    }
  }, [rawActionParam, router, searchParams]);

  const resolvedMailbox = useMemo(() => {
    if (!folderParam) return null;
    return mailboxes.find((mailbox) => mailbox.id === folderParam) ?? null;
  }, [folderParam, mailboxes]);

  const scanPayload = useMemo((): DedupeScanResult | null => {
    if (accountResult) return accountResult;
    if (folderResult) return folderToScanResult(folderResult);
    return null;
  }, [accountResult, folderResult]);

  const duplicateCount = scanPayload?.duplicateCount ?? 0;
  const showActionPicker =
    phase === 'complete' && duplicateCount > 0 && !applyResult;

  const handleAbort = useCallback(() => {
    abortRef.current = null;
    setScanningMailbox(null);
    reset();
    startedRef.current = null;
    setAwaitingConfirm(null);
    setSuggestCli(false);
  }, [reset, setScanningMailbox]);

  const cancelOperation = useCallback(() => {
    abortRef.current?.abort();
    if (runId) {
      void dedupeAuditClient.updateRun(runId, { status: 'cancelled' });
    }
    handleAbort();
  }, [handleAbort, runId]);

  const runScan = useCallback(async () => {
    setSuggestCli(false);

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
    const operationAction = isAccount ? 'account-scan' : 'scan';

    if (!isAccount && !folderParam) {
      startedRef.current = null;
      fail(t('missing_folder'));
      return;
    }

    begin({
      action: operationAction,
      scope: isAccount ? 'account' : 'folder',
      mailboxId: folderParam,
      mailboxName: resolvedMailbox?.name ?? null,
    });
    setSuggestCli(false);
    setScanningMailbox(isAccount ? null : folderParam);

    let auditRunId: string | null = null;

    const abortIfCancelled = () => {
      if (signal.aborted) {
        if (auditRunId) {
          void dedupeAuditClient.updateRun(auditRunId, { status: 'cancelled' });
        }
        handleAbort();
        return true;
      }
      return false;
    };

    try {
      const run = await dedupeAuditClient.createRun({
        type: 'scan',
        scope: isAccount ? 'account' : 'folder',
        mailboxId: isAccount ? null : folderParam,
      });
      auditRunId = run.id;
      setRunId(run.id);

      const progressReporter = (message: string) => {
        setProgress(message);
        if (auditRunId) {
          void dedupeAuditClient.appendProgress(auditRunId, { message });
        }
      };

      if (isAccount) {
        clearAllHighlights();
        const outcome = await scanMailboxDuplicates(client, config, progressReporter, signal);
        if (abortIfCancelled()) return;
        for (const folder of outcome.folderResults) {
          setScanResult(folder);
        }
        await dedupeAuditClient.updateRun(auditRunId, {
          status: 'complete',
          stats: {
            scanned: outcome.scanned,
            duplicates: outcome.duplicateCount,
          },
        });
        completeAccount(outcome);
        setRunsRefreshKey((value) => value + 1);
        toast.success(t('account_scan_done', { count: outcome.duplicateCount }));
        return;
      }

      const mailbox = resolvedMailbox;
      if (!mailbox) {
        startedRef.current = null;
        fail(t('missing_folder'));
        return;
      }

      const result = await scanFolderDuplicates(
        client,
        mailbox.id,
        config,
        undefined,
        progressReporter,
        false,
        signal,
      );
      if (abortIfCancelled()) return;
      setScanResult(result);
      selectMailbox(mailbox.id);
      await fetchEmails(client, mailbox.id);
      if (abortIfCancelled()) return;
      await dedupeAuditClient.updateRun(auditRunId, {
        status: 'complete',
        stats: {
          scanned: result.scanned,
          duplicates: result.duplicateCount,
        },
      });
      completeFolder(result);
      setRunsRefreshKey((value) => value + 1);
      if (result.duplicateCount > 0) {
        toast.success(t('folder_scan_done', { count: result.duplicateCount, folder: mailbox.name }));
      } else {
        toast.info(t('folder_scan_none', { folder: mailbox.name }));
      }
    } catch (err) {
      if (auditRunId) {
        void dedupeAuditClient.updateRun(auditRunId, { status: 'error' });
        setRunsRefreshKey((value) => value + 1);
      }
      if (
        err instanceof DedupeAbortedError ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        handleAbort();
        return;
      }
      const message =
        err instanceof DedupeScanError
          ? formatDedupeScanErrorMessage(t, err)
          : err instanceof Error
            ? err.message
            : t('failed');
      setSuggestCli(err instanceof DedupeScanError && err.suggestCli);
      fail(message);
      toast.error(message);
    } finally {
      if (abortRef.current) {
        abortRef.current = null;
        setScanningMailbox(null);
      }
    }
  }, [
    begin,
    clearAllHighlights,
    client,
    completeAccount,
    completeFolder,
    config,
    fail,
    fetchEmails,
    folderParam,
    handleAbort,
    resolvedMailbox,
    scopeParam,
    selectMailbox,
    setProgress,
    setRunId,
    setScanResult,
    setScanningMailbox,
    t,
  ]);

  const runApply = useCallback(async () => {
    if (!client || !scanPayload) return;

    const executor = getExecutor(selectedAction);
    if (!executor) {
      fail(t('unknown_action'));
      return;
    }

    if (selectedAction === 'move_to_folder' && !destinationMailboxId) {
      toast.error(tActions('destination_required'));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    beginApply(selectedAction);
    setLastChosenAction(selectedAction);
    if (destinationMailboxId) {
      setDefaultDestinationMailboxId(destinationMailboxId);
    }

    let applyRunId: string | null = null;

    try {
      const run = await dedupeAuditClient.createRun({
        type: 'apply',
        scope: scopeParam === 'account' ? 'account' : 'folder',
        mailboxId: scopeParam === 'account' ? null : folderParam,
        actionId: selectedAction,
      });
      applyRunId = run.id;
      setRunId(run.id);

      const audit = createBrowserAuditWriter(applyRunId);
      const result = await applyDuplicateAction(
        client,
        scanPayload,
        selectedAction,
        {
          destinationMailboxId: destinationMailboxId ?? undefined,
          keeperPolicy,
          onProgress: setProgress,
        },
        signal,
        audit,
      );
      await audit.flush();

      if (signal.aborted) {
        void dedupeAuditClient.updateRun(applyRunId, { status: 'cancelled' });
        handleAbort();
        return;
      }

      if (result.moved > 0) {
        clearAllHighlights();
        const currentMailbox = useEmailStore.getState().selectedMailbox;
        await fetchMailboxes(client);
        if (scopeParam === 'folder' && folderParam) {
          clearMailboxHighlight(folderParam);
          await fetchEmails(client, folderParam);
          selectMailbox(folderParam);
        } else if (currentMailbox) {
          await fetchEmails(client, currentMailbox);
        }
      }

      await dedupeAuditClient.updateRun(applyRunId, {
        status: 'complete',
        stats: {
          moved: result.moved,
          duplicates: result.duplicateCount,
          actionId: result.actionId,
        },
      });

      completeApply(result);
      setRunsRefreshKey((value) => value + 1);
      toast.success(t('apply_done', { count: result.moved }));
    } catch (err) {
      if (applyRunId) {
        void dedupeAuditClient.updateRun(applyRunId, { status: 'error' });
        setRunsRefreshKey((value) => value + 1);
      }
      if (
        err instanceof DedupeAbortedError ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        handleAbort();
        return;
      }
      const message =
        err instanceof DedupeScanError
          ? formatDedupeScanErrorMessage(t, err)
          : err instanceof Error
            ? err.message
            : t('failed');
      setSuggestCli(err instanceof DedupeScanError && err.suggestCli);
      fail(message);
      toast.error(message);
    } finally {
      abortRef.current = null;
    }
  }, [
    beginApply,
    clearAllHighlights,
    clearMailboxHighlight,
    client,
    completeApply,
    destinationMailboxId,
    fail,
    fetchEmails,
    fetchMailboxes,
    folderParam,
    handleAbort,
    keeperPolicy,
    scanPayload,
    scopeParam,
    selectMailbox,
    selectedAction,
    setDefaultDestinationMailboxId,
    setLastChosenAction,
    setProgress,
    setRunId,
    t,
    tActions,
  ]);

  const requestScanConfirmation = useCallback(async (): Promise<boolean> => {
    if (!client) return true;
    const limits = getDedupeLimits(client);

    if (scopeParam === 'folder' && folderParam && resolvedMailbox) {
      const mailboxRef = resolvedMailbox.originalId || resolvedMailbox.id;
      const accountId = resolvedMailbox.isShared ? resolvedMailbox.accountId : undefined;
      const total = await client.countMailboxEmails(mailboxRef, accountId);
      setFolderMessageCount(total);
      if (dedupeScanNeedsConfirmation(total, limits)) {
        setAwaitingConfirm('scan');
        return false;
      }
      return true;
    }

    if (scopeParam === 'account') {
      const mailboxList = mailboxes.length > 0 ? mailboxes : await client.getAllMailboxes();
      const maxCount = await getAccountScanMaxFolderCount(client, mailboxList);
      setFolderMessageCount(maxCount);
      if (dedupeScanNeedsConfirmation(maxCount, limits)) {
        setAwaitingConfirm('scan');
        return false;
      }
    }

    return true;
  }, [client, folderParam, mailboxes, resolvedMailbox, scopeParam]);

  const requestApplyConfirmation = useCallback(() => {
    const executor = getExecutor(selectedAction);
    if (!executor || !scanPayload) return;
    const preview = executor.preview(scanPayload, {
      destinationMailboxId: destinationMailboxId ?? undefined,
      keeperPolicy,
    });
    if (!preview.jmapWrites) {
      void runApply();
      return;
    }
    setAwaitingConfirm('apply');
  }, [destinationMailboxId, keeperPolicy, runApply, scanPayload, selectedAction]);

  useEffect(() => {
    if (!client || isLegacyRemoveAction(rawActionParam)) return;

    const signature = `${scopeParam}:scan:${folderParam ?? 'all'}`;
    if (startedRef.current === signature) return;

    if (scopeParam === 'folder' && folderParam && mailboxes.length > 0 && !resolvedMailbox) {
      startedRef.current = signature;
      fail(t('missing_folder'));
      return;
    }

    if (scopeParam === 'folder' && folderParam && !resolvedMailbox) return;

    const startScanFlow = async () => {
      const confirmed = await requestScanConfirmation();
      if (!confirmed) {
        startedRef.current = signature;
        return;
      }
      startedRef.current = signature;
      void runScan();
    };

    void startScanFlow();
  }, [client, fail, mailboxes.length, runScan, requestScanConfirmation, scopeParam, rawActionParam, folderParam, resolvedMailbox, t]);

  useEffect(() => () => {
    const { phase: currentPhase } = useDedupeOperationsStore.getState();
    if (currentPhase === 'scanning' || currentPhase === 'applying') {
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

  const effectiveScanPayload = scanPayload
    ? rebuildScanWithKeeperPolicy(scanPayload, keeperPolicy)
    : null;

  const applyPreview = effectiveScanPayload && selectedAction
    ? getExecutor(selectedAction)?.preview(effectiveScanPayload, {
        destinationMailboxId: destinationMailboxId ?? undefined,
        keeperPolicy,
      })
    : null;

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

      {serverLimits && (
        <DedupeLimitsPanel limits={serverLimits} />
      )}

      <DedupeCliPanel />

      <DedupeRecentRuns activeRunId={runId} refreshKey={runsRefreshKey} />

      {awaitingConfirm === 'scan' && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-4">
          <h2 className="text-lg font-medium text-foreground">
            {scopeParam === 'account' ? t('confirm_scan_account_title') : t('confirm_scan_title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {folderMessageCount != null
              ? (scopeParam === 'account'
                ? t('confirm_scan_account_body', { count: folderMessageCount })
                : t('confirm_scan_body', { count: folderMessageCount }))
              : null}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setAwaitingConfirm(null);
                void runScan();
              }}
            >
              <Play className="w-4 h-4 mr-2" />
              {t('confirm_scan_start')}
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

      {awaitingConfirm === 'apply' && applyPreview && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-4">
          <h2 className="text-lg font-medium text-foreground">{t('confirm_apply_title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('confirm_apply_body', {
              count: applyPreview.affectedCount,
              action: tActions(`items.${selectedAction}.label`),
            })}
          </p>
          {selectedAction === 'delete_with_retention' && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {tActions('retention_notice', { days: 90 })}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setAwaitingConfirm(null);
                void runApply();
              }}
            >
              <Play className="w-4 h-4 mr-2" />
              {t('confirm_apply_start')}
            </Button>
            <Button variant="outline" onClick={() => setAwaitingConfirm(null)}>
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
              {action === 'account-scan' ? t('action_account_scan') : t('action_folder_scan')}
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

        {(phase === 'scanning' || phase === 'applying') && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm text-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <span className="flex-1 min-w-0">{progress || t('working')}</span>
            <Button variant="outline" size="sm" onClick={cancelOperation}>
              {t('cancel_operation')}
            </Button>
          </div>
        )}

        {phase === 'error' && error && (
          <div className="space-y-3">
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
            {suggestCli && (
              <DedupeCliPanel variant="prominent" />
            )}
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
            <p className="text-xs text-muted-foreground">{t('stat_applied')}</p>
            <p className="text-2xl font-semibold tabular-nums">{formatMailboxCount(moved)}</p>
          </div>
        </div>
      )}

      {showActionPicker && (
        <>
          <DedupeActionPicker
            mailboxes={mailboxes}
            selectedAction={selectedAction}
            onActionChange={setSelectedAction}
            destinationMailboxId={destinationMailboxId}
            onDestinationChange={setDestinationMailboxId}
            keeperPolicy={keeperPolicy}
            onKeeperPolicyChange={setKeeperPolicy}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={requestApplyConfirmation}>
              <Play className="w-4 h-4 mr-2" />
              {t('apply_action')}
            </Button>
          </div>
        </>
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
              setAwaitingConfirm(null);
              const signature = `${scopeParam}:scan:${folderParam ?? 'all'}`;
              startedRef.current = signature;
              void (async () => {
                const confirmed = await requestScanConfirmation();
                if (confirmed) {
                  void runScan();
                }
              })();
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('run_again')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}