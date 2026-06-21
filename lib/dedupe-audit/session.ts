import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/auth/crypto';
import { SESSION_COOKIE } from '@/lib/auth/session-cookie';

export interface SessionAccount {
  accountId: string;
  userId: string;
}

/** Resolve the logged-in account from the encrypted session cookie. */
export async function getSessionAccountId(): Promise<SessionAccount | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const credentials = decryptSession(token);
  if (!credentials) return null;

  return {
    accountId: credentials.username,
    userId: credentials.username,
  };
}