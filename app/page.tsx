"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { EmailList } from "@/components/email/email-list";
import { EmailViewer } from "@/components/email/email-viewer";
import { EmailComposer } from "@/components/email/email-composer";
import { useEmailStore } from "@/stores/email-store";

export default function Home() {
  const [showComposer, setShowComposer] = useState(false);
  const {
    emails,
    mailboxes,
    selectedEmail,
    selectedMailbox,
    selectEmail,
    selectMailbox,
    loadMockData,
  } = useEmailStore();

  useEffect(() => {
    // Load mock data on mount
    loadMockData();
  }, [loadMockData]);

  const handleEmailSend = (data: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
  }) => {
    console.log("Sending email:", data);
    setShowComposer(false);
    // In a real app, this would call the JMAP client to send the email
  };

  const handleReply = () => {
    console.log("Reply to:", selectedEmail?.id);
    setShowComposer(true);
  };

  const handleReplyAll = () => {
    console.log("Reply all to:", selectedEmail?.id);
    setShowComposer(true);
  };

  const handleForward = () => {
    console.log("Forward:", selectedEmail?.id);
    setShowComposer(true);
  };

  const handleDelete = () => {
    console.log("Delete:", selectedEmail?.id);
    selectEmail(null);
  };

  const handleArchive = () => {
    console.log("Archive:", selectedEmail?.id);
    selectEmail(null);
  };

  const handleToggleStar = () => {
    console.log("Toggle star:", selectedEmail?.id);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        mailboxes={mailboxes}
        selectedMailbox={selectedMailbox}
        onMailboxSelect={selectMailbox}
        onCompose={() => setShowComposer(true)}
      />

      {/* Email List */}
      <div className="w-80 border-r flex-shrink-0">
        <EmailList
          emails={emails}
          selectedEmailId={selectedEmail?.id}
          onEmailSelect={selectEmail}
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
      />

      {/* Email Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-3xl h-[600px] mx-4">
            <EmailComposer
              onSend={handleEmailSend}
              onClose={() => setShowComposer(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
