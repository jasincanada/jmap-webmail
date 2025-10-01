"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Inbox,
  Send,
  File,
  Star,
  Trash2,
  Archive,
  PenSquare,
  Search,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Mailbox } from "@/lib/jmap/types";

interface SidebarProps {
  mailboxes: Mailbox[];
  selectedMailbox?: string;
  onMailboxSelect?: (mailboxId: string) => void;
  onCompose?: () => void;
  className?: string;
}

const defaultMailboxes = [
  { id: "inbox", name: "Inbox", icon: Inbox, unread: 12 },
  { id: "sent", name: "Sent", icon: Send, unread: 0 },
  { id: "drafts", name: "Drafts", icon: File, unread: 2 },
  { id: "starred", name: "Starred", icon: Star, unread: 0 },
  { id: "archive", name: "Archive", icon: Archive, unread: 0 },
  { id: "trash", name: "Trash", icon: Trash2, unread: 0 },
];

export function Sidebar({
  mailboxes = [],
  selectedMailbox = "inbox",
  onMailboxSelect,
  onCompose,
  className,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div
      className={cn(
        "flex flex-col h-full border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        {!isCollapsed && (
          <Button onClick={onCompose} className="ml-2 flex-1">
            <PenSquare className="w-4 h-4 mr-2" />
            Compose
          </Button>
        )}
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Mailbox List */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-2">
          {defaultMailboxes.map((mailbox) => (
            <button
              key={mailbox.id}
              onClick={() => onMailboxSelect?.(mailbox.id)}
              className={cn(
                "w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors",
                selectedMailbox === mailbox.id && "bg-gray-100"
              )}
            >
              <mailbox.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{mailbox.name}</span>
                  {mailbox.unread > 0 && (
                    <span className="text-xs bg-gray-900 text-white rounded-full px-2 py-0.5">
                      {mailbox.unread}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t text-xs text-gray-500">
          <div>Storage: 2.5 GB / 15 GB</div>
        </div>
      )}
    </div>
  );
}