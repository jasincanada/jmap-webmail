"use client";

import { Email } from "@/lib/jmap/types";
import { EmailListItem } from "./email-list-item";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

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

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* List Header */}
      <div className="px-4 py-3 border-b bg-muted/50 border-border">
        <h2 className="text-sm font-medium text-foreground">
          {isLoading ? 'Loading...' : emails.length > 0 ? `${emails.length} conversations` : 'No conversations'}
        </h2>
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