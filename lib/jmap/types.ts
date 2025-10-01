export interface Email {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords: Record<string, boolean>;
  size: number;
  receivedAt: string;
  from?: EmailAddress[];
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];
  subject?: string;
  sentAt?: string;
  preview?: string;
  textBody?: EmailBodyPart[];
  htmlBody?: EmailBodyPart[];
  bodyValues?: Record<string, EmailBodyValue>;
  attachments?: Attachment[];
  hasAttachment: boolean;
  // Extended header information
  messageId?: string;
  inReplyTo?: string[];
  references?: string[];
  headers?: Record<string, string | string[]>;
  // Security headers parsed
  authenticationResults?: AuthenticationResults;
  spamScore?: number;
  spamStatus?: string;
}

export interface AuthenticationResults {
  spf?: {
    result: 'pass' | 'fail' | 'softfail' | 'neutral' | 'none' | 'temperror' | 'permerror';
    domain?: string;
    ip?: string;
  };
  dkim?: {
    result: 'pass' | 'fail' | 'policy' | 'neutral' | 'temperror' | 'permerror';
    domain?: string;
    selector?: string;
  };
  dmarc?: {
    result: 'pass' | 'fail' | 'none';
    policy?: 'reject' | 'quarantine' | 'none';
    domain?: string;
  };
  iprev?: {
    result: 'pass' | 'fail';
    ip?: string;
  };
}

export interface EmailBodyValue {
  value: string;
  isEncodingProblem?: boolean;
  isTruncated?: boolean;
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailBodyPart {
  partId: string;
  blobId: string;
  size: number;
  name?: string;
  type: string;
  charset?: string;
  disposition?: string;
  cid?: string;
  language?: string[];
  location?: string;
  subParts?: EmailBodyPart[];
}

export interface Attachment {
  partId: string;
  blobId: string;
  size: number;
  name?: string;
  type: string;
  charset?: string;
  cid?: string;
  disposition?: string;
}

export interface Mailbox {
  id: string;
  name: string;
  parentId?: string;
  role?: string;
  sortOrder: number;
  totalEmails: number;
  unreadEmails: number;
  totalThreads: number;
  unreadThreads: number;
  myRights: {
    mayReadItems: boolean;
    mayAddItems: boolean;
    mayRemoveItems: boolean;
    maySetSeen: boolean;
    maySetKeywords: boolean;
    mayCreateChild: boolean;
    mayRename: boolean;
    mayDelete: boolean;
    maySubmit: boolean;
  };
  isSubscribed: boolean;
}

export interface Thread {
  id: string;
  emailIds: string[];
}

export interface Identity {
  id: string;
  name: string;
  email: string;
  replyTo?: EmailAddress[];
  bcc?: EmailAddress[];
  textSignature?: string;
  htmlSignature?: string;
  mayDelete: boolean;
}

export interface EmailSubmission {
  id: string;
  identityId: string;
  emailId: string;
  threadId?: string;
  envelope: {
    mailFrom: EmailAddress;
    rcptTo: EmailAddress[];
  };
  sendAt?: string;
  undoStatus: "pending" | "final" | "canceled";
  deliveryStatus?: Record<string, DeliveryStatus>;
  dsnBlobIds?: string[];
  mdnBlobIds?: string[];
}

export interface DeliveryStatus {
  smtpReply: string;
  delivered: "queued" | "yes" | "no" | "unknown";
  displayed: "unknown" | "yes";
}