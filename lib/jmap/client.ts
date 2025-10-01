import { JmapClient, Session } from "jmap-jam";
import type { Email, Mailbox, Thread, Identity } from "./types";

export class JMAPEmailClient {
  private client: JmapClient;
  private session: Session | null = null;

  constructor(serverUrl: string, username: string, password: string) {
    this.client = new JmapClient(serverUrl, {
      headers: {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      },
    });
  }

  async connect(): Promise<void> {
    this.session = await this.client.getSession();
    if (!this.session) {
      throw new Error("Failed to establish JMAP session");
    }
  }

  async getMailboxes(): Promise<Mailbox[]> {
    if (!this.session) throw new Error("Not connected");

    const accountId = this.session.primaryAccounts["urn:ietf:params:jmap:mail"];

    const response = await this.client.request([
      ["Mailbox/get", { accountId }, "0"],
    ]);

    return response[0][1].list as Mailbox[];
  }

  async getEmails(mailboxId?: string, limit: number = 50): Promise<Email[]> {
    if (!this.session) throw new Error("Not connected");

    const accountId = this.session.primaryAccounts["urn:ietf:params:jmap:mail"];

    const filter: any = {};
    if (mailboxId) {
      filter.inMailbox = mailboxId;
    }

    const response = await this.client.request([
      ["Email/query", {
        accountId,
        filter,
        sort: [{ property: "receivedAt", isAscending: false }],
        limit,
      }, "0"],
      ["Email/get", {
        accountId,
        "#ids": {
          resultOf: "0",
          name: "Email/query",
          path: "/ids",
        },
        properties: [
          "id", "threadId", "mailboxIds", "keywords", "size",
          "receivedAt", "from", "to", "cc", "subject", "preview",
          "hasAttachment",
        ],
      }, "1"],
    ]);

    return response[1][1].list as Email[];
  }

  async getEmail(emailId: string): Promise<Email | null> {
    if (!this.session) throw new Error("Not connected");

    const accountId = this.session.primaryAccounts["urn:ietf:params:jmap:mail"];

    const response = await this.client.request([
      ["Email/get", {
        accountId,
        ids: [emailId],
      }, "0"],
    ]);

    const emails = response[0][1].list as Email[];
    return emails[0] || null;
  }

  async markAsRead(emailId: string, read: boolean = true): Promise<void> {
    if (!this.session) throw new Error("Not connected");

    const accountId = this.session.primaryAccounts["urn:ietf:params:jmap:mail"];

    await this.client.request([
      ["Email/set", {
        accountId,
        update: {
          [emailId]: {
            keywords: {
              "$seen": read,
            },
          },
        },
      }, "0"],
    ]);
  }

  async moveEmail(emailId: string, toMailboxId: string): Promise<void> {
    if (!this.session) throw new Error("Not connected");

    const accountId = this.session.primaryAccounts["urn:ietf:params:jmap:mail"];

    await this.client.request([
      ["Email/set", {
        accountId,
        update: {
          [emailId]: {
            mailboxIds: {
              [toMailboxId]: true,
            },
          },
        },
      }, "0"],
    ]);
  }

  async deleteEmail(emailId: string): Promise<void> {
    if (!this.session) throw new Error("Not connected");

    const accountId = this.session.primaryAccounts["urn:ietf:params:jmap:mail"];

    await this.client.request([
      ["Email/set", {
        accountId,
        destroy: [emailId],
      }, "0"],
    ]);
  }

  async searchEmails(query: string, limit: number = 50): Promise<Email[]> {
    if (!this.session) throw new Error("Not connected");

    const accountId = this.session.primaryAccounts["urn:ietf:params:jmap:mail"];

    const response = await this.client.request([
      ["Email/query", {
        accountId,
        filter: {
          text: query,
        },
        sort: [{ property: "receivedAt", isAscending: false }],
        limit,
      }, "0"],
      ["Email/get", {
        accountId,
        "#ids": {
          resultOf: "0",
          name: "Email/query",
          path: "/ids",
        },
        properties: [
          "id", "threadId", "mailboxIds", "keywords", "size",
          "receivedAt", "from", "to", "cc", "subject", "preview",
          "hasAttachment",
        ],
      }, "1"],
    ]);

    return response[1][1].list as Email[];
  }

  async sendEmail(
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    attachments?: any[]
  ): Promise<void> {
    if (!this.session) throw new Error("Not connected");

    const accountId = this.session.primaryAccounts["urn:ietf:params:jmap:mail"];

    // Create email draft
    const emailCreate = {
      from: [{ email: this.session.username }],
      to: to.map(email => ({ email })),
      cc: cc?.map(email => ({ email })),
      bcc: bcc?.map(email => ({ email })),
      subject,
      textBody: [{ type: "text/plain", value: body }],
      htmlBody: [{ type: "text/html", value: body.replace(/\n/g, "<br>") }],
    };

    // Create and send email
    await this.client.request([
      ["Email/set", {
        accountId,
        create: {
          draft: emailCreate,
        },
      }, "0"],
      ["EmailSubmission/set", {
        accountId,
        create: {
          submission: {
            emailId: "#draft",
            envelope: {
              mailFrom: { email: this.session.username },
              rcptTo: [
                ...to.map(email => ({ email })),
                ...(cc || []).map(email => ({ email })),
                ...(bcc || []).map(email => ({ email })),
              ],
            },
          },
        },
      }, "1"],
    ]);
  }
}