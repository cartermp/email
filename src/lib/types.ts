export interface JMAPSession {
  apiUrl: string;
  uploadUrl: string;
  accounts: Record<string, { name: string; isPersonal: boolean }>;
  primaryAccounts: Record<string, string>;
}

export interface Mailbox {
  id: string;
  name: string;
  role: string | null;
  totalEmails: number;
  unreadEmails: number;
  parentId: string | null;
  sortOrder: number;
}

export interface EmailAddress {
  name: string | null;
  email: string;
}

export interface EmailBodyPart {
  partId?: string;
  blobId?: string;
  size: number;
  type: string;
  charset?: string;
  name?: string;
}

export interface Email {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  subject: string | null;
  from: EmailAddress[] | null;
  to: EmailAddress[] | null;
  cc: EmailAddress[] | null;
  replyTo: EmailAddress[] | null;
  receivedAt: string;
  preview: string;
  bodyValues: Record<string, { value: string; charset: string; isEncodingProblem: boolean; isTruncated: boolean }>;
  htmlBody: EmailBodyPart[];
  textBody: EmailBodyPart[];
  attachments: EmailBodyPart[];
  hasAttachment: boolean;
  keywords: Record<string, boolean>;
  size: number;
}

export interface Identity {
  id: string;
  name: string;
  email: string;
  replyTo: EmailAddress[] | null;
  bcc: EmailAddress[] | null;
  textSignature: string;
  htmlSignature: string;
  mayDelete: boolean;
}
