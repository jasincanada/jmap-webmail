import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAuditWriter } from '@/lib/dedupe-audit/writer';
import type { DedupeRunScope, DedupeRunType } from '@/lib/dedupe-audit/writer';
import { getSessionAccountId } from '@/lib/dedupe-audit/session';

const VALID_TYPES = new Set<DedupeRunType>(['scan', 'apply', 'purge']);
const VALID_SCOPES = new Set<DedupeRunScope>(['folder', 'account']);

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionAccountId();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const type = body.type as DedupeRunType;
    const scope = body.scope as DedupeRunScope;

    if (!VALID_TYPES.has(type) || !VALID_SCOPES.has(scope)) {
      return NextResponse.json({ error: 'Invalid run type or scope' }, { status: 400 });
    }

    const writer = getAuditWriter();
    const run = writer.createRun({
      accountId: session.accountId,
      type,
      scope,
      mailboxId: body.mailboxId ?? null,
      actionId: body.actionId ?? null,
      stats: body.stats,
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    logger.error('Dedupe run create error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionAccountId();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 50;

    const writer = getAuditWriter();
    const runs = writer.listRuns(session.accountId, safeLimit);

    return NextResponse.json(
      { runs },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
  } catch (error) {
    logger.error('Dedupe run list error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}