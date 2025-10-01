"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useThemeStore } from "@/stores/theme-store";
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
  LogOut,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Sun,
  Moon,
  Monitor,
  Globe,
  Settings,
  ChevronUp,
} from "lucide-react";
import { cn, buildMailboxTree, MailboxNode, formatFileSize } from "@/lib/utils";
import { Mailbox } from "@/lib/jmap/types";

interface SidebarProps {
  mailboxes: Mailbox[];
  selectedMailbox?: string;
  onMailboxSelect?: (mailboxId: string) => void;
  onCompose?: () => void;
  onLogout?: () => void;
  onSearch?: (query: string) => void;
  quota?: { used: number; total: number } | null;
  className?: string;
}

// Map role to icon
const getIconForMailbox = (role?: string, name?: string, hasChildren?: boolean, isExpanded?: boolean) => {
  const lowerName = name?.toLowerCase() || "";

  if (hasChildren) {
    // For folders with children, return open/closed folder icon
    return isExpanded ? FolderOpen : Folder;
  }

  if (role === "inbox" || lowerName.includes("inbox")) return Inbox;
  if (role === "sent" || lowerName.includes("sent")) return Send;
  if (role === "drafts" || lowerName.includes("draft")) return File;
  if (role === "trash" || lowerName.includes("trash")) return Trash2;
  if (role === "archive" || lowerName.includes("archive")) return Archive;
  if (lowerName.includes("star") || lowerName.includes("flag")) return Star;
  return Inbox; // Default icon
};

// Component for rendering a single mailbox node with its children
function MailboxTreeItem({
  node,
  selectedMailbox,
  expandedFolders,
  onMailboxSelect,
  onToggleExpand,
  isCollapsed,
}: {
  node: MailboxNode;
  selectedMailbox: string;
  expandedFolders: Set<string>;
  onMailboxSelect?: (id: string) => void;
  onToggleExpand: (id: string) => void;
  isCollapsed: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedFolders.has(node.id);
  const Icon = getIconForMailbox(node.role, node.name, hasChildren, isExpanded);
  const indentPixels = node.depth * 16; // 16px per depth level

  return (
    <>
      <div
        className={cn(
          "group w-full flex items-center px-2 py-1 text-sm transition-all duration-200",
          selectedMailbox === node.id
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted text-foreground",
          node.depth === 0 && "font-medium" // Root folders are slightly bolder
        )}
      >
        {/* Expand/Collapse Chevron */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className={cn(
              "p-0.5 rounded mr-1 transition-all duration-200",
              "hover:bg-muted active:bg-accent"
            )}
            style={{ marginLeft: indentPixels }}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
        )}

        {/* Mailbox Button */}
        <button
          onClick={() => onMailboxSelect?.(node.id)}
          className={cn(
            "flex-1 flex items-center text-left py-1 px-1 rounded",
            "transition-colors duration-150"
          )}
          style={{
            paddingLeft: hasChildren ? '4px' : `${indentPixels + 24}px`
          }}
          title={isCollapsed ? node.name : undefined}
        >
          <Icon className={cn(
            "w-4 h-4 mr-2 flex-shrink-0 transition-colors",
            hasChildren && isExpanded && "text-primary",
            selectedMailbox === node.id && "text-accent-foreground",
            !hasChildren && node.depth > 0 && "text-muted-foreground"
          )} />
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">{node.name}</span>
              {node.unreadEmails > 0 && (
                <span className={cn(
                  "text-xs rounded-full px-2 py-0.5 ml-2 font-medium",
                  selectedMailbox === node.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground text-background"
                )}>
                  {node.unreadEmails}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && !isCollapsed && (
        <div className="relative">
          {node.children.map((child) => (
            <MailboxTreeItem
              key={child.id}
              node={child}
              selectedMailbox={selectedMailbox}
              expandedFolders={expandedFolders}
              onMailboxSelect={onMailboxSelect}
              onToggleExpand={onToggleExpand}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function Sidebar({
  mailboxes = [],
  selectedMailbox = "",
  onMailboxSelect,
  onCompose,
  onLogout,
  onSearch,
  quota,
  className,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const t = useTranslations('sidebar');
  const params = useParams();

  // Load expanded folders from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('expandedMailboxes');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setExpandedFolders(new Set(parsed));
      } catch (e) {
        console.error('Failed to parse expanded mailboxes:', e);
      }
    } else {
      // By default, expand root folders that have children
      const tree = buildMailboxTree(mailboxes);
      const defaultExpanded = tree
        .filter(node => node.children.length > 0)
        .map(node => node.id);
      setExpandedFolders(new Set(defaultExpanded));
    }
  }, [mailboxes]);

  // Save expanded folders to localStorage when changed
  const handleToggleExpand = (mailboxId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(mailboxId)) {
        next.delete(mailboxId);
      } else {
        next.add(mailboxId);
      }
      localStorage.setItem('expandedMailboxes', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery);
    }
  };

  // Build hierarchical mailbox tree
  const mailboxTree = buildMailboxTree(mailboxes);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedMailbox || isCollapsed) return;

      // Find the selected node in the tree
      const findNode = (nodes: MailboxNode[]): MailboxNode | null => {
        for (const node of nodes) {
          if (node.id === selectedMailbox) return node;
          const found = findNode(node.children);
          if (found) return found;
        }
        return null;
      };

      const selectedNode = findNode(mailboxTree);
      if (!selectedNode) return;

      // Handle arrow keys for expand/collapse
      if (e.key === 'ArrowRight' && selectedNode.children.length > 0) {
        // Expand folder
        if (!expandedFolders.has(selectedMailbox)) {
          handleToggleExpand(selectedMailbox);
        }
      } else if (e.key === 'ArrowLeft' && selectedNode.children.length > 0) {
        // Collapse folder
        if (expandedFolders.has(selectedMailbox)) {
          handleToggleExpand(selectedMailbox);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMailbox, isCollapsed, expandedFolders, mailboxTree]);

  return (
    <div
      className={cn(
        "flex flex-col h-full border-r transition-all duration-300",
        "bg-secondary border-border",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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
            {t("compose")}
          </Button>
        )}
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-4 py-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </form>
        </div>
      )}

      {/* Mailbox List */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-1">
          {mailboxes.length === 0 ? (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              {!isCollapsed && t("loading_mailboxes")}
            </div>
          ) : (
            <>
              {/* Render hierarchical mailbox tree */}
              {mailboxTree.map((node) => (
                <MailboxTreeItem
                  key={node.id}
                  node={node}
                  selectedMailbox={selectedMailbox}
                  expandedFolders={expandedFolders}
                  onMailboxSelect={onMailboxSelect}
                  onToggleExpand={handleToggleExpand}
                  isCollapsed={isCollapsed}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <>
          {/* Storage Quota - Always visible */}
          {quota && quota.total > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("storage")}</span>
                <span className="text-foreground font-medium">
                  {formatFileSize(quota.used)} / {formatFileSize(quota.total)}
                </span>
              </div>
              <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((quota.used / quota.total) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Settings Panel - Sliding */}
          <div className={cn(
            "border-t border-border overflow-hidden transition-all duration-300",
            showSettings ? "max-h-96" : "max-h-0"
          )}>
            <div className="p-4 space-y-4 bg-muted/30">
              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  {theme === 'light' ? <Sun className="w-3.5 h-3.5" /> :
                   theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> :
                   <Monitor className="w-3.5 h-3.5" />}
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                      "border border-border",
                      theme === 'light'
                        ? "bg-accent border-primary"
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    <Sun className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs">{t("theme.light")}</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                      "border border-border",
                      theme === 'dark'
                        ? "bg-accent border-primary"
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    <Moon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs">{t("theme.dark")}</span>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                      "border border-border",
                      theme === 'system'
                        ? "bg-accent border-primary"
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs">{t("theme.system")}</span>
                  </button>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Language
                </label>
                <LanguageSwitcher />
              </div>

              {/* Logout Button */}
              {onLogout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="w-full justify-start hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("sign_out")}
                </Button>
              )}
            </div>
          </div>

          {/* Settings Toggle Button */}
          <div className="border-t border-border">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "w-full px-4 py-3 flex items-center justify-between",
                "hover:bg-muted transition-colors",
                "text-sm text-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {t("settings")}
              </span>
              <ChevronUp className={cn(
                "w-4 h-4 transition-transform duration-200",
                showSettings ? "" : "rotate-180"
              )} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}