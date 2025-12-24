#!/usr/bin/env npx tsx
/**
 * Inject a test HTML email into the mailbox via JMAP
 * Usage: npx tsx scripts/inject-test-email.ts
 *
 * Requires: JMAP_URL, JMAP_USER, JMAP_PASS environment variables
 * Or create a .env.local file with these values
 */

import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const JMAP_URL = process.env.JMAP_URL || process.env.NEXT_PUBLIC_JMAP_URL;
const JMAP_USER = process.env.JMAP_USER;
const JMAP_PASS = process.env.JMAP_PASS;

if (!JMAP_URL || !JMAP_USER || !JMAP_PASS) {
  console.error('Missing required environment variables: JMAP_URL, JMAP_USER, JMAP_PASS');
  console.error('Set them in .env.local or as environment variables');
  process.exit(1);
}

// NYTimes Morning newsletter sample HTML
const htmlContent = `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>The Morning: Wind farms</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style type="text/css">body{margin:0;padding:0}table,td{border-collapse:collapse}</style></head><body><div style="display:none;font-size:1px;color:#fff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">Plus, a weight loss pill, Planned Parenthood and Sydney Sweeney.</div><div><table width="100%" align="left" border="0" style="margin:0" bgcolor="#FFFFFF"><tbody><tr><td align="left" width="100%"><div style="margin:0 auto;max-width:600px;width:100%"><table border="0" cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td style="padding:15px 0 5px;text-align:center;width:100%"><div style="font-family:arial,sans-serif;font-size:12px;text-align:center;width:100%;padding-bottom:10px"><a title="View in browser" href="#" style="color:#666;text-decoration:none;line-height:18px">View in browser</a><span style="color:#dcdcdc;margin:0 10px">|</span><a title="The New York Times" href="https://www.nytimes.com/" style="color:#666;text-decoration:none;line-height:18px">nytimes.com</a></div></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td style="border-top:1px solid #dcdcdc"></td></tr><tr><td style="padding:8px 0 0;width:100%;text-align:center"><div style="margin-bottom:7px"><img src="https://static01.nyt.com/email-images/newsletters/padded-logos/TheMorning.png" alt="The Morning" width="300" style="width:300px"></div><div style="width:100%;margin-bottom:31px;font:12px/12px georgia,serif">December 23, 2025</div></td></tr><tr><td style="border-bottom:1px solid #dcdcdc"></td></tr><tr><td height="20"></td></tr></tbody></table><div style="margin:0 auto;max-width:600px;width:100%"><table style="width:100%" cellpadding="0"><tbody><tr><td style="padding:0 9px 0 0;box-sizing:content-box;vertical-align:middle;width:45px" width="45" valign="middle"><img src="https://static01.nyt.com/images/2018/06/21/multimedia/author-sam-sifton/author-sam-sifton-blogSmallThumb-v2.png" alt="Author Headshot" style="width:45px;height:45px;border-radius:100%" width="45" height="45"></td><td style="padding:0;box-sizing:content-box;vertical-align:middle" valign="middle"><p style="font:13px/18px arial,sans-serif;letter-spacing:.2px;color:#000;font:600 13px/18px arial,sans-serif;margin-bottom:3px">By <a href="#" style="text-decoration:none;border-bottom:1px solid #ccc;color:inherit">Sam Sifton</a></p></td></tr><tr><td height="15"></td></tr></tbody></table></div><p style="display:block;color:#333;font:400 18.5px/26px georgia,serif;margin:0 0 10px"><span>Good morning. This is a test email to verify HTML rendering width.</span></p><table border="0" cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td height="20"></td></tr><tr><td height="14" width="100%" style="background-color:#000;font-size:0;line-height:0"></td></tr><tr><td height="20"></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td style="text-align:center"><img width="500" height="333" style="display:inline-block;width:83%;max-width:500px;height:auto;padding-top:10px;padding-bottom:0;line-height:0" src="https://static01.nyt.com/images/2025/12/23/multimedia/23themorning-nl-LEADv2-03-hgtz/23themorning-nl-LEADv2-03-hgtz-jumbo.jpg" alt="Four offshore wind turbines."></td></tr><tr><td style="text-align:center;width:100%;padding-top:6px;padding-bottom:20px;line-height:12px"><span style="width:83%;max-width:500px;display:inline-block;text-align:left"><span style="color:#666;font:normal 12px georgia,serif">Off the coast of Rhode Island. </span><span style="margin:0;font:11px/11px georgia,serif;color:#888;letter-spacing:.01em;padding-left:5px">Lucy Lu for The New York Times</span></span></td></tr></tbody></table><h1 style="color:#000;font:700 31px/34px georgia,serif;margin:0 0 10px"><span>Without evidence</span></h1><p style="font:normal 17px/25px georgia,serif;color:#333;margin:0 0 15px"><span>President Trump doesn't like wind farms. Never has. He thinks they're ugly. He calls them inefficient and expensive. Years ago, he failed to stop the construction of one that's visible from one of his golf courses in Scotland.</span></p><p style="font:normal 17px/25px georgia,serif;color:#333;margin:0 0 15px"><span>On his first day in office this year, Trump stopped new wind projects on public lands and waters. A judge called that order "arbitrary" and said it violated federal law.</span></p><table border="0" cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td height="30"></td></tr><td style="padding:0;font-size:0;border-top:14px solid #000"><h3 style="color:#000;font:700 17px/25px arial,sans-serif;margin:5px 0 30px 0;letter-spacing:.2px"><span style="font-weight:700">THE LATEST NEWS</span></h3></td></tbody></table><p style="padding-bottom:10px;font:700 17px/15px arial,sans-serif;color:#000;margin:0">China</p><div style="margin:0 auto;max-width:600px;width:100%"><table><tbody><tr><td style="padding:0 0 5px"><ul style="color:#333;font:10px georgia,serif;text-align:left;padding-left:50px"><li style="margin:0 0 10px 0;line-height:27.5px"><span style="font:normal 17px/25px georgia,serif;vertical-align:middle">The Pentagon and American A.I. companies share a weakness: They both desperately need China's batteries.</span></li><li style="margin:0 0 10px 0;line-height:27.5px"><span style="font:normal 17px/25px georgia,serif;vertical-align:middle">The Trump administration banned sales of foreign-made drones, including a popular brand from China.</span></li></ul></td></tr></tbody></table></div><table border="0" cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td height="30"></td></tr><td style="padding:0;font-size:0;border-top:14px solid #000"><h3 style="color:#000;font:700 17px/25px arial,sans-serif;margin:5px 0 30px 0;letter-spacing:.2px"><span style="font-weight:700">GAMES</span></h3></td></tbody></table><table border="0" cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td style="text-align:center"><a href="https://www.nytimes.com/puzzles/spelling-bee"><img width="500" height="222" style="display:inline-block;width:83%;max-width:500px;height:auto;padding-top:10px;padding-bottom:20px;line-height:0" src="https://static01.nyt.com/images/2025/12/23/multimedia/23morning-bee/23morning-bee-jumbo.png" alt="Spelling Bee"></a></td></tr></tbody></table><p style="font:normal 17px/25px georgia,serif;color:#333;margin:0 0 15px"><span>Here is today's Spelling Bee. Yesterday's pangrams were clunked and knuckled.</span></p><table width="100%"><tbody><tr><td style="padding-bottom:15px"></td></tr><tr><td style="border-top:1px solid #dcdcdc;padding-bottom:15px"></td></tr></tbody></table><p style="font:normal 17px/25px georgia,serif;color:#333;margin:0 0 15px"><span style="font-style:italic;font-weight:700">Thanks for spending part of your morning with The Times. - Sam</span></p><table border="0" cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td style="border-top:1px solid #dcdcdc;padding:20px 0"><img width="100%" style="display:block" src="https://static.nytimes.com/email-images/morning-briefing/us/morning-briefing-footer-credit-logo.png" alt="The Morning Newsletter Logo"></td></tr><tr><td style="padding:0 0 30px"><p style="font:400 12px/18px arial,sans-serif;color:#333;letter-spacing:0;margin:0"><span style="font:700 12px/18px arial,sans-serif">Host:</span> Sam Sifton</p></td></tr></tbody></table><table><tbody><tr><td style="border-top:1px solid #dcdcdc;padding:10px 0 30px"><p style="color:#999;font:12px/15px arial,sans-serif;margin:0">The New York Times Company. 620 Eighth Avenue New York, NY 10018</p></td></tr></tbody></table></div></td></tr></tbody></table></div></body></html>`;

async function main() {
  console.log('Connecting to JMAP server...');

  // Get session
  const authHeader = 'Basic ' + Buffer.from(`${JMAP_USER}:${JMAP_PASS}`).toString('base64');

  const sessionRes = await fetch(JMAP_URL!, {
    headers: { 'Authorization': authHeader }
  });

  if (!sessionRes.ok) {
    throw new Error(`Failed to get session: ${sessionRes.status}`);
  }

  const session = await sessionRes.json();
  const accountId = Object.keys(session.accounts)[0];
  const apiUrl = session.apiUrl;

  console.log(`Connected as account: ${accountId}`);

  // Get inbox mailbox
  const mailboxRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls: [
        ['Mailbox/get', { accountId }, '0']
      ]
    })
  });

  const mailboxData = await mailboxRes.json();
  const mailboxes = mailboxData.methodResponses[0][1].list;
  const inbox = mailboxes.find((mb: { role: string }) => mb.role === 'inbox');

  if (!inbox) {
    throw new Error('No inbox found');
  }

  console.log(`Found inbox: ${inbox.id}`);

  // Create the test email
  const emailId = `test-${Date.now()}`;

  const createRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls: [
        ['Email/set', {
          accountId,
          create: {
            [emailId]: {
              from: [{ name: 'The New York Times', email: 'nytdirect@nytimes.com' }],
              to: [{ email: JMAP_USER }],
              subject: 'The Morning: Wind farms (TEST - HTML Width)',
              receivedAt: new Date().toISOString(),
              keywords: {},
              mailboxIds: { [inbox.id]: true },
              bodyValues: {
                'html': { value: htmlContent }
              },
              htmlBody: [{ partId: 'html', type: 'text/html' }]
            }
          }
        }, '0']
      ]
    })
  });

  const result = await createRes.json();

  if (result.methodResponses[0][1].created?.[emailId]) {
    console.log('Test email injected successfully!');
    console.log('Email ID:', result.methodResponses[0][1].created[emailId].id);
  } else {
    console.error('Failed to create email:', JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
