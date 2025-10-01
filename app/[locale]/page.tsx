"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sidebar } from "@/components/layout/sidebar";
import { EmailList } from "@/components/email/email-list";
import { EmailViewer } from "@/components/email/email-viewer";
import { EmailComposer } from "@/components/email/email-composer";
import { useEmailStore } from "@/stores/email-store";
import { useAuthStore } from "@/stores/auth-store";

export default function Home() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('common');
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<'compose' | 'reply' | 'replyAll' | 'forward'>('compose');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const { isAuthenticated, client, logout, checkAuth, isLoading: authLoading } = useAuthStore();
  const {
    emails,
    mailboxes,
    selectedEmail,
    selectedMailbox,
    quota,
    selectEmail,
    selectMailbox,
    fetchMailboxes,
    fetchEmails,
    fetchQuota,
    sendEmail,
    deleteEmail,
    markAsRead,
    toggleStar,
    moveToMailbox,
    searchEmails,
    isLoading,
  } = useEmailStore();

  // Check auth on mount
  useEffect(() => {
    checkAuth().finally(() => {
      setInitialCheckDone(true);
    });
  }, [checkAuth]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (initialCheckDone && !isAuthenticated && !authLoading) {
      router.push(`/${params.locale}/login`);
    }
  }, [initialCheckDone, isAuthenticated, authLoading, router, params.locale]);

  // Load mailboxes and emails when authenticated
  useEffect(() => {
    if (isAuthenticated && client && !dataLoaded) {
      const loadData = async () => {
        console.log('Loading email data...');
        try {
          // First fetch mailboxes and quota
          await Promise.all([
            fetchMailboxes(client),
            fetchQuota(client)
          ]);

          // Get the actual inbox mailbox ID
          const state = useEmailStore.getState();
          const inboxMailbox = state.mailboxes.find(m => m.role === 'inbox');

          if (inboxMailbox) {
            console.log('Found inbox mailbox:', inboxMailbox.id, inboxMailbox.name);
            // Update selected mailbox to actual inbox ID
            state.selectMailbox(inboxMailbox.id);
            // Now fetch emails with correct mailbox ID
            await fetchEmails(client, inboxMailbox.id);
          } else {
            console.log('No inbox found, fetching all emails');
            await fetchEmails(client);
          }

          setDataLoaded(true);
        } catch (error) {
          console.error('Error loading email data:', error);
        }
      };
      loadData();
    }
  }, [isAuthenticated, client, dataLoaded, fetchMailboxes, fetchEmails, fetchQuota]);

  const handleEmailSend = async (data: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
  }) => {
    if (!client) return;

    try {
      await sendEmail(client, data.to, data.subject, data.body, data.cc, data.bcc);
      setShowComposer(false);
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  const handleReply = () => {
    setComposerMode('reply');
    setShowComposer(true);
  };

  const handleReplyAll = () => {
    setComposerMode('replyAll');
    setShowComposer(true);
  };

  const handleForward = () => {
    setComposerMode('forward');
    setShowComposer(true);
  };

  const handleDelete = async () => {
    if (!client || !selectedEmail) return;

    try {
      await deleteEmail(client, selectedEmail.id);
      selectEmail(null);
    } catch (error) {
      console.error("Failed to delete email:", error);
    }
  };

  const handleArchive = async () => {
    if (!client || !selectedEmail) return;

    // Find archive mailbox
    const archiveMailbox = mailboxes.find(m => m.role === "archive" || m.name.toLowerCase() === "archive");
    if (archiveMailbox) {
      try {
        await moveToMailbox(client, selectedEmail.id, archiveMailbox.id);
        selectEmail(null);
      } catch (error) {
        console.error("Failed to archive email:", error);
      }
    }
  };

  const handleToggleStar = async () => {
    if (!client || !selectedEmail) return;

    try {
      await toggleStar(client, selectedEmail.id);
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const handleSetColorTag = async (emailId: string, color: string | null) => {
    if (!client) return;

    try {
      // Remove any existing color tags
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      const keywords = { ...email.keywords };

      // Remove old color tags - set to false for JMAP to remove them
      Object.keys(keywords).forEach(key => {
        if (key.startsWith("$color:")) {
          keywords[key] = false;
        }
      });

      // Add new color tag if specified
      if (color) {
        keywords[`$color:${color}`] = true;
      }

      // Update email keywords via JMAP
      await client.updateEmailKeywords(emailId, keywords);

      // Update local state
      selectEmail(email.id === selectedEmail?.id ? { ...email, keywords } : selectedEmail);

      // Refresh emails list to show color in list
      await fetchEmails(client, selectedMailbox);
    } catch (error) {
      console.error("Failed to set color tag:", error);
    }
  };

  const handleMailboxSelect = async (mailboxId: string) => {
    selectMailbox(mailboxId);
    selectEmail(null); // Clear selected email when switching mailboxes
    if (client) {
      await fetchEmails(client, mailboxId);
    }
  };

  const handleLogout = () => {
    logout();
    router.push(`/${params.locale}/login`);
  };

  const handleSearch = async (query: string) => {
    if (!client) return;
    await searchEmails(client, query);
  };

  const handleDownloadAttachment = async (blobId: string, name: string, type?: string) => {
    if (!client) return;

    try {
      await client.downloadBlob(blobId, name, type);
    } catch (error) {
      console.error("Failed to download attachment:", error);
    }
  };

  // Show loading state while checking auth or loading data
  if (!initialCheckDone || authLoading || (!isAuthenticated || !client || isLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        mailboxes={mailboxes}
        selectedMailbox={selectedMailbox}
        onMailboxSelect={handleMailboxSelect}
        onCompose={() => {
          setComposerMode('compose');
          setShowComposer(true);
        }}
        onLogout={handleLogout}
        onSearch={handleSearch}
        quota={quota}
      />

      {/* Email List */}
      <div className="w-96 bg-white dark:bg-gray-950 border-r dark:border-gray-800 flex-shrink-0 shadow-sm">
        <EmailList
          emails={emails}
          selectedEmailId={selectedEmail?.id}
          isLoading={isLoading}
          onEmailSelect={async (email) => {
            if (!client || !email) return;

            // First, select the email to show it immediately
            selectEmail(email);

            // Then fetch the full content
            try {
              const fullEmail = await client.getEmail(email.id);
              if (fullEmail) {
                selectEmail(fullEmail);
              }
            } catch (error) {
              console.error('Failed to fetch email content:', error);
            }
          }}
          className="h-full"
        />
      </div>

      {/* Email Viewer */}
      <EmailViewer
        email={selectedEmail}
        onReply={handleReply}
        onReplyAll={handleReplyAll}
        onForward={handleForward}
        onDelete={handleDelete}
        onArchive={handleArchive}
        onToggleStar={handleToggleStar}
        onSetColorTag={handleSetColorTag}
        onMarkAsRead={async (emailId, read) => {
          if (client) {
            await markAsRead(client, emailId, read);
          }
        }}
        onDownloadAttachment={handleDownloadAttachment}
      />

      {/* Email Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-3xl h-[600px] mx-4">
            <EmailComposer
              mode={composerMode}
              replyTo={selectedEmail ? {
                from: selectedEmail.from,
                to: selectedEmail.to,
                cc: selectedEmail.cc,
                subject: selectedEmail.subject,
                body: selectedEmail.bodyValues?.[selectedEmail.textBody?.[0]?.partId || '']?.value || selectedEmail.preview || '',
                receivedAt: selectedEmail.receivedAt
              } : undefined}
              onSend={handleEmailSend}
              onClose={() => {
                setShowComposer(false);
                setComposerMode('compose');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
