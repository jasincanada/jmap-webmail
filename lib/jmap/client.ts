import type { Email, Mailbox } from "./types";

export class JMAPClient {
  private serverUrl: string;
  private username: string;
  private password: string;
  private authHeader: string;
  private apiUrl: string = "";
  private accountId: string = "";
  private downloadUrl: string = "";
  private capabilities: Record<string, any> = {};
  private session: any = null;
  private lastPingTime: number = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(serverUrl: string, username: string, password: string) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.authHeader = `Basic ${btoa(`${username}:${password}`)}`;
  }

  async connect(): Promise<void> {
    console.log('FinalJMAPClient: Connecting to', this.serverUrl);

    // Get the session first
    const sessionUrl = `${this.serverUrl}/.well-known/jmap`;
    console.log('Fetching session from:', sessionUrl);

    try {
      const sessionResponse = await fetch(sessionUrl, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
        },
      });

      if (!sessionResponse.ok) {
        if (sessionResponse.status === 401) {
          throw new Error('Invalid username or password');
        }
        throw new Error(`Failed to get session: ${sessionResponse.status}`);
      }

      const session = await sessionResponse.json();
      console.log('Session:', session);

      // Store the full session for reference
      this.session = session;

      // Extract and store capabilities
      this.capabilities = session.capabilities || {};
      console.log('Server capabilities:', Object.keys(this.capabilities));

      // Extract the API URL
      this.apiUrl = session.apiUrl;
      console.log('API URL:', this.apiUrl);

      // Extract the download URL
      this.downloadUrl = session.downloadUrl;

      // Extract the account ID
      const mailAccount = session.primaryAccounts?.["urn:ietf:params:jmap:mail"];
      if (mailAccount) {
        this.accountId = mailAccount;
      } else {
        // Try to find any account
        const accounts = session.accounts;
        if (accounts && Object.keys(accounts).length > 0) {
          this.accountId = Object.keys(accounts)[0];
        } else {
          throw new Error('No mail account found in session');
        }
      }

      console.log('Account ID:', this.accountId);

      // Start keep-alive mechanism
      this.startKeepAlive();
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  private startKeepAlive(): void {
    // Stop any existing interval
    this.stopKeepAlive();

    // Ping every 30 seconds to keep the connection alive
    const PING_INTERVAL = 30000; // 30 seconds

    this.pingInterval = setInterval(async () => {
      try {
        await this.ping();
      } catch (error) {
        console.error('Keep-alive ping failed:', error);
        // If ping fails, try to reconnect
        try {
          await this.reconnect();
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError);
        }
      }
    }, PING_INTERVAL);

    console.log('Keep-alive mechanism started (ping every 30s)');
  }

  private stopKeepAlive(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      console.log('Keep-alive mechanism stopped');
    }
  }

  async ping(): Promise<void> {
    if (!this.apiUrl) {
      throw new Error('Not connected');
    }

    const now = Date.now();

    // Use Echo method for lightweight ping
    const response = await this.request([
      ["Core/echo", { ping: "pong" }, "0"]
    ]);

    if (response.methodResponses?.[0]?.[0] === "Core/echo") {
      this.lastPingTime = now;
      console.log('Keep-alive ping successful');
    } else {
      throw new Error('Ping failed');
    }
  }

  async reconnect(): Promise<void> {
    console.log('Attempting to reconnect...');
    await this.connect();
  }

  disconnect(): void {
    this.stopKeepAlive();
    this.apiUrl = "";
    this.accountId = "";
    this.session = null;
    this.capabilities = {};
    console.log('Disconnected from JMAP server');
  }

  private async request(methodCalls: any[]): Promise<any> {
    if (!this.apiUrl) {
      throw new Error('Not connected. Call connect() first.');
    }

    const requestBody = {
      using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      methodCalls: methodCalls,
    };

    console.log('Making request to:', this.apiUrl);
    console.log('Request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Request failed:', response.status, responseText);
      throw new Error(`Request failed: ${response.status} - ${responseText.substring(0, 200)}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      throw new Error('Invalid JSON response from server');
    }

    console.log('Response:', data);
    return data;
  }

  async getQuota(): Promise<{ used: number; total: number } | null> {
    try {
      const response = await this.request([
        ["Quota/get", {
          accountId: this.accountId,
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Quota/get") {
        const quotas = response.methodResponses[0][1].list || [];
        // Find the mail quota if it exists
        const mailQuota = quotas.find((q: any) => q.resourceType === "mail" || q.scope === "mail");

        if (mailQuota) {
          return {
            used: mailQuota.used ?? 0,
            total: mailQuota.hardLimit ?? mailQuota.limit ?? 0
          };
        }
      }

      return null;
    } catch (error) {
      console.log('Quota not available or not supported:', error);
      return null;
    }
  }

  async getMailboxes(): Promise<Mailbox[]> {
    try {
      const response = await this.request([
        ["Mailbox/get", {
          accountId: this.accountId,
        }, "0"]
      ]);

      if (response.methodResponses?.[0]?.[0] === "Mailbox/get") {
        const rawMailboxes = response.methodResponses[0][1].list || [];
        console.log(`Got ${rawMailboxes.length} mailboxes`);

        // Map and ensure all required fields are present
        const mailboxes = rawMailboxes.map((mb: any) => {
          console.log(`Mailbox: ${mb.name} (ID: ${mb.id}, Role: ${mb.role}, Emails: ${mb.totalEmails}, Unread: ${mb.unreadEmails})`);

          return {
            id: mb.id,
            name: mb.name,
            parentId: mb.parentId || undefined,
            role: mb.role || undefined,
            sortOrder: mb.sortOrder ?? 0,
            totalEmails: mb.totalEmails ?? 0,
            unreadEmails: mb.unreadEmails ?? 0,
            totalThreads: mb.totalThreads ?? 0,
            unreadThreads: mb.unreadThreads ?? 0,
            myRights: mb.myRights || {
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
            isSubscribed: mb.isSubscribed ?? true,
          } as Mailbox;
        });

        return mailboxes;
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Failed to get mailboxes:', error);
      // Return default inbox with all required fields
      return [{
        id: 'INBOX',
        name: 'Inbox',
        role: 'inbox',
        sortOrder: 0,
        totalEmails: 0,
        unreadEmails: 0,
        totalThreads: 0,
        unreadThreads: 0,
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
      }] as Mailbox[];
    }
  }

  async getEmails(mailboxId?: string, limit: number = 50): Promise<Email[]> {
    try {
      console.log(`Fetching emails for mailbox: ${mailboxId || 'all'}`);

      // Build filter - only add inMailbox if we have a mailboxId
      const filter: any = {};
      if (mailboxId && mailboxId !== '') {
        filter.inMailbox = mailboxId;
      }

      console.log('Email filter:', JSON.stringify(filter));

      const response = await this.request([
        ["Email/query", {
          accountId: this.accountId,
          filter: filter,
          sort: [{ property: "receivedAt", isAscending: false }],
          limit: limit,
        }, "0"],
        ["Email/get", {
          accountId: this.accountId,
          "#ids": {
            resultOf: "0",
            name: "Email/query",
            path: "/ids",
          },
          properties: [
            "id",
            "threadId",
            "mailboxIds",
            "keywords",
            "size",
            "receivedAt",
            "from",
            "to",
            "cc",
            "subject",
            "preview",
            "hasAttachment",
          ],
        }, "1"],
      ]);

      // Log query results
      if (response.methodResponses?.[0]?.[0] === "Email/query") {
        const queryResult = response.methodResponses[0][1];
        console.log(`Email/query returned ${queryResult.total} total, ${queryResult.ids?.length || 0} ids`);
      }

      if (response.methodResponses?.[1]?.[0] === "Email/get") {
        const emails = response.methodResponses[1][1].list || [];
        console.log(`Got ${emails.length} emails from Email/get`);

        // Log first few emails for debugging
        emails.slice(0, 3).forEach((email: any) => {
          console.log(`Email: "${email.subject}" from ${email.from?.[0]?.email || 'unknown'}`);
        });

        return emails;
      }

      console.warn('Unexpected email response format');
      return [];
    } catch (error) {
      console.error('Failed to get emails:', error);
      return [];
    }
  }

  async getEmail(emailId: string): Promise<Email | null> {
    try {
      const response = await this.request([
        ["Email/get", {
          accountId: this.accountId,
          ids: [emailId],
          properties: [
            "id",
            "threadId",
            "mailboxIds",
            "keywords",
            "size",
            "receivedAt",
            "sentAt",
            "from",
            "to",
            "cc",
            "bcc",
            "replyTo",
            "subject",
            "preview",
            "textBody",
            "htmlBody",
            "bodyValues",
            "hasAttachment",
            "attachments",
            "messageId",
            "inReplyTo",
            "references",
            "headers",
          ],
          fetchTextBodyValues: true,
          fetchHTMLBodyValues: true,
          fetchAllBodyValues: true,
          maxBodyValueBytes: 256000,
        }, "0"],
      ]);

      if (response.methodResponses?.[0]?.[0] === "Email/get") {
        const emails = response.methodResponses[0][1].list || [];
        const email = emails[0];

        if (email) {
          // Parse headers if available
          if (email.headers) {
            // Import the parsing functions
            const { parseAuthenticationResults, parseSpamScore } = await import('@/lib/email-headers');

            // Parse Authentication-Results header
            const authResultsHeader = email.headers['Authentication-Results'];
            if (authResultsHeader) {
              const headerValue = Array.isArray(authResultsHeader) ? authResultsHeader[0] : authResultsHeader;
              email.authenticationResults = parseAuthenticationResults(headerValue);
            }

            // Parse Spam headers
            const spamHeaders = ['X-Spam-Status', 'X-Spam-Result', 'X-Rspamd-Score'];
            for (const header of spamHeaders) {
              if (email.headers[header]) {
                const headerValue = Array.isArray(email.headers[header]) ? email.headers[header][0] : email.headers[header];
                const spamResult = parseSpamScore(headerValue);
                if (spamResult) {
                  email.spamScore = spamResult.score;
                  email.spamStatus = spamResult.status;
                  break;
                }
              }
            }
          }

          return email;
        }

        return null;
      }

      return null;
    } catch (error) {
      console.error('Failed to get email:', error);
      return null;
    }
  }

  async markAsRead(emailId: string, read: boolean = true): Promise<void> {
    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: {
          [emailId]: {
            "keywords/$seen": read,
          },
        },
      }, "0"],
    ]);
  }

  async batchMarkAsRead(emailIds: string[], read: boolean = true): Promise<void> {
    if (emailIds.length === 0) return;

    const updates: Record<string, any> = {};
    emailIds.forEach(id => {
      updates[id] = {
        "keywords/$seen": read,
      };
    });

    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: updates,
      }, "0"],
    ]);
  }

  async toggleStar(emailId: string, starred: boolean): Promise<void> {
    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: {
          [emailId]: {
            "keywords/$flagged": starred,
          },
        },
      }, "0"],
    ]);
  }

  async updateEmailKeywords(emailId: string, keywords: Record<string, boolean>): Promise<void> {
    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: {
          [emailId]: {
            keywords,
          },
        },
      }, "0"],
    ]);
  }

  async deleteEmail(emailId: string): Promise<void> {
    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        destroy: [emailId],
      }, "0"],
    ]);
  }

  async batchDeleteEmails(emailIds: string[]): Promise<void> {
    if (emailIds.length === 0) return;

    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        destroy: emailIds,
      }, "0"],
    ]);
  }

  async batchMoveEmails(emailIds: string[], toMailboxId: string): Promise<void> {
    if (emailIds.length === 0) return;

    const updates: Record<string, any> = {};
    emailIds.forEach(id => {
      updates[id] = {
        mailboxIds: { [toMailboxId]: true },
      };
    });

    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: updates,
      }, "0"],
    ]);
  }

  async moveEmail(emailId: string, toMailboxId: string): Promise<void> {
    await this.request([
      ["Email/set", {
        accountId: this.accountId,
        update: {
          [emailId]: {
            mailboxIds: { [toMailboxId]: true },
          },
        },
      }, "0"],
    ]);
  }

  async searchEmails(query: string, limit: number = 50): Promise<Email[]> {
    try {
      const response = await this.request([
        ["Email/query", {
          accountId: this.accountId,
          filter: {
            text: query,
          },
          sort: [{ property: "receivedAt", isAscending: false }],
          limit: limit,
        }, "0"],
        ["Email/get", {
          accountId: this.accountId,
          "#ids": {
            resultOf: "0",
            name: "Email/query",
            path: "/ids",
          },
          properties: [
            "id",
            "threadId",
            "mailboxIds",
            "keywords",
            "size",
            "receivedAt",
            "from",
            "to",
            "cc",
            "subject",
            "preview",
            "hasAttachment",
          ],
        }, "1"],
      ]);

      if (response.methodResponses?.[1]?.[0] === "Email/get") {
        return response.methodResponses[1][1].list || [];
      }

      return [];
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  async createDraft(
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    draftId?: string,
    attachments?: Array<{ blobId: string; name: string; type: string; size: number }>
  ): Promise<string> {
    // Find the drafts mailbox
    const mailboxes = await this.getMailboxes();
    const draftsMailbox = mailboxes.find(mb => mb.role === 'drafts');

    if (!draftsMailbox) {
      throw new Error('No drafts mailbox found');
    }

    const emailId = draftId || `draft-${Date.now()}`;

    // Build email object with attachments if provided
    const emailData: any = {
      from: [{ email: this.username }],
      to: to.map(email => ({ email })),
      cc: cc?.map(email => ({ email })),
      bcc: bcc?.map(email => ({ email })),
      subject: subject,
      keywords: { "$draft": true },
      mailboxIds: { [draftsMailbox.id]: true },
      bodyValues: {
        "1": {
          value: body,
        },
      },
      textBody: [
        {
          partId: "1",
        },
      ],
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments.map((att, index) => ({
        blobId: att.blobId,
        type: att.type,
        name: att.name,
        size: att.size,
        disposition: "attachment",
        partId: `att-${index}`,
      }));
    }

    const response = await this.request([
      ["Email/set", {
        accountId: this.accountId,
        [draftId ? 'update' : 'create']: draftId ? {
          [draftId]: emailData
        } : {
          [emailId]: emailData
        },
      }, "0"],
    ]);

    // Extract the created/updated email ID
    if (response.methodResponses?.[0]?.[0] === "Email/set") {
      const result = response.methodResponses[0][1];
      if (draftId && result.updated?.[draftId]) {
        return draftId;
      } else if (result.created?.[emailId]) {
        return result.created[emailId].id;
      }
    }

    throw new Error('Failed to save draft');
  }

  async sendEmail(
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    draftId?: string
  ): Promise<void> {
    const emailId = draftId || `draft-${Date.now()}`;

    const methodCalls: any[] = [];

    // If we have a draftId, update it and remove draft keyword
    // Otherwise, create a new email
    if (draftId) {
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        update: {
          [draftId]: {
            "keywords/$draft": false,
          },
        },
      }, "0"]);
      methodCalls.push(["EmailSubmission/set", {
        accountId: this.accountId,
        create: {
          "1": {
            emailId: draftId,
          },
        },
      }, "1"]);
    } else {
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        create: {
          [emailId]: {
            from: [{ email: this.username }],
            to: to.map(email => ({ email })),
            cc: cc?.map(email => ({ email })),
            bcc: bcc?.map(email => ({ email })),
            subject: subject,
            keywords: {},
            mailboxIds: {},
            bodyValues: {
              "1": {
                value: body,
              },
            },
            textBody: [
              {
                partId: "1",
              },
            ],
          },
        },
      }, "0"]);
      methodCalls.push(["EmailSubmission/set", {
        accountId: this.accountId,
        create: {
          "1": {
            emailId: `#${emailId}`,
          },
        },
      }, "1"]);
    }

    await this.request(methodCalls);
  }

  async uploadBlob(file: File): Promise<{ blobId: string; size: number; type: string }> {
    if (!this.session) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Get upload URL from session
    const uploadUrl = this.session.uploadUrl;
    if (!uploadUrl) {
      throw new Error('Upload URL not available');
    }

    // Replace accountId in the upload URL
    const finalUploadUrl = uploadUrl.replace('{accountId}', encodeURIComponent(this.accountId));

    // Create FormData with the file
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(finalUploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
      },
      body: file, // Send the file directly as binary
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.status}`);
    }

    const result = await response.json();

    // Response should contain accountId -> blobId mapping
    const blobInfo = result[this.accountId];

    if (!blobInfo || !blobInfo.blobId) {
      throw new Error('Invalid upload response');
    }

    return {
      blobId: blobInfo.blobId,
      size: blobInfo.size || file.size,
      type: blobInfo.type || file.type,
    };
  }

  getBlobDownloadUrl(blobId: string, name?: string, type?: string): string {
    if (!this.downloadUrl) {
      throw new Error('Download URL not available. Please reconnect.');
    }

    // The downloadUrl is a URI Template (RFC 6570 level 1) with variables
    // like {accountId}, {blobId}, {name}, and {type}
    let url = this.downloadUrl;

    // Replace template variables with actual values
    url = url.replace('{accountId}', encodeURIComponent(this.accountId));
    url = url.replace('{blobId}', encodeURIComponent(blobId));

    // Replace {name} - use a default if not provided
    const fileName = name || 'download';
    url = url.replace('{name}', encodeURIComponent(fileName));

    // Replace {type} - URL encode it since it may contain slashes (e.g., "application/pdf")
    // If type is not provided, use a generic binary type
    const mimeType = type || 'application/octet-stream';
    url = url.replace('{type}', encodeURIComponent(mimeType));

    return url;
  }

  // Capability checking methods
  getCapabilities(): Record<string, any> {
    return this.capabilities;
  }

  hasCapability(capability: string): boolean {
    return capability in this.capabilities;
  }

  getMaxSizeUpload(): number {
    const coreCapability = this.capabilities["urn:ietf:params:jmap:core"];
    return coreCapability?.maxSizeUpload || 0;
  }

  getMaxCallsInRequest(): number {
    const coreCapability = this.capabilities["urn:ietf:params:jmap:core"];
    return coreCapability?.maxCallsInRequest || 50;
  }

  getEventSourceUrl(): string | null {
    const session = this.session;
    if (!session?.capabilities?.["urn:ietf:params:jmap:core"]?.eventSourceUrl) {
      return null;
    }
    return session.capabilities["urn:ietf:params:jmap:core"].eventSourceUrl;
  }

  supportsEmailSubmission(): boolean {
    return this.hasCapability("urn:ietf:params:jmap:submission");
  }

  supportsQuota(): boolean {
    return this.hasCapability("urn:ietf:params:jmap:quota");
  }

  supportsVacationResponse(): boolean {
    return this.hasCapability("urn:ietf:params:jmap:vacationresponse");
  }

  async downloadBlob(blobId: string, name?: string, type?: string): Promise<void> {
    const url = this.getBlobDownloadUrl(blobId, name, type);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': this.authHeader,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.status}`);
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const blobUrl = URL.createObjectURL(blob);

      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name || 'download';
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      throw error;
    }
  }
}