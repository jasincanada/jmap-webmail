#!/usr/bin/env npx tsx
/**
 * Demo Email Seeding Script
 * Seeds alice@demo.root.cloud and bob@demo.root.cloud with realistic emails
 */

const JMAP_SERVER = 'https://mail.ma2t.com';
const PASSWORD = 'T5.6<ukm[pc!d2;B';

interface Account {
  email: string;
  password: string;
}

interface MailboxInfo {
  id: string;
  role: string | null;
  name: string;
}

interface SeedEmail {
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  subject: string;
  body: string;
  htmlBody?: string;
  receivedAt: Date;
  keywords?: Record<string, boolean>;
  mailboxRole: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';
  threadGroup?: string; // emails with same threadGroup will share a threadId
  inReplyTo?: string; // Message-ID of email being replied to
}

const ACCOUNTS: Account[] = [
  { email: 'alice@demo.root.cloud', password: PASSWORD },
  { email: 'bob@demo.root.cloud', password: PASSWORD },
];

// Helper to generate dates relative to now
function daysAgo(days: number, hours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d;
}

// Generate RFC5322 compliant Message-ID
function generateMessageId(domain: string): string {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `<${timestamp}.${random}@${domain}>`;
}

// Store message IDs for threading
const messageIds: Record<string, string> = {};

// Alice's emails
const ALICE_EMAILS: SeedEmail[] = [
  // Thread: Website Redesign (3 emails)
  {
    from: { name: 'Bob Developer', email: 'bob@demo.root.cloud' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Website Redesign - Final Review',
    body: `Hi Alice,

I've finished the final mockups for the website redesign.
Please review and let me know your thoughts.

Key changes:
- Updated color palette to match brand guidelines
- New navigation structure for better UX
- Mobile-first responsive approach
- Improved accessibility (WCAG 2.1 AA compliant)

The staging site is live at staging.demo.root.cloud

Best regards,
Bob`,
    receivedAt: daysAgo(2, 14),
    keywords: { '$seen': true, '$color:blue': true },
    mailboxRole: 'inbox',
    threadGroup: 'website-redesign',
  },
  {
    from: { name: 'Alice Marketing', email: 'alice@demo.root.cloud' },
    to: [{ name: 'Bob Developer', email: 'bob@demo.root.cloud' }],
    subject: 'Re: Website Redesign - Final Review',
    body: `Bob,

The mockups look great! I especially like the new navigation.

A few minor suggestions:
1. Can we make the CTA button more prominent?
2. The footer feels a bit heavy - maybe reduce the link count?
3. Love the new hero section!

Otherwise, ready to move forward with development.

Thanks,
Alice`,
    receivedAt: daysAgo(2, 8),
    keywords: { '$seen': true },
    mailboxRole: 'sent',
    threadGroup: 'website-redesign',
  },
  {
    from: { name: 'Bob Developer', email: 'bob@demo.root.cloud' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Re: Website Redesign - Final Review',
    body: `Good points! I'll make those adjustments:

1. CTA button - will increase size and add subtle animation
2. Footer - trimming to essential links only
3. Hero - glad you like it!

Should have the updates ready by end of day tomorrow.

Bob`,
    receivedAt: daysAgo(1, 16),
    keywords: { '$seen': false, '$color:blue': true },
    mailboxRole: 'inbox',
    threadGroup: 'website-redesign',
  },

  // Weekly Report (HTML email, flagged)
  {
    from: { name: 'Demo Notifications', email: 'notifications@demo.root.cloud' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Your Weekly Activity Report',
    body: 'Your weekly report is ready. View the full report at https://demo.root.cloud/reports',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
    .stat-value { font-size: 28px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Weekly Activity Report</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Dec 9 - Dec 15, 2024</p>
    </div>
    <div class="content">
      <p>Hi Alice, here's your activity summary for this week:</p>
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-value">12</div>
          <div class="stat-label">Emails Sent</div>
        </div>
        <div class="stat">
          <div class="stat-value">47</div>
          <div class="stat-label">Emails Received</div>
        </div>
        <div class="stat">
          <div class="stat-value">3</div>
          <div class="stat-label">Tasks Completed</div>
        </div>
      </div>
      <p><strong>Highlights:</strong></p>
      <ul>
        <li>Response time improved by 15%</li>
        <li>Zero unread emails older than 24 hours</li>
        <li>All priority items addressed</li>
      </ul>
      <center><a href="#" class="btn">View Full Report</a></center>
    </div>
    <div class="footer">
      <p>demo.root.cloud - Your Privacy-First Webmail</p>
      <p><a href="#">Unsubscribe</a> | <a href="#">Manage Preferences</a></p>
    </div>
  </div>
</body>
</html>`,
    receivedAt: daysAgo(0, 8),
    keywords: { '$seen': true, '$flagged': true },
    mailboxRole: 'inbox',
  },

  // API Question (unread, green tag)
  {
    from: { name: 'Bob Developer', email: 'bob@demo.root.cloud' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Quick question about the API',
    body: `Hey Alice,

The marketing team asked about our API rate limits for the new integration.

What's the current limit we're advertising to partners? I want to make sure the docs are accurate.

Also, are we still planning to increase limits in Q1?

Thanks!
Bob`,
    receivedAt: daysAgo(0, 4),
    keywords: { '$seen': false, '$color:green': true },
    mailboxRole: 'inbox',
  },

  // Partnership Proposal (external, orange tag)
  {
    from: { name: 'Diana Chen', email: 'diana@external-partner.com' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Partnership Proposal - Cloud Services Integration',
    body: `Dear Alice,

I hope this email finds you well. I'm reaching out from External Partner Inc. regarding a potential integration partnership.

We've been impressed with demo.root.cloud's webmail solution and believe there's a strong opportunity for collaboration.

Key points:
- Joint marketing initiatives
- API integration between our platforms
- Co-branded solutions for enterprise clients

Would you be available for a call next week to discuss further?

Best regards,
Diana Chen
VP of Business Development
External Partner Inc.`,
    receivedAt: daysAgo(1, 10),
    keywords: { '$seen': true, '$color:orange': true },
    mailboxRole: 'inbox',
  },

  // GitHub Security Alert
  {
    from: { name: 'GitHub', email: 'noreply@github.com' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: '[demo-webmail] Security alert: Dependabot detected a vulnerability',
    body: `Dependabot found a vulnerability in a dependency of your repository.

Repository: demo-root/demo-webmail
Severity: Medium
Package: lodash
Vulnerable versions: < 4.17.21
Patched version: 4.17.21

We recommend updating this dependency.

View this alert on GitHub: https://github.com/demo-root/demo-webmail/security/dependabot/1

Thanks,
The GitHub Team`,
    receivedAt: daysAgo(0, 12),
    keywords: { '$seen': true },
    mailboxRole: 'inbox',
  },

  // Simple casual email
  {
    from: { name: 'Bob Developer', email: 'bob@demo.root.cloud' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Lunch tomorrow?',
    body: `Hey Alice,

Want to grab lunch tomorrow? That new Thai place on Main St finally opened.

I heard their pad thai is amazing!

Bob`,
    receivedAt: daysAgo(0, 2),
    keywords: { '$seen': true },
    mailboxRole: 'inbox',
  },

  // Sent emails
  {
    from: { name: 'Alice Marketing', email: 'alice@demo.root.cloud' },
    to: [{ name: 'Bob Developer', email: 'bob@demo.root.cloud' }],
    subject: 'Re: Quick question about the API',
    body: `Bob,

Current rate limits:
- Basic tier: 1,000 requests/hour
- Pro tier: 10,000 requests/hour
- Enterprise: Custom limits

Yes, we're planning to increase all tiers by 50% in Q1.

Let me know if you need anything else for the docs!

Alice`,
    receivedAt: daysAgo(0, 3),
    keywords: { '$seen': true },
    mailboxRole: 'sent',
  },
  {
    from: { name: 'Alice Marketing', email: 'alice@demo.root.cloud' },
    to: [{ name: 'Team Demo', email: 'team@demo.root.cloud' }],
    subject: 'Q4 Planning Meeting - Thursday 2pm',
    body: `Hi Team,

Quick reminder about our Q4 planning meeting this Thursday at 2pm.

Agenda:
1. Review Q3 metrics
2. Discuss Q4 priorities
3. Budget allocation
4. New feature roadmap

Please come prepared with your department updates.

See you there!
Alice`,
    receivedAt: daysAgo(1, 6),
    keywords: { '$seen': true },
    mailboxRole: 'sent',
  },
  {
    from: { name: 'Alice Marketing', email: 'alice@demo.root.cloud' },
    to: [{ name: 'Diana Chen', email: 'diana@external-partner.com' }],
    subject: 'Re: Partnership Proposal - Cloud Services Integration',
    body: `Dear Diana,

Thank you for reaching out! Your proposal sounds very interesting.

I'd love to schedule a call to discuss this further. I'm available:
- Tuesday 10am-12pm
- Wednesday 2pm-4pm
- Thursday morning

Please let me know what works best for your schedule.

Looking forward to our conversation!

Best regards,
Alice`,
    receivedAt: daysAgo(1, 5),
    keywords: { '$seen': true },
    mailboxRole: 'sent',
  },

  // Drafts
  {
    from: { name: 'Alice Marketing', email: 'alice@demo.root.cloud' },
    to: [{ name: 'Bob Developer', email: 'bob@demo.root.cloud' }],
    subject: 'Project timeline update',
    body: `Bob,

Wanted to give you a quick update on the project timeline.

After reviewing with the team, we've decided to...`,
    receivedAt: daysAgo(0, 1),
    keywords: { '$seen': true, '$draft': true },
    mailboxRole: 'drafts',
  },
  {
    from: { name: 'Alice Marketing', email: 'alice@demo.root.cloud' },
    to: [],
    subject: 'Newsletter Draft - December Edition',
    body: '',
    htmlBody: `<h2>Monthly Newsletter - December 2024</h2>
<p>Dear valued customers,</p>
<p>As we wrap up another incredible year, we wanted to share some exciting updates...</p>
<ul>
  <li>New features launched</li>
  <li>Customer success stories</li>
  <li>What's coming in 2025</li>
</ul>`,
    receivedAt: daysAgo(0, 0.5),
    keywords: { '$seen': true, '$draft': true },
    mailboxRole: 'drafts',
  },

  // Archive
  {
    from: { name: 'Bob Developer', email: 'bob@demo.root.cloud' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Meeting notes from last week',
    body: `Alice,

Here are the meeting notes from our sync last week:

- Discussed Q3 results
- Reviewed marketing campaign performance
- Planned upcoming product launch

Action items are in the shared doc.

Bob`,
    receivedAt: daysAgo(7, 10),
    keywords: { '$seen': true },
    mailboxRole: 'archive',
  },
  {
    from: { name: 'Support Team', email: 'support@some-service.com' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Your support ticket #4521 has been resolved',
    body: `Hi Alice,

Your support ticket #4521 regarding "Login issues on mobile" has been resolved.

Resolution: The issue was related to a cached session. Clearing browser data resolved the problem.

If you have any further questions, please don't hesitate to reply to this email.

Best regards,
Support Team`,
    receivedAt: daysAgo(14, 3),
    keywords: { '$seen': true },
    mailboxRole: 'archive',
  },
];

// Bob's emails (mirrored conversations)
const BOB_EMAILS: SeedEmail[] = [
  // Received from Alice
  {
    from: { name: 'Alice Marketing', email: 'alice@demo.root.cloud' },
    to: [{ name: 'Bob Developer', email: 'bob@demo.root.cloud' }],
    subject: 'Re: Quick question about the API',
    body: `Bob,

Current rate limits:
- Basic tier: 1,000 requests/hour
- Pro tier: 10,000 requests/hour
- Enterprise: Custom limits

Yes, we're planning to increase all tiers by 50% in Q1.

Let me know if you need anything else for the docs!

Alice`,
    receivedAt: daysAgo(0, 3),
    keywords: { '$seen': true },
    mailboxRole: 'inbox',
  },
  {
    from: { name: 'Alice Marketing', email: 'alice@demo.root.cloud' },
    to: [{ name: 'Team Demo', email: 'team@demo.root.cloud' }],
    cc: [{ name: 'Bob Developer', email: 'bob@demo.root.cloud' }],
    subject: 'Q4 Planning Meeting - Thursday 2pm',
    body: `Hi Team,

Quick reminder about our Q4 planning meeting this Thursday at 2pm.

Agenda:
1. Review Q3 metrics
2. Discuss Q4 priorities
3. Budget allocation
4. New feature roadmap

Please come prepared with your department updates.

See you there!
Alice`,
    receivedAt: daysAgo(1, 6),
    keywords: { '$seen': false },
    mailboxRole: 'inbox',
  },

  // System notifications for Bob
  {
    from: { name: 'CI/CD System', email: 'notifications@demo.root.cloud' },
    to: [{ name: 'Bob Developer', email: 'bob@demo.root.cloud' }],
    subject: 'Build #142 successful - main branch',
    body: `Build completed successfully!

Branch: main
Commit: a1b2c3d - "Fix: responsive layout on mobile"
Duration: 3m 42s
Status: ✓ All tests passed (247 tests)

View build details: https://ci.demo.root.cloud/builds/142`,
    receivedAt: daysAgo(0, 6),
    keywords: { '$seen': true, '$color:green': true },
    mailboxRole: 'inbox',
  },
  {
    from: { name: 'GitHub', email: 'notifications@github.com' },
    to: [{ name: 'Bob Developer', email: 'bob@demo.root.cloud' }],
    subject: '[demo-webmail] Pull request #47 merged',
    body: `Pull request #47 has been merged into main.

Title: Add keyboard shortcuts support
Author: bob-developer
Merged by: alice-marketing

Files changed: 12
Additions: +847
Deletions: -23

View on GitHub: https://github.com/demo-root/demo-webmail/pull/47`,
    receivedAt: daysAgo(0, 10),
    keywords: { '$seen': true },
    mailboxRole: 'inbox',
  },

  // Thread from Alice
  {
    from: { name: 'Alice Marketing', email: 'alice@demo.root.cloud' },
    to: [{ name: 'Bob Developer', email: 'bob@demo.root.cloud' }],
    subject: 'Re: Website Redesign - Final Review',
    body: `Bob,

The mockups look great! I especially like the new navigation.

A few minor suggestions:
1. Can we make the CTA button more prominent?
2. The footer feels a bit heavy - maybe reduce the link count?
3. Love the new hero section!

Otherwise, ready to move forward with development.

Thanks,
Alice`,
    receivedAt: daysAgo(2, 8),
    keywords: { '$seen': true },
    mailboxRole: 'inbox',
    threadGroup: 'website-redesign-bob',
  },

  // Bob's sent emails
  {
    from: { name: 'Bob Developer', email: 'bob@demo.root.cloud' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Website Redesign - Final Review',
    body: `Hi Alice,

I've finished the final mockups for the website redesign.
Please review and let me know your thoughts.

Key changes:
- Updated color palette to match brand guidelines
- New navigation structure for better UX
- Mobile-first responsive approach
- Improved accessibility (WCAG 2.1 AA compliant)

The staging site is live at staging.demo.root.cloud

Best regards,
Bob`,
    receivedAt: daysAgo(2, 14),
    keywords: { '$seen': true },
    mailboxRole: 'sent',
    threadGroup: 'website-redesign-bob',
  },
  {
    from: { name: 'Bob Developer', email: 'bob@demo.root.cloud' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Re: Website Redesign - Final Review',
    body: `Good points! I'll make those adjustments:

1. CTA button - will increase size and add subtle animation
2. Footer - trimming to essential links only
3. Hero - glad you like it!

Should have the updates ready by end of day tomorrow.

Bob`,
    receivedAt: daysAgo(1, 16),
    keywords: { '$seen': true },
    mailboxRole: 'sent',
    threadGroup: 'website-redesign-bob',
  },
  {
    from: { name: 'Bob Developer', email: 'bob@demo.root.cloud' },
    to: [{ name: 'Alice Marketing', email: 'alice@demo.root.cloud' }],
    subject: 'Quick question about the API',
    body: `Hey Alice,

The marketing team asked about our API rate limits for the new integration.

What's the current limit we're advertising to partners? I want to make sure the docs are accurate.

Also, are we still planning to increase limits in Q1?

Thanks!
Bob`,
    receivedAt: daysAgo(0, 4),
    keywords: { '$seen': true },
    mailboxRole: 'sent',
  },
];

class JMAPSeeder {
  private serverUrl: string;
  private username: string;
  private password: string;
  private authHeader: string;
  private apiUrl: string = '';
  private accountId: string = '';
  private mailboxes: MailboxInfo[] = [];

  constructor(serverUrl: string, username: string, password: string) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  async connect(): Promise<void> {
    const sessionUrl = `${this.serverUrl}/.well-known/jmap`;

    const response = await fetch(sessionUrl, {
      method: 'GET',
      headers: { 'Authorization': this.authHeader },
    });

    if (!response.ok) {
      throw new Error(`Failed to connect: ${response.status} ${response.statusText}`);
    }

    const session = await response.json();
    this.apiUrl = session.apiUrl;
    this.accountId = session.primaryAccounts?.['urn:ietf:params:jmap:mail'];

    if (!this.accountId) {
      throw new Error('No mail account found');
    }

    console.log(`  Connected as ${this.username} (accountId: ${this.accountId})`);
  }

  private async request(methodCalls: unknown[]): Promise<unknown> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
        methodCalls,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed: ${response.status} - ${text}`);
    }

    return response.json();
  }

  async getMailboxes(): Promise<void> {
    const result = await this.request([
      ['Mailbox/get', { accountId: this.accountId }, '0'],
    ]) as { methodResponses: [string, { list: MailboxInfo[] }, string][] };

    this.mailboxes = result.methodResponses[0][1].list;
    console.log(`  Found ${this.mailboxes.length} mailboxes`);
  }

  getMailboxId(role: string): string {
    const mailbox = this.mailboxes.find(m => m.role === role);
    if (!mailbox) {
      // Try finding by name as fallback
      const byName = this.mailboxes.find(m =>
        m.name.toLowerCase() === role.toLowerCase() ||
        m.name.toLowerCase() === role + 's' // drafts vs draft
      );
      if (byName) return byName.id;
      throw new Error(`Mailbox with role "${role}" not found`);
    }
    return mailbox.id;
  }

  async createEmail(email: SeedEmail): Promise<void> {
    const mailboxId = this.getMailboxId(email.mailboxRole);

    // Build email address strings (prefixed with _ as they're used in RFC822 format below)
    const _fromStr = email.from.name
      ? `"${email.from.name}" <${email.from.email}>`
      : email.from.email;

    const _toStr = email.to.map(t =>
      t.name ? `"${t.name}" <${t.email}>` : t.email
    ).join(', ');

    const _ccStr = email.cc?.map(c =>
      c.name ? `"${c.name}" <${c.email}>` : c.email
    ).join(', ');

    // Generate message ID
    const domain = email.from.email.split('@')[1];
    const msgId = generateMessageId(domain);

    // Store for threading
    if (email.threadGroup) {
      if (!messageIds[email.threadGroup]) {
        messageIds[email.threadGroup] = msgId;
      }
    }

    // Build email object for JMAP
    const emailData: Record<string, unknown> = {
      mailboxIds: { [mailboxId]: true },
      keywords: email.keywords || {},
      from: [{ name: email.from.name, email: email.from.email }],
      to: email.to.map(t => ({ name: t.name, email: t.email })),
      subject: email.subject,
      receivedAt: email.receivedAt.toISOString(),
      bodyValues: {
        '1': { value: email.body },
      },
    };

    // Add CC if present
    if (email.cc && email.cc.length > 0) {
      emailData.cc = email.cc.map(c => ({ name: c.name, email: c.email }));
    }

    // Add HTML body if present
    if (email.htmlBody) {
      emailData.bodyValues = {
        '1': { value: email.body },
        '2': { value: email.htmlBody },
      };
      emailData.textBody = [{ partId: '1', type: 'text/plain' }];
      emailData.htmlBody = [{ partId: '2', type: 'text/html' }];
    } else {
      emailData.textBody = [{ partId: '1', type: 'text/plain' }];
    }

    // Create the email
    const result = await this.request([
      ['Email/set', {
        accountId: this.accountId,
        create: { 'new': emailData },
      }, '0'],
    ]) as { methodResponses: [string, { created?: Record<string, { id: string }>, notCreated?: Record<string, { type: string, description?: string }> }, string][] };

    const response = result.methodResponses[0][1];
    if (response.notCreated) {
      const error = response.notCreated['new'];
      throw new Error(`Failed to create email: ${error.type} - ${error.description || ''}`);
    }

    console.log(`    ✓ Created: "${email.subject.substring(0, 50)}..."`);
  }

  async seed(emails: SeedEmail[]): Promise<void> {
    console.log(`  Seeding ${emails.length} emails...`);

    for (const email of emails) {
      try {
        await this.createEmail(email);
      } catch (error) {
        console.error(`    ✗ Failed: "${email.subject}" - ${error}`);
      }
    }
  }
}

async function main(): Promise<void> {
  console.log('🌱 Demo Email Seeding Script');
  console.log('============================\n');

  for (const account of ACCOUNTS) {
    console.log(`\n📧 Processing ${account.email}...`);

    try {
      const seeder = new JMAPSeeder(JMAP_SERVER, account.email, account.password);
      await seeder.connect();
      await seeder.getMailboxes();

      const emails = account.email.startsWith('alice') ? ALICE_EMAILS : BOB_EMAILS;
      await seeder.seed(emails);

      console.log(`  ✅ Done with ${account.email}`);
    } catch (error) {
      console.error(`  ❌ Error with ${account.email}:`, error);
    }
  }

  console.log('\n============================');
  console.log('✨ Seeding complete!');
}

main().catch(console.error);
