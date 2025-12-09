"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sidebar } from "@/components/layout/sidebar";
import { EmailList } from "@/components/email/email-list";
import { EmailViewer } from "@/components/email/email-viewer";
import { EmailComposer } from "@/components/email/email-composer";
import { useEmailStore } from "@/stores/email-store";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import { debug } from "@/lib/debug";

export default function Home() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('common');
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<'compose' | 'reply' | 'replyAll' | 'forward'>('compose');
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    isLoadingEmail,
    setLoadingEmail,
    dataLoaded,
    setDataLoaded,
  } = useEmailStore();

  // Update page title based on context
  useEffect(() => {
    let title = "Webmail";

    if (showComposer) {
      // Composing email
      const modeText = {
        compose: t('email_composer.new_message'),
        reply: t('email_composer.reply'),
        replyAll: t('email_composer.reply_all'),
        forward: t('email_composer.forward'),
      }[composerMode] || t('email_composer.new_message');
      title = `${modeText} - Webmail`;
    } else if (selectedEmail) {
      // Reading email
      const subject = selectedEmail.subject || t('email_viewer.no_subject');
      title = `${subject} - Webmail`;
    } else if (selectedMailbox && mailboxes.length > 0) {
      // Mailbox view
      const mailbox = mailboxes.find(mb => mb.id === selectedMailbox);
      if (mailbox) {
        const mailboxName = mailbox.name;
        const unreadCount = mailbox.unreadEmails || 0;
        title = unreadCount > 0
          ? `${mailboxName} (${unreadCount}) - Webmail`
          : `${mailboxName} - Webmail`;
      }
    }

    document.title = title;
  }, [showComposer, composerMode, selectedEmail, selectedMailbox, mailboxes, t]);

  // Check auth on mount
  useEffect(() => {
    checkAuth().finally(() => {
      setInitialCheckDone(true);
    });
  }, [checkAuth]);

  // Redirect to login if not authenticated and reset data loaded flag
  useEffect(() => {
    if (initialCheckDone && !isAuthenticated && !authLoading) {
      setDataLoaded(false); // Reset so data is reloaded on next login
      router.push(`/${params.locale}/login`);
    }
  }, [initialCheckDone, isAuthenticated, authLoading, router, params.locale]);

  // Load mailboxes and emails when authenticated
  useEffect(() => {
    if (isAuthenticated && client && !dataLoaded) {
      const loadData = async () => {
        try {
          // First fetch mailboxes and quota (inbox will be auto-selected in fetchMailboxes)
          await Promise.all([
            fetchMailboxes(client),
            fetchQuota(client)
          ]);

          // Get the selected mailbox (should be inbox by default)
          const state = useEmailStore.getState();
          const selectedMailboxId = state.selectedMailbox;

          // Fetch emails for the selected mailbox
          if (selectedMailboxId) {
            await fetchEmails(client, selectedMailboxId);
          } else {
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

  // Handle mark-as-read with delay based on settings
  useEffect(() => {
    // Clear any existing timeout when email changes
    if (markAsReadTimeoutRef.current) {
      debug.log('[Mark as Read] Clearing previous timeout');
      clearTimeout(markAsReadTimeoutRef.current);
      markAsReadTimeoutRef.current = null;
    }

    // Only set timeout if there's a selected email, it's unread, and we have a client
    if (!selectedEmail || !client || selectedEmail.keywords?.$seen) {
      return;
    }

    // Get current setting value
    const markAsReadDelay = useSettingsStore.getState().markAsReadDelay;
    debug.log('[Mark as Read] Delay setting:', markAsReadDelay, 'ms for email:', selectedEmail.id);

    if (markAsReadDelay === -1) {
      // Never mark as read automatically
      debug.log('[Mark as Read] Never mode - email will stay unread');
    } else if (markAsReadDelay === 0) {
      // Mark as read instantly
      debug.log('[Mark as Read] Instant mode - marking as read now');
      markAsRead(client, selectedEmail.id, true);
    } else {
      // Mark as read after delay
      debug.log('[Mark as Read] Delayed mode - will mark as read in', markAsReadDelay, 'ms');
      markAsReadTimeoutRef.current = setTimeout(() => {
        debug.log('[Mark as Read] Timeout fired - marking as read now');
        markAsRead(client, selectedEmail.id, true);
        markAsReadTimeoutRef.current = null;
      }, markAsReadDelay);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (markAsReadTimeoutRef.current) {
        debug.log('[Mark as Read] Cleanup - clearing timeout');
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmail?.id]);

  const handleEmailSend = async (data: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    draftId?: string;
  }) => {
    if (!client) return;

    try {
      await sendEmail(client, data.to, data.subject, data.body, data.cc, data.bcc, data.draftId);
      setShowComposer(false);
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  const handleDiscardDraft = async (draftId: string) => {
    if (!client) return;

    try {
      await client.deleteEmail(draftId);
    } catch (error) {
      console.error("Failed to discard draft:", error);
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

  const handleQuickReply = async (body: string) => {
    if (!client || !selectedEmail) return;

    const sender = selectedEmail.from?.[0];
    if (!sender?.email) {
      throw new Error("No sender email found");
    }

    // Send reply with just the body text
    await sendEmail(
      client,
      [sender.email],
      `Re: ${selectedEmail.subject || "(no subject)"}`,
      body
    );

    // Refresh emails to show the sent reply
    await fetchEmails(client, selectedMailbox);
  };

  // Show loading state while checking auth
  if (!initialCheckDone || authLoading || (!isAuthenticated || !client)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
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
      <div className="w-96 bg-background border-r border-border flex-shrink-0 shadow-sm">
        <EmailList
          emails={emails}
          selectedEmailId={selectedEmail?.id}
          isLoading={isLoading}
          onEmailSelect={async (email) => {
            if (!client || !email) return;

            // Set loading state immediately (keep current email visible)
            setLoadingEmail(true);

            // Fetch the full content
            try {
              // Find selected mailbox to determine accountId (for shared folders)
              const mailbox = mailboxes.find(mb => mb.id === selectedMailbox);
              // Only pass accountId for shared mailboxes
              const accountId = mailbox?.isShared ? mailbox.accountId : undefined;

              const fullEmail = await client.getEmail(email.id, accountId);
              if (fullEmail) {
                selectEmail(fullEmail);
                // Mark-as-read logic is now handled by useEffect
              }
            } catch (error) {
              console.error('Failed to fetch email content:', error);
            } finally {
              setLoadingEmail(false);
            }
          }}
          className="h-full"
        />
      </div>

      {/* Email Viewer */}
      <EmailViewer
        email={selectedEmail}
        isLoading={isLoadingEmail}
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
        onQuickReply={handleQuickReply}
        currentUserEmail={client?.["username"]}
        currentUserName={client?.["username"]?.split("@")[0]}
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
              onDiscardDraft={handleDiscardDraft}
            />
          </div>
        </div>
      )}
    </div>
  );
}
