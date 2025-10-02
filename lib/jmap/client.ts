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
    // Get the session first
    const sessionUrl = `${this.serverUrl}/.well-known/jmap`;

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

      // Store the full session for reference
      this.session = session;

      // Extract and store capabilities
      this.capabilities = session.capabilities || {};

      // Extract the API URL
      this.apiUrl = session.apiUrl;

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
  }

  private stopKeepAlive(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
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
    } else {
      throw new Error('Ping failed');
    }
  }

  async reconnect(): Promise<void> {
    await this.connect();
  }

  disconnect(): void {
    this.stopKeepAlive();
    this.apiUrl = "";
    this.accountId = "";
    this.session = null;
    this.capabilities = {};
  }

  private async request(methodCalls: any[]): Promise<any> {
    if (!this.apiUrl) {
      throw new Error('Not connected. Call connect() first.');
    }

    const requestBody = {
      using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      methodCalls: methodCalls,
    };

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

        // Map and ensure all required fields are present
        const mailboxes = rawMailboxes.map((mb: any) => {
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
      // Build filter - only add inMailbox if we have a mailboxId
      const filter: any = {};
      if (mailboxId && mailboxId !== '') {
        filter.inMailbox = mailboxId;
      }

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

      if (response.methodResponses?.[1]?.[0] === "Email/get") {
        const emails = response.methodResponses[1][1].list || [];
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

    const emailId = `draft-${Date.now()}`;

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
      emailData.attachments = attachments.map(att => ({
        blobId: att.blobId,
        type: att.type,
        name: att.name,
        disposition: "attachment",
      }));
    }

    // If updating an existing draft, destroy it first then create new one
    // This is simpler than trying to update individual fields
    const methodCalls: any[] = [];

    if (draftId) {
      // Delete old draft
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        destroy: [draftId],
      }, "0"]);

      // Create new draft
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        create: {
          [emailId]: emailData
        },
      }, "1"]);
    } else {
      // Just create new draft
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        create: {
          [emailId]: emailData
        },
      }, "0"]);
    }

    const response = await this.request(methodCalls);

    console.log('Draft save response:', JSON.stringify(response, null, 2));

    // If we're updating (destroy + create), check the second response
    // Otherwise check the first response
    const responseIndex = draftId ? 1 : 0;

    if (response.methodResponses?.[responseIndex]?.[0] === "Email/set") {
      const result = response.methodResponses[responseIndex][1];

      // Check for errors
      if (result.notCreated || result.notUpdated) {
        const errors = result.notCreated || result.notUpdated;
        const firstError = Object.values(errors)[0] as any;
        console.error('Draft save error:', firstError);
        throw new Error(firstError.description || firstError.type || 'Failed to save draft');
      }

      if (result.created?.[emailId]) {
        console.log('Draft created successfully:', result.created[emailId].id);
        return result.created[emailId].id;
      }
    }

    console.error('Unexpected draft save response:', response);
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

    // Find the Sent mailbox
    const mailboxes = await this.getMailboxes();
    const sentMailbox = mailboxes.find(mb => mb.role === 'sent');

    if (!sentMailbox) {
      throw new Error('No sent mailbox found');
    }

    // Get the identity ID - fetch identities from server
    const identityResponse = await this.request([
      ["Identity/get", {
        accountId: this.accountId,
      }, "0"]
    ]);

    let identityId = this.accountId; // fallback

    if (identityResponse.methodResponses?.[0]?.[0] === "Identity/get") {
      const identities = identityResponse.methodResponses[0][1].list || [];

      if (identities.length > 0) {
        // Use the first identity (or find one matching the username)
        const matchingIdentity = identities.find((id: any) => id.email === this.username);
        identityId = matchingIdentity?.id || identities[0].id;
      }
    }

    const methodCalls: any[] = [];

    // If we have a draftId, update it and remove draft keyword, move to Sent
    // Otherwise, create a new email in Sent
    if (draftId) {
      methodCalls.push(["Email/set", {
        accountId: this.accountId,
        update: {
          [draftId]: {
            "keywords/$draft": false,
            mailboxIds: { [sentMailbox.id]: true },
          },
        },
      }, "0"]);
      methodCalls.push(["EmailSubmission/set", {
        accountId: this.accountId,
        create: {
          "1": {
            emailId: draftId,
            identityId: identityId,
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
            mailboxIds: { [sentMailbox.id]: true },
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
            identityId: identityId,
          },
        },
      }, "1"]);
    }

    const response = await this.request(methodCalls);

    // Check for errors in the response
    if (response.methodResponses) {
      for (const [methodName, result] of response.methodResponses) {
        if (methodName.endsWith('/error')) {
          console.error('JMAP method error:', result);
          throw new Error(result.description || `Failed to send email: ${result.type}`);
        }

        // Check for notCreated/notUpdated
        if (result.notCreated || result.notUpdated) {
          const errors = result.notCreated || result.notUpdated;
          const firstError = Object.values(errors)[0] as any;
          console.error('Email send error:', firstError);
          throw new Error(firstError.description || firstError.type || 'Failed to send email');
        }
      }
    }
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
    console.log('Uploading file to:', finalUploadUrl);
    console.log('File info:', { name: file.name, size: file.size, type: file.type });

    const response = await fetch(finalUploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file, // Send the file directly as binary
    });

    console.log('Upload response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed:', errorText);
      throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Upload response body:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Parsed upload response:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('Failed to parse upload response as JSON:', responseText);
      throw new Error('Invalid JSON response from upload');
    }

    // Try different response formats
    // Format 1: Direct response { blobId, type, size }
    if (result.blobId) {
      console.log('Using direct response format');
      return {
        blobId: result.blobId,
        size: result.size || file.size,
        type: result.type || file.type,
      };
    }

    // Format 2: Nested under accountId { accountId: { blobId, type, size } }
    const blobInfo = result[this.accountId];
    if (blobInfo && blobInfo.blobId) {
      console.log('Using accountId-nested response format');
      return {
        blobId: blobInfo.blobId,
        size: blobInfo.size || file.size,
        type: blobInfo.type || file.type,
      };
    }

    // If neither format works, show what we got
    console.error('Unexpected upload response format:', result);
    throw new Error('Invalid upload response: blobId not found');
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