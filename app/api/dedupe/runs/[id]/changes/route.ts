import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAuditWriter } from '@/lib/dedupe-audit/writer';
import type { MessageChangeInput } from '@/lib/dedupe-audit/writer';
import { getSessionAccountId } from '@/lib/dedupe-audit/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isMessageChange(value: unknown): value is MessageChangeInput {
  if (!value || typeof value !== 'object') return false;
  const change = value as MessageChangeInput;
  return (
    typeof change.emailId === 'string' &&
    typeof change.fromMailboxId === 'string' &&
    typeof change.actionId === 'string'
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSessionAccountId();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const rawChanges = Array.isArray(body.changes) ? body.changes : [];

    if (rawChanges.length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    if (!rawChanges.every(isMessageChange)) {
      return NextResponse.json({ error: 'Invalid change payload' }, { status: 400 });
    }

    const writer = getAuditWriter();
    const recorded = writer.recordChanges(id, session.accountId, rawChanges);

    if (recorded === 0) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({ recorded });
  } catch (error) {
    logger.error('Dedupe changes record error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}