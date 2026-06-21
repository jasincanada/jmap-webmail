'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';
import { DedupeOperationsView } from '@/components/dedupe/dedupe-operations-view';
import { DedupePageShell } from '@/components/dedupe/dedupe-page-shell';
import { useAuthStore } from '@/stores/auth-store';

function DedupePageContent() {
  return (
    <DedupePageShell>
      <DedupeOperationsView />
    </DedupePageShell>
  );
}

export default function DedupePage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    void checkAuth().finally(() => setInitialCheckDone(true));
  }, [checkAuth]);

  useEffect(() => {
    if (initialCheckDone && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [initialCheckDone, isLoading, isAuthenticated, router]);

  if (!initialCheckDone || isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <DedupePageContent />
    </Suspense>
  );
}