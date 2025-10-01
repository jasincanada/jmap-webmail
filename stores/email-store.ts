import { create } from "zustand";
import { Email, Mailbox } from "@/lib/jmap/types";

interface EmailStore {
  emails: Email[];
  mailboxes: Mailbox[];
  selectedEmail: Email | null;
  selectedMailbox: string;
  isLoading: boolean;
  error: string | null;

  setEmails: (emails: Email[]) => void;
  setMailboxes: (mailboxes: Mailbox[]) => void;
  selectEmail: (email: Email | null) => void;
  selectMailbox: (mailboxId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Mock data for demo
  loadMockData: () => void;
}

export const useEmailStore = create<EmailStore>((set) => ({
  emails: [],
  mailboxes: [],
  selectedEmail: null,
  selectedMailbox: "inbox",
  isLoading: false,
  error: null,

  setEmails: (emails) => set({ emails }),
  setMailboxes: (mailboxes) => set({ mailboxes }),
  selectEmail: (email) => set({ selectedEmail: email }),
  selectMailbox: (mailboxId) => set({ selectedMailbox: mailboxId }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadMockData: () => {
    const mockEmails: Email[] = [
      {
        id: "1",
        threadId: "thread-1",
        mailboxIds: { inbox: true },
        keywords: { $seen: false },
        size: 1024,
        receivedAt: new Date().toISOString(),
        from: [{ name: "Alice Johnson", email: "alice@example.com" }],
        to: [{ email: "you@example.com" }],
        subject: "Q4 Budget Review Meeting",
        preview: "Hi team, I wanted to schedule a meeting to review our Q4 budget projections. Are you available this Thursday at 2 PM? We need to discuss...",
        hasAttachment: true,
      },
      {
        id: "2",
        threadId: "thread-2",
        mailboxIds: { inbox: true },
        keywords: { $seen: true, $flagged: true },
        size: 512,
        receivedAt: new Date(Date.now() - 3600000).toISOString(),
        from: [{ name: "Bob Smith", email: "bob@company.com" }],
        to: [{ email: "you@example.com" }],
        subject: "Re: Project Timeline Update",
        preview: "Thanks for the update. The new timeline looks good to me. I've reviewed the milestones and everything seems achievable...",
        hasAttachment: false,
      },
      {
        id: "3",
        threadId: "thread-3",
        mailboxIds: { inbox: true },
        keywords: { $seen: false },
        size: 2048,
        receivedAt: new Date(Date.now() - 7200000).toISOString(),
        from: [{ name: "Carol White", email: "carol@design.co" }],
        to: [{ email: "you@example.com" }],
        subject: "New Design Mockups Ready",
        preview: "Hey! The new mockups for the landing page are ready for review. I've incorporated all the feedback from last week's meeting...",
        hasAttachment: true,
      },
      {
        id: "4",
        threadId: "thread-4",
        mailboxIds: { inbox: true },
        keywords: { $seen: true },
        size: 768,
        receivedAt: new Date(Date.now() - 86400000).toISOString(),
        from: [{ name: "GitHub", email: "notifications@github.com" }],
        to: [{ email: "you@example.com" }],
        subject: "[PR] Feature: Add authentication module",
        preview: "A new pull request has been opened in your repository. This PR adds a comprehensive authentication module with OAuth support...",
        hasAttachment: false,
      },
      {
        id: "5",
        threadId: "thread-5",
        mailboxIds: { inbox: true },
        keywords: { $seen: true },
        size: 1536,
        receivedAt: new Date(Date.now() - 172800000).toISOString(),
        from: [{ name: "David Lee", email: "david@startup.io" }],
        to: [{ email: "you@example.com" }],
        subject: "Investment Proposal Discussion",
        preview: "Following up on our call yesterday, I'm sending over the investment proposal we discussed. The terms are quite favorable...",
        hasAttachment: true,
      },
    ];

    const mockMailboxes: Mailbox[] = [
      {
        id: "inbox",
        name: "Inbox",
        role: "inbox",
        sortOrder: 1,
        totalEmails: 5,
        unreadEmails: 2,
        totalThreads: 5,
        unreadThreads: 2,
        myRights: {
          mayReadItems: true,
          mayAddItems: true,
          mayRemoveItems: true,
          maySetSeen: true,
          maySetKeywords: true,
          mayCreateChild: true,
          mayRename: true,
          mayDelete: true,
          maySubmit: true,
        },
        isSubscribed: true,
      },
    ];

    set({
      emails: mockEmails,
      mailboxes: mockMailboxes,
    });
  },
}));