import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Mailbox } from "./jmap/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Types for mailbox tree
export interface MailboxNode extends Mailbox {
  children: MailboxNode[];
  depth: number;
}

// Build a hierarchical tree structure from flat mailbox array
export function buildMailboxTree(mailboxes: Mailbox[]): MailboxNode[] {
  const mailboxMap = new Map<string, MailboxNode>();
  const rootMailboxes: MailboxNode[] = [];

  // First pass: create nodes for all mailboxes
  mailboxes.forEach(mailbox => {
    mailboxMap.set(mailbox.id, {
      ...mailbox,
      children: [],
      depth: 0
    });
  });

  // Second pass: build tree structure
  mailboxes.forEach(mailbox => {
    const node = mailboxMap.get(mailbox.id)!;

    if (mailbox.parentId && mailboxMap.has(mailbox.parentId)) {
      const parent = mailboxMap.get(mailbox.parentId)!;
      parent.children.push(node);
      node.depth = parent.depth + 1;
    } else {
      // Root level mailbox or orphaned mailbox
      rootMailboxes.push(node);
      node.depth = 0;
    }
  });

  // Sort mailboxes at each level by sortOrder
  const sortNodes = (nodes: MailboxNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(rootMailboxes);

  return rootMailboxes;
}

// Flatten a mailbox tree for rendering with proper depth info
export function flattenMailboxTree(nodes: MailboxNode[]): MailboxNode[] {
  const result: MailboxNode[] = [];

  const traverse = (nodes: MailboxNode[], depth: number = 0) => {
    nodes.forEach(node => {
      result.push({ ...node, depth });
      if (node.children.length > 0) {
        traverse(node.children, depth + 1);
      }
    });
  };

  traverse(nodes);
  return result;
}