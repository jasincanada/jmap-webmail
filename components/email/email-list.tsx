"use client";

import { Email } from "@/lib/jmap/types";
import { EmailListItem } from "./email-list-item";
import { cn } from "@/lib/utils";

interface EmailListProps {
  emails: Email[];
  selectedEmailId?: string;
  onEmailSelect?: (email: Email) => void;
  className?: string;
}

export function EmailList({
  emails,
  selectedEmailId,
  onEmailSelect,
  className
}: EmailListProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No emails to display</p>
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