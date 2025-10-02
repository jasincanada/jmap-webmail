"use client";

import { Email } from "@/lib/jmap/types";
import { EmailListItem } from "./email-list-item";
import { cn } from "@/lib/utils";
import { Inbox, CheckSquare, Square, Trash2, Mail, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmailStore } from "@/stores/email-store";
import { useAuthStore } from "@/stores/auth-store";

interface EmailListProps {
  emails: Email[];
  selectedEmailId?: string;
  onEmailSelect?: (email: Email) => void;
  className?: string;
  isLoading?: boolean;
}

export function EmailList({
  emails,
  selectedEmailId,
  onEmailSelect,
  className,
  isLoading = false
}: EmailListProps) {
  const { client } = useAuthStore();
  const {
    selectedEmailIds,
    toggleEmailSelection,
    selectAllEmails,
    clearSelection,
    batchMarkAsRead,
    batchDelete
  } = useEmailStore();
  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="border-b border-border px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const hasSelection = selectedEmailIds.size > 0;
  const allSelected = emails.length > 0 && emails.every(e => selectedEmailIds.has(e.id));

  const handleBatchMarkAsRead = async (read: boolean) => {
    if (!client) return;
    await batchMarkAsRead(client, read);
  };

  const handleBatchDelete = async () => {
    if (!client || !confirm(`Delete ${selectedEmailIds.size} emails?`)) return;
    await batchDelete(client);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Batch Actions Toolbar */}
      {hasSelection && (
        <div className="px-4 py-2 border-b bg-blue-50 dark:bg-blue-950/30 border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedEmailIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBatchMarkAsRead(true)}
              title="Mark as read"
            >
              <MailOpen className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBatchMarkAsRead(false)}
              title="Mark as unread"
            >
              <Mail className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBatchDelete}
              title="Delete"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              title="Clear selection"
              className="ml-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* List Header */}
      <div className="px-4 py-3 border-b bg-muted/50 border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => allSelected ? clearSelection() : selectAllEmails()}
            className="p-1 hover:bg-muted rounded"
            title={allSelected ? "Deselect all" : "Select all"}
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <h2 className="text-sm font-medium text-foreground">
            {isLoading ? 'Loading...' : emails.length > 0 ? `${emails.length} conversations` : 'No conversations'}
          </h2>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto bg-background">
        {isLoading ? (
          <LoadingSkeleton />
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Inbox className="w-16 h-16 mb-4 text-muted-foreground/50" />
            <p className="text-base font-medium text-foreground">No emails in this mailbox</p>
            <p className="text-sm mt-1 text-muted-foreground">New messages will appear here</p>
          </div>
        ) : (
          emails.map((email) => (
            <EmailListItem
              key={email.id}
              email={email}
              selected={email.id === selectedEmailId}
              onClick={() => onEmailSelect?.(email)}
            />
          ))
        )}
      </div>
    </div>
  );
}