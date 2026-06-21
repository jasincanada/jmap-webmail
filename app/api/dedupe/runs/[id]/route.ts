import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAuditWriter } from '@/lib/dedupe-audit/writer';
import type { DedupeRunStatus } from '@/lib/dedupe-audit/writer';
import { getSessionAccountId } from '@/lib/dedupe-audit/session';

const VALID_STATUSES = new Set<DedupeRunStatus>([
  'running',
  'paused',
  'complete',
  'error',
  'cancelled',
]);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getSessionAccountId();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const writer = getAuditWriter();
    const run = writer.getRun(id, session.accountId);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json(run, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    logger.error('Dedupe run get error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSessionAccountId();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const writer = getAuditWriter();

    let run = writer.getRun(id, session.accountId);
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    let progress = null;

    if (body.progress) {
      progress = writer.appendProgress(id, session.accountId, body.progress);
      if (!progress) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }
    }

    if (body.status) {
      const status = body.status as DedupeRunStatus;
      if (!VALID_STATUSES.has(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const updated = writer.updateRunStatus(id, session.accountId, status, {
        stats: body.stats,
      });
      if (!updated) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }
      run = { ...run, ...updated };
    } else if (body.stats) {
      const updated = writer.updateRunStatus(id, session.accountId, run.status, {
        stats: body.stats,
      });
      if (!updated) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }
      run = { ...run, ...updated };
    }

    return NextResponse.json({ run, progress });
  } catch (error) {
    logger.error('Dedupe run update error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}