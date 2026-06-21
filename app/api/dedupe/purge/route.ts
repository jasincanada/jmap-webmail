import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { decryptSession } from '@/lib/auth/crypto';
import { SESSION_COOKIE } from '@/lib/auth/session-cookie';
import { JMAPClient } from '@/lib/jmap/client';
import { getAuditWriter } from '@/lib/dedupe-audit/writer';
import { getSessionAccountId } from '@/lib/dedupe-audit/session';

const PURGE_BATCH_SIZE = 50;

export async function POST() {
  try {
    const session = await getSessionAccountId();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const credentials = token ? decryptSession(token) : null;
    if (!credentials) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const writer = getAuditWriter();
    const dueMessages = writer.listDueForPurge(session.accountId);

    if (dueMessages.length === 0) {
      return NextResponse.json({ runId: null, purgedCount: 0, emailIds: [] });
    }

    const purgeRun = writer.createRun({
      accountId: session.accountId,
      type: 'purge',
      scope: 'account',
      stats: { dueCount: dueMessages.length },
    });

    const emailIds: string[] = [];
    const changeIds: number[] = [];

    try {
      const client = new JMAPClient(
        credentials.serverUrl,
        credentials.username,
        credentials.password,
      );
      await client.connect();

      for (let offset = 0; offset < dueMessages.length; offset += PURGE_BATCH_SIZE) {
        const batch = dueMessages.slice(offset, offset + PURGE_BATCH_SIZE);
        const batchEmailIds = batch.map((message) => message.emailId);
        await client.batchDeleteEmails(batchEmailIds);
        emailIds.push(...batchEmailIds);
        changeIds.push(...batch.map((message) => message.changeId));
      }

      writer.markChangesPurged(changeIds, session.accountId);
      writer.recordChanges(
        purgeRun.id,
        session.accountId,
        dueMessages.map((message) => ({
          emailId: message.emailId,
          fromMailboxId: message.fromMailboxId,
          toMailboxId: null,
          actionId: 'purge',
          changedAt: Date.now(),
        })),
      );

      writer.updateRunStatus(purgeRun.id, session.accountId, 'complete', {
        stats: { dueCount: dueMessages.length, purgedCount: emailIds.length },
      });
    } catch (jmapError) {
      writer.updateRunStatus(purgeRun.id, session.accountId, 'error', {
        stats: {
          dueCount: dueMessages.length,
          purgedCount: emailIds.length,
          error: jmapError instanceof Error ? jmapError.message : 'JMAP purge failed',
        },
      });
      throw jmapError;
    }

    return NextResponse.json({
      runId: purgeRun.id,
      purgedCount: emailIds.length,
      emailIds,
    });
  } catch (error) {
    logger.error('Dedupe purge error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}