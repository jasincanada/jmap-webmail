"use client";

import { formatDate, truncateText } from "@/lib/utils";
import { Email } from "@/lib/jmap/types";
import { cn } from "@/lib/utils";
import { Paperclip, Star } from "lucide-react";

interface EmailListItemProps {
  email: Email;
  selected?: boolean;
  onClick?: () => void;
}

export function EmailListItem({ email, selected, onClick }: EmailListItemProps) {
  const isUnread = !email.keywords?.$seen;
  const isStarred = email.keywords?.$flagged;
  const sender = email.from?.[0];

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b",
        selected ? "bg-accent" : "hover:bg-accent/50",
        isUnread && "font-semibold"
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-sm", isUnread ? "font-semibold" : "font-normal")}>
            {sender?.name || sender?.email || "Unknown"}
          </span>
          {isStarred && <Star className="w-3 h-3 fill-current text-yellow-500" />}
          {email.hasAttachment && <Paperclip className="w-3 h-3 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDate(email.receivedAt)}
          </span>
        </div>
        <div className="text-sm mb-1">
          <span className={cn(isUnread ? "font-semibold" : "font-normal")}>
            {email.subject || "(no subject)"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {truncateText(email.preview || "", 100)}
        </p>
      </div>
    </div>
  );
}