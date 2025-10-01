"use client";

import { Email } from "@/lib/jmap/types";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Star,
  MoreVertical,
} from "lucide-react";

interface EmailViewerProps {
  email: Email | null;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onToggleStar?: () => void;
}

export function EmailViewer({
  email,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onArchive,
  onToggleStar,
}: EmailViewerProps) {
  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select an email to view</p>
      </div>
    );
  }

  const sender = email.from?.[0];
  const isStarred = email.keywords?.$flagged;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Email Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">
              {email.subject || "(no subject)"}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>From: <span className="text-foreground">{sender?.name || sender?.email}</span></span>
              <span>{formatDate(email.receivedAt)}</span>
            </div>
            {email.to && email.to.length > 0 && (
              <div className="text-sm text-muted-foreground mt-1">
                To: {email.to.map(addr => addr.name || addr.email).join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onReply}>
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </Button>
          <Button variant="ghost" size="sm" onClick={onReplyAll}>
            <ReplyAll className="w-4 h-4 mr-2" />
            Reply All
          </Button>
          <Button variant="ghost" size="sm" onClick={onForward}>
            <Forward className="w-4 h-4 mr-2" />
            Forward
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onToggleStar}>
              <Star className={`w-4 h-4 ${isStarred ? "fill-current text-yellow-500" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onArchive}>
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="email-content prose prose-sm max-w-none">
          {email.preview && (
            <div dangerouslySetInnerHTML={{ __html: email.preview }} />
          )}
        </div>
      </div>
    </div>
  );
}