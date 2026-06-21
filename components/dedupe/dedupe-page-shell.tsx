'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useEmailStore } from '@/stores/email-store';
import { useUIStore } from '@/stores/ui-store';
import { useDeviceDetection } from '@/hooks/use-media-query';
import { NavigationRail } from '@/components/layout/navigation-rail';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { DragDropProvider } from '@/contexts/drag-drop-context';
import { ErrorBoundary, SidebarErrorFallback } from '@/components/error';
import { cn } from '@/lib/utils';

interface DedupePageShellProps {
  children: React.ReactNode;
}

export function DedupePageShell({ children }: DedupePageShellProps) {
  const router = useRouter();
  const { client, logout } = useAuthStore();
  const {
    mailboxes,
    selectedMailbox,
    quota,
    isPushConnected,
    searchQuery,
    fetchMailboxes,
    fetchQuota,
    selectMailbox,
    setSearchQuery,
    clearSearchFilters,
  } = useEmailStore();
  const { isMobile, isTablet } = useDeviceDetection();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!client || initialLoadDone) return;
    const load = async () => {
      try {
        await Promise.all([fetchMailboxes(client), fetchQuota(client)]);
      } finally {
        setInitialLoadDone(true);
      }
    };
    void load();
  }, [client, fetchMailboxes, fetchQuota, initialLoadDone]);

  const handleMailboxSelect = (mailboxId: string) => {
    selectMailbox(mailboxId);
    if (isMobile || isTablet) {
      setSidebarOpen(false);
    }
    router.push('/');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const currentMailboxName =
    mailboxes.find((mailbox) => mailbox.id === selectedMailbox)?.name ?? 'Mail';

  return (
    <DragDropProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {!isMobile && !isTablet && (
          <div className="w-14 border-r border-border bg-secondary flex flex-col items-center flex-shrink-0">
            <NavigationRail collapsed />
          </div>
        )}

        {(isMobile || isTablet) && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={cn(
            'flex-shrink-0 h-full z-50',
            'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-72',
            'max-lg:transform max-lg:transition-transform max-lg:duration-300 max-lg:ease-in-out',
            !sidebarOpen && 'max-lg:-translate-x-full',
            'lg:relative lg:translate-x-0',
          )}
        >
          <ErrorBoundary fallback={SidebarErrorFallback}>
            <Sidebar
              mailboxes={mailboxes}
              selectedMailbox={selectedMailbox}
              onMailboxSelect={handleMailboxSelect}
              onCompose={() => router.push('/')}
              onLogout={() => void handleLogout()}
              onSidebarClose={() => setSidebarOpen(false)}
              onSearch={(query) => {
                setSearchQuery(query);
                router.push('/');
              }}
              onClearSearch={() => clearSearchFilters()}
              activeSearchQuery={searchQuery}
              quota={quota}
              isPushConnected={isPushConnected}
            />
          </ErrorBoundary>
        </div>

        <div className="flex flex-col flex-1 min-w-0 h-full">
          {(isMobile || isTablet) && (
            <MobileHeader title={currentMailboxName} />
          )}

          <main className="flex-1 overflow-y-auto min-h-0">{children}</main>

          {(isMobile || isTablet) && <NavigationRail orientation="horizontal" />}
        </div>
      </div>
    </DragDropProvider>
  );
}