# UX & Robustness Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add iframe-based email rendering for CSS isolation, API retry logic, mobile action bar + long-press, and 6 UX polish features (tag sidebar, empty folder, extra-compact density, security tooltips, resizable sidebars, sender info panel).

**Architecture:** Features are independent — each task modifies distinct files with no cross-dependencies. P0 tasks (1-3) are core improvements; P1 tasks (4-9) are polish. All features follow existing patterns: Zustand stores, next-intl translations, Tailwind styling, Vitest tests.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Zustand 5, next-intl 4, DOMPurify, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-16-ux-robustness-improvements-design.md`

---

## Chunk 1: P0 Core Improvements

### Task 1: needsIframeRendering() detection function

**Files:**
- Modify: `lib/email-sanitization.ts`
- Modify: `lib/__tests__/email-sanitization.test.ts`

- [ ] **Step 1: Write failing tests for needsIframeRendering()**

Add to `lib/__tests__/email-sanitization.test.ts`:

```typescript
import {
  sanitizeEmailHtml,
  sanitizeSignatureHtml,
  parseHtmlSafely,
  hasRichFormatting,
  needsIframeRendering,
} from '../email-sanitization';

describe('needsIframeRendering', () => {
  it('returns true for HTML with table tags', () => {
    expect(needsIframeRendering('<table><tr><td>Cell</td></tr></table>')).toBe(true);
  });

  it('returns true for HTML with style tags', () => {
    expect(needsIframeRendering('<style>body { color: red; }</style><p>Text</p>')).toBe(true);
  });

  it('returns true for HTML with background in inline styles', () => {
    expect(needsIframeRendering('<div style="background: url(img.png)">Content</div>')).toBe(true);
  });

  it('returns true for HTML with background-image in inline styles', () => {
    expect(needsIframeRendering('<td style="background-image: url(bg.jpg)">Cell</td>')).toBe(true);
  });

  it('returns true for HTML with link tags', () => {
    expect(needsIframeRendering('<link rel="stylesheet" href="style.css"><p>Text</p>')).toBe(true);
  });

  it('returns false for plain text converted to HTML', () => {
    expect(needsIframeRendering('<br>Hello world<br>How are you?')).toBe(false);
  });

  it('returns false for simple formatting tags', () => {
    expect(needsIframeRendering('<p><b>Bold</b> and <i>italic</i> text</p>')).toBe(false);
  });

  it('returns false for blockquotes', () => {
    expect(needsIframeRendering('<blockquote>Quoted text</blockquote>')).toBe(false);
  });

  it('returns false for lists', () => {
    expect(needsIframeRendering('<ul><li>Item 1</li><li>Item 2</li></ul>')).toBe(false);
  });

  it('returns false for headings', () => {
    expect(needsIframeRendering('<h1>Title</h1><p>Body</p>')).toBe(false);
  });

  it('returns false for simple inline styles without background', () => {
    expect(needsIframeRendering('<p style="color: red; font-size: 14px">Text</p>')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(needsIframeRendering('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx vitest run lib/__tests__/email-sanitization.test.ts`
Expected: FAIL — `needsIframeRendering` is not exported

- [ ] **Step 3: Implement needsIframeRendering()**

Add to `lib/email-sanitization.ts` after `hasRichFormatting()`:

```typescript
/**
 * Detect if HTML content needs iframe rendering for CSS isolation.
 * More narrow than hasRichFormatting() — only triggers on patterns
 * that can cause CSS bleed into the host app:
 * - table layouts (newsletter-style)
 * - style blocks (global CSS rules)
 * - link tags (external stylesheets)
 * - background/background-image in inline styles (complex rendering)
 */
export function needsIframeRendering(html: string): boolean {
  if (!html) return false;
  const doc = parseHtmlSafely(html);
  if (doc.querySelector('table, style, link[rel="stylesheet"]')) return true;
  const allElements = doc.querySelectorAll('[style]');
  for (const el of allElements) {
    const style = (el as HTMLElement).style;
    if (style.background && style.background.includes('url(')) return true;
    if (style.backgroundImage && style.backgroundImage !== '') return true;
  }
  return false;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx vitest run lib/__tests__/email-sanitization.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add lib/email-sanitization.ts lib/__tests__/email-sanitization.test.ts
git commit -m "feat: add needsIframeRendering() for CSS isolation routing"
```

---

### Task 2: Sandboxed iframe email rendering component

**Files:**
- Create: `components/email/sandboxed-email-frame.tsx`
- Modify: `lib/color-transform.ts`

- [ ] **Step 1: Add generateIframeStylesheet() to color-transform.ts**

Add at the end of `lib/color-transform.ts`:

```typescript
/**
 * Generate a style block for iframe-rendered emails.
 * Uses prefers-color-scheme for native dark mode adaptation
 * instead of inline style transforms.
 */
export function generateIframeStylesheet(): string {
  return `
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        word-wrap: break-word;
        overflow-wrap: break-word;
        color: #1e293b;
        background: #ffffff;
      }
      img { max-width: 100%; height: auto; }
      table { max-width: 100%; }
      a { color: #3b82f6; }
      pre, code { white-space: pre-wrap; word-wrap: break-word; }
      @media (prefers-color-scheme: dark) {
        body {
          color: #e2e8f0;
          background: #1e1f26;
        }
        a { color: #60a5fa; }
        img { opacity: 0.9; }
      }
    </style>
  `;
}
```

- [ ] **Step 2: Create sandboxed-email-frame.tsx**

Create `components/email/sandboxed-email-frame.tsx`:

```tsx
"use client";

import { useRef, useEffect, useCallback } from "react";
import { generateIframeStylesheet } from "@/lib/color-transform";

interface SandboxedEmailFrameProps {
  html: string;
  className?: string;
}

function wrapHtmlForIframe(sanitizedHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${generateIframeStylesheet()}
</head>
<body>${sanitizedHtml}</body>
</html>`;
}

export function SandboxedEmailFrame({ html, className }: SandboxedEmailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const updateHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;
    const height = iframe.contentDocument.body.scrollHeight;
    iframe.style.height = `${height + 16}px`;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      updateHeight();

      const doc = iframe.contentDocument;
      if (!doc?.body) return;

      const observer = new ResizeObserver(updateHeight);
      observer.observe(doc.body);

      doc.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor?.href) {
          e.preventDefault();
          window.open(anchor.href, '_blank', 'noopener,noreferrer');
        }
      });

      return () => observer.disconnect();
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [html, updateHeight]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      srcDoc={wrapHtmlForIframe(html)}
      className={className}
      style={{
        width: '100%',
        border: 'none',
        overflow: 'hidden',
        minHeight: '100px',
      }}
      title="Email content"
    />
  );
}
```

- [ ] **Step 3: Run lint and typecheck**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/email/sandboxed-email-frame.tsx lib/color-transform.ts
git commit -m "feat: add SandboxedEmailFrame component with dark mode support"
```

---

### Task 3: Integrate iframe rendering into email viewer + thread view

**Files:**
- Modify: `components/email/email-viewer.tsx`
- Modify: `components/email/thread-conversation-view.tsx`
- Modify: `proxy.ts`

- [ ] **Step 1: Update CSP in proxy.ts**

In `proxy.ts`, change line 24 from `frame-src 'none'` to `frame-src 'self'`.

- [ ] **Step 2: Integrate iframe routing in email-viewer.tsx**

In `components/email/email-viewer.tsx`:

1. Add imports at the top:
```typescript
import { needsIframeRendering } from "@/lib/email-sanitization";
import { SandboxedEmailFrame } from "./sandboxed-email-frame";
```

2. In the `emailContent` useMemo, after the sanitization block that produces `cleanHtml` (around line 504), modify the return to include a rendering hint:
```typescript
return {
  html: cleanHtml,
  isHtml: true,
  useIframe: needsIframeRendering(htmlContent),
};
```

3. In the JSX where email content is rendered (find the div with email-content class that uses the sanitized HTML), wrap with conditional:
```tsx
{emailContent.isHtml && emailContent.useIframe ? (
  <SandboxedEmailFrame html={emailContent.html} className="w-full" />
) : (
  /* existing div rendering path — keep exactly as-is */
)}
```

Note: The existing div path uses DOMPurify-sanitized content. This is safe because DOMPurify strips all dangerous content before rendering. The iframe path also receives DOMPurify-sanitized content — it adds CSS isolation, not additional security.

- [ ] **Step 3: Apply same routing in thread-conversation-view.tsx**

Add the same imports and conditional rendering pattern in `thread-conversation-view.tsx` where email HTML content is rendered. The pattern is identical — check `needsIframeRendering()` on the raw HTML before sanitization, pass as flag, render conditionally.

- [ ] **Step 4: Run lint, typecheck, and existing tests**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint && npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add components/email/email-viewer.tsx components/email/thread-conversation-view.tsx proxy.ts
git commit -m "feat: route rich HTML emails to sandboxed iframe for CSS isolation"
```

---

### Task 4: API retry with exponential backoff

**Files:**
- Create: `lib/jmap/retry.ts`
- Create: `lib/__tests__/jmap-retry.test.ts`
- Modify: `lib/jmap/client.ts`

- [ ] **Step 1: Write failing tests for retry logic**

Create `lib/__tests__/jmap-retry.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from '../jmap/retry';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    const result = await retryWithBackoff(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(200);
  });

  it('retries on 503 and succeeds', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const promise = retryWithBackoff(fn);
    await vi.advanceTimersByTimeAsync(700);
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
  });

  it('retries on 429 and succeeds', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const promise = retryWithBackoff(fn);
    await vi.advanceTimersByTimeAsync(700);
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
  });

  it('retries on TypeError (network failure)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const promise = retryWithBackoff(fn);
    await vi.advanceTimersByTimeAsync(700);
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
  });

  it('does NOT retry on 400', async () => {
    const fn = vi.fn().mockResolvedValue(new Response('bad', { status: 400 }));
    const result = await retryWithBackoff(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(400);
  });

  it('does NOT retry on 401', async () => {
    const fn = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    const result = await retryWithBackoff(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(401);
  });

  it('gives up after max retries', async () => {
    const fn = vi.fn().mockResolvedValue(new Response('', { status: 503 }));

    const promise = retryWithBackoff(fn, { maxRetries: 3 });
    // Advance through all retry delays (with jitter margin)
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(3000);
    }
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    expect(result.status).toBe(503);
  });

  it('respects Retry-After header on 429', async () => {
    const headers = new Headers({ 'Retry-After': '2' });
    const fn = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers }))
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const promise = retryWithBackoff(fn);
    await vi.advanceTimersByTimeAsync(2500);
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
  });

  it('respects AbortSignal', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockResolvedValue(new Response('', { status: 503 }));

    controller.abort();
    await expect(
      retryWithBackoff(fn, { signal: controller.signal })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx vitest run lib/__tests__/jmap-retry.test.ts`
Expected: FAIL — module `../jmap/retry` does not exist

- [ ] **Step 3: Implement retry utility**

Create `lib/jmap/retry.ts`:

```typescript
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  signal?: AbortSignal;
}

export async function retryWithBackoff(
  fn: () => Promise<Response>,
  options: RetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelay = 500, signal } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const response = await fn();

      if (attempt < maxRetries && RETRYABLE_STATUS_CODES.has(response.status)) {
        let delay: number;
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelay * Math.pow(2, attempt);
        } else {
          delay = baseDelay * Math.pow(2, attempt);
        }
        const jitter = delay * (0.8 + Math.random() * 0.4);
        await new Promise(resolve => setTimeout(resolve, jitter));
        continue;
      }

      return response;
    } catch (error) {
      if (error instanceof TypeError && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = delay * (0.8 + Math.random() * 0.4);
        await new Promise(resolve => setTimeout(resolve, jitter));
        continue;
      }
      throw error;
    }
  }

  return fn();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx vitest run lib/__tests__/jmap-retry.test.ts`
Expected: ALL PASS (some timing-sensitive tests may need timer advance adjustment due to jitter — if so, increase advances by 50%)

- [ ] **Step 5: Integrate retry into authenticatedFetch()**

Modify `lib/jmap/client.ts`:

1. Add import at top:
```typescript
import { retryWithBackoff } from './retry';
```

2. Add `retry` option to `authenticatedFetch` signature:
```typescript
private async authenticatedFetch(
  url: string,
  init?: Parameters<typeof fetch>[1],
  options?: { retry?: boolean }
): Promise<Response> {
```

3. Wrap the fetch call with retry when `options?.retry !== false`:
```typescript
const doFetch = () => fetch(url, { ...init, headers });

let response: Response;
if (options?.retry !== false) {
  response = await retryWithBackoff(doFetch, {
    signal: init?.signal as AbortSignal | undefined,
  });
} else {
  response = await doFetch();
}
```

4. Keep existing 401 token refresh logic after the fetch/retry block.

5. Find `downloadBlob`, `uploadBlob`, and `buildStatePollingRequest` methods — add `{ retry: false }` as the third argument to their `authenticatedFetch` calls.

- [ ] **Step 6: Run full test suite**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add lib/jmap/retry.ts lib/__tests__/jmap-retry.test.ts lib/jmap/client.ts
git commit -m "feat: add exponential backoff retry for JMAP API requests"
```

---

### Task 5: Mobile bottom action bar

**Files:**
- Create: `components/email/mobile-action-bar.tsx`
- Modify: `components/email/email-viewer.tsx`
- Modify: `locales/en/common.json` (+ 7 other locale files)

- [ ] **Step 1: Add i18n keys to English locale**

Add to `locales/en/common.json` under `email_viewer`:
```json
"mobile_actions": {
  "reply": "Reply",
  "reply_all": "Reply All",
  "archive": "Archive",
  "delete": "Delete",
  "more": "More",
  "forward": "Forward",
  "move_to": "Move to...",
  "star": "Star",
  "mark_unread": "Mark as unread",
  "spam": "Report spam"
}
```

- [ ] **Step 2: Add i18n keys to all other 7 locale files**

Add equivalent translated keys to `fr`, `ja`, `es`, `it`, `de`, `nl`, `pt` locale files. Maintain existing key structure. Use appropriate translations for each language.

- [ ] **Step 3: Create mobile-action-bar.tsx**

Create `components/email/mobile-action-bar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Reply, ReplyAll, Archive, Trash2, MoreHorizontal, Forward, FolderInput, Star, MailOpen, ShieldAlert, X } from "lucide-react";

interface MobileActionBarProps {
  onReply: () => void;
  onReplyAll: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onForward: () => void;
  onMoveTo: () => void;
  onStar: () => void;
  onMarkUnread: () => void;
  onSpam: () => void;
  isStarred?: boolean;
}

export function MobileActionBar({
  onReply, onReplyAll, onArchive, onDelete,
  onForward, onMoveTo, onStar, onMarkUnread, onSpam,
}: MobileActionBarProps) {
  const t = useTranslations('email_viewer.mobile_actions');
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowMore(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowMore(false)}
        />
      )}

      {showMore && (
        <div
          className="fixed bottom-14 left-0 right-0 z-50 bg-background border-t border-border rounded-t-xl shadow-lg"
          role="menu"
          aria-label={t('more')}
        >
          <div className="p-2 space-y-1">
            {[
              { icon: Forward, label: t('forward'), action: onForward },
              { icon: FolderInput, label: t('move_to'), action: onMoveTo },
              { icon: Star, label: t('star'), action: onStar },
              { icon: MailOpen, label: t('mark_unread'), action: onMarkUnread },
              { icon: ShieldAlert, label: t('spam'), action: onSpam },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg hover:bg-accent text-foreground"
                onClick={() => { action(); setShowMore(false); }}
                role="menuitem"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                {label}
              </button>
            ))}
          </div>
          <button
            className="flex items-center justify-center w-full py-3 border-t border-border text-muted-foreground"
            onClick={() => setShowMore(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-background border-t border-border h-14 flex items-center justify-around px-2"
        role="toolbar"
        aria-label="Email actions"
      >
        {[
          { icon: Reply, label: t('reply'), action: onReply },
          { icon: ReplyAll, label: t('reply_all'), action: onReplyAll },
          { icon: Archive, label: t('archive'), action: onArchive },
          { icon: Trash2, label: t('delete'), action: onDelete },
          { icon: MoreHorizontal, label: t('more'), action: () => setShowMore(prev => !prev) },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-foreground"
            onClick={action}
            aria-label={label}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Integrate into email-viewer.tsx**

In `components/email/email-viewer.tsx`:
1. Import `MobileActionBar`
2. At the bottom of the viewer component JSX, add the bar component
3. Wire existing handler functions (handleReply, handleReplyAll, handleArchive, handleDelete, handleForward, handleStar, handleMarkUnread, handleSpam) — verify these exist in the component, create wrappers if needed

- [ ] **Step 5: Run lint and typecheck**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/email/mobile-action-bar.tsx components/email/email-viewer.tsx locales/*/common.json
git commit -m "feat: add mobile bottom action bar for email viewer"
```

---

### Task 6: Long-press context menu + touch fix for context menus

**Files:**
- Create: `hooks/use-long-press.ts`
- Modify: `components/email/email-list-item.tsx`
- Modify: `components/ui/context-menu.tsx`

- [ ] **Step 1: Create use-long-press hook**

Create `hooks/use-long-press.ts`:

```typescript
import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  delay?: number;
  onLongPress: (e: React.TouchEvent) => void;
  moveThreshold?: number;
}

export function useLongPress({ delay = 300, onLongPress, moveThreshold = 10 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const triggered = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (targetRef.current) {
      targetRef.current.style.transform = '';
      targetRef.current = null;
    }
    triggered.current = false;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    targetRef.current = e.currentTarget as HTMLElement;
    triggered.current = false;

    timerRef.current = setTimeout(() => {
      triggered.current = true;
      if (targetRef.current) {
        targetRef.current.style.transform = '';
      }
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      onLongPress(e);
    }, delay);

    if (targetRef.current) {
      targetRef.current.style.transform = 'scale(0.98)';
    }
  }, [delay, onLongPress]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPos.current.x);
    const dy = Math.abs(touch.clientY - startPos.current.y);
    if (dx > moveThreshold || dy > moveThreshold) {
      clear();
    }
  }, [moveThreshold, clear]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (triggered.current) {
      e.preventDefault();
    }
    clear();
  }, [clear]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
```

- [ ] **Step 2: Add long-press to email-list-item.tsx**

In `components/email/email-list-item.tsx`:

1. Import the hook:
```typescript
import { useLongPress } from "@/hooks/use-long-press";
```

2. Inside the `EmailListItem` component, add:
```typescript
const longPressHandlers = useLongPress({
  onLongPress: (e) => {
    if (onContextMenu) {
      const touch = e.touches?.[0] || e.changedTouches?.[0];
      if (touch) {
        const syntheticEvent = {
          preventDefault: () => {},
          clientX: touch.clientX,
          clientY: touch.clientY,
        } as unknown as React.MouseEvent;
        onContextMenu(syntheticEvent, email);
      }
    }
  },
});
```

3. Spread `longPressHandlers` onto the list item's root element alongside existing props.

- [ ] **Step 3: Fix context menu touch support**

In `components/ui/context-menu.tsx`, find the `ContextMenuSubMenu` component. Add touch device detection and tap-to-toggle behavior:

1. Add state for touch device detection:
```typescript
const [isTouchDevice, setIsTouchDevice] = useState(false);
useEffect(() => {
  setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
}, []);
```

2. For the submenu trigger, change hover-only to also support tap on touch devices:
- Touch: `onClick` toggles submenu open/closed
- Mouse: `onMouseEnter`/`onMouseLeave` as before

- [ ] **Step 4: Run lint and typecheck**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/use-long-press.ts components/email/email-list-item.tsx components/ui/context-menu.tsx
git commit -m "feat: add long-press context menu and touch support for mobile"
```

---

## Chunk 2: P1 Polish A (Tags, Empty Folder, Density, Tooltips)

### Task 7: Tag counts sidebar section

**Files:**
- Modify: `components/layout/sidebar.tsx`
- Modify: `stores/email-store.ts`
- Modify: `locales/en/common.json` (+ 7 other locale files)

- [ ] **Step 1: Add i18n keys**

Add to `locales/en/common.json` under `sidebar`:
```json
"tags": {
  "title": "Tags",
  "no_tags": "No tags"
}
```
Add equivalent translations to all 7 other locales.

- [ ] **Step 2: Add tag count fetching to email store**

In `stores/email-store.ts`:

1. Add `tagCounts: Record<string, number>` to the store state interface and default to `{}`
2. Add `fetchTagCounts` action that builds a batch JMAP request:
   - Create one `Email/query` call per color tag (`$color:red`, `$color:orange`, etc.) with `calculateTotal: true` and `limit: 0`
   - Parse responses to build `{ red: 42, blue: 7, ... }` map (only include colors with count > 0)
   - Set result in store
3. Call `fetchTagCounts()` after initial mailbox load and on push state changes (find existing state change handler and add call there)

- [ ] **Step 3: Add tags section to sidebar**

In `components/layout/sidebar.tsx`:

1. Import `tagCounts` and `fetchTagCounts` from email store
2. Add `tagsExpanded` local state (default `true`)
3. After the mailbox tree section, add a collapsible "Tags" section:
   - Collapsible header with chevron
   - List of tags with color dot, capitalized name, and count badge
   - Each tag is clickable — triggers email list filter by that keyword
4. Only render section when `Object.keys(tagCounts).length > 0`

Define tag color dot classes matching `email-list-item.tsx` pattern:
```typescript
const tagDotColors: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};
```

- [ ] **Step 4: Run lint and typecheck**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar.tsx stores/email-store.ts locales/*/common.json
git commit -m "feat: add tags section with counts in sidebar"
```

---

### Task 8: Empty folder (Junk/Trash)

**Files:**
- Modify: `components/layout/sidebar.tsx`
- Modify: `stores/email-store.ts`
- Modify: `locales/en/common.json` (+ 7 other locale files)

- [ ] **Step 1: Add i18n keys**

Add to `locales/en/common.json` under `sidebar`:
```json
"empty_folder": {
  "title": "Empty folder",
  "confirm": "Are you sure you want to permanently delete all {count} emails in {folder}?",
  "success": "Folder emptied successfully",
  "progress": "Deleting... {deleted}/{total}",
  "error": "Failed to delete all emails. {deleted} of {total} were removed."
}
```
Add equivalent translations to all 7 other locales.

- [ ] **Step 2: Add emptyFolder action to email store**

In `stores/email-store.ts`, add `emptyFolder` action:
- Query all email IDs in the mailbox with `Email/query`
- Batch `Email/set` destroy calls in groups of 500
- Accept `onProgress` callback for UI updates
- On batch failure: stop and throw with partial progress info

- [ ] **Step 3: Add "Empty folder" to sidebar mailbox context menu**

In `components/layout/sidebar.tsx`:
1. Add state for `emptyFolderTarget` and `showEmptyConfirm`
2. In the mailbox context menu, add "Empty folder" option for `role === 'trash'` or `role === 'junk'` when `totalEmails > 0`
3. Add confirmation dialog that:
   - Shows folder name and email count
   - On confirm: calls `emptyFolder()` with progress callback
   - Uses `toast.loading()` to show progress, `toast.success()` on completion, `toast.error()` on failure
   - Calls `refreshMailboxes()` after completion

- [ ] **Step 4: Run lint and typecheck**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar.tsx stores/email-store.ts locales/*/common.json
git commit -m "feat: add empty folder option for Junk and Trash"
```

---

### Task 9: Extra-compact density

**Files:**
- Modify: `stores/settings-store.ts`
- Modify: `components/settings/appearance-settings.tsx`
- Modify: `components/email/email-list-item.tsx`
- Modify: `locales/en/common.json` (+ 7 other locale files)
- Modify: `app/globals.css` (for touch target override)

- [ ] **Step 1: Add i18n key**

Add to `locales/en/common.json` under `settings.list_density`:
```json
"extra_compact": "Extra compact"
```
Add to all 7 other locales.

- [ ] **Step 2: Update ListDensity type and apply function**

In `stores/settings-store.ts`:

1. Change type:
```typescript
export type ListDensity = 'extra-compact' | 'compact' | 'regular' | 'comfortable';
```

2. Update `applyListDensity`:
```typescript
function applyListDensity(density: ListDensity) {
  const densityMap: Record<ListDensity, string> = {
    'extra-compact': '28px',
    compact: '36px',
    regular: '48px',
    comfortable: '56px'
  };
  const root = document.documentElement;
  root.style.setProperty('--list-item-height', densityMap[density]);
  root.dataset.density = density;
}
```

- [ ] **Step 3: Add radio option in appearance settings**

In `components/settings/appearance-settings.tsx`, add `{ value: 'extra-compact', label: t('list_density.extra_compact') }` to the RadioGroup options array.

- [ ] **Step 4: Conditional rendering in email-list-item.tsx**

In `components/email/email-list-item.tsx`:

1. Read density from store:
```typescript
const listDensity = useSettingsStore((state) => state.listDensity);
const isExtraCompact = listDensity === 'extra-compact';
```

2. Conditionally hide avatar, preview snippet, and attachment indicator when `isExtraCompact` is true. Keep sender name, subject (single line truncated), date, and unread dot.

- [ ] **Step 5: Add mobile touch target override in globals.css**

Add to `app/globals.css`:
```css
@media (pointer: coarse) {
  [data-density="extra-compact"] .email-list-item {
    min-height: 44px;
  }
}
```

- [ ] **Step 6: Run lint and typecheck**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add stores/settings-store.ts components/settings/appearance-settings.tsx components/email/email-list-item.tsx app/globals.css locales/*/common.json
git commit -m "feat: add extra-compact density option with mobile touch override"
```

---

### Task 10: Security tooltips on SPF/DKIM/DMARC

**Files:**
- Modify: `components/email/email-viewer.tsx`
- Modify: `locales/en/common.json` (+ 7 other locale files)

- [ ] **Step 1: Add i18n keys for all security tooltip strings**

Add to `locales/en/common.json` under `email_viewer.security`:
```json
"tooltip": {
  "spf_pass": "The sending server is authorized to send on behalf of this domain",
  "spf_fail": "The sending server is NOT authorized to send from this domain — this email may be spoofed",
  "spf_softfail": "The sending server is probably not authorized — treat with caution",
  "spf_neutral": "The domain owner has not stated whether this server is authorized",
  "spf_temperror": "A temporary error occurred checking the sender — try again later",
  "spf_permerror": "The domain's SPF record is misconfigured",
  "spf_none": "No SPF record found for this domain",
  "dkim_pass": "This email's content has not been tampered with in transit",
  "dkim_fail": "This email's content may have been altered in transit",
  "dkim_policy": "DKIM signature did not meet the domain's policy requirements",
  "dkim_neutral": "DKIM check was inconclusive",
  "dkim_temperror": "A temporary error occurred verifying the signature",
  "dkim_permerror": "The DKIM signature is malformed or the key is missing",
  "dmarc_pass": "The sender's domain has verified this email is authentic",
  "dmarc_fail": "The sender's domain could not verify this email's authenticity",
  "dmarc_none": "The sender's domain has no DMARC policy configured"
}
```
Add equivalent translations to all 7 other locales.

- [ ] **Step 2: Add tooltips to security badges in email-viewer.tsx**

In `components/email/email-viewer.tsx`, find the security badge rendering section (around lines 1008-1135). Wrap each badge in a group with hover-triggered tooltip:

```tsx
<div className="group relative">
  {/* Existing badge content */}
  <div className="absolute invisible group-hover:visible bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg shadow-lg max-w-xs z-50 whitespace-normal">
    {t(`security.tooltip.${protocol}_${result}`)}
  </div>
</div>
```

Apply to all SPF, DKIM, and DMARC badge sections. Derive `protocol` and `result` from the existing `authResults` data used to render each badge.

- [ ] **Step 3: Run lint and typecheck**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/email/email-viewer.tsx locales/*/common.json
git commit -m "feat: add explanatory tooltips to SPF/DKIM/DMARC indicators"
```

---

## Chunk 3: P1 Polish B (Resizable Sidebars, Sender Info Panel)

### Task 11: Resizable sidebars

**Files:**
- Create: `hooks/use-resize-handle.ts`
- Modify: `components/layout/sidebar.tsx`
- Modify: `stores/settings-store.ts`

- [ ] **Step 1: Add sidebarWidth to settings store**

In `stores/settings-store.ts`:

1. Add `sidebarWidth: number` to `SettingsState` interface
2. Add default `sidebarWidth: 256` to `DEFAULT_SETTINGS`
3. In `updateSetting`, add handler to set CSS variable:
```typescript
if (key === 'sidebarWidth') {
  document.documentElement.style.setProperty('--sidebar-width', `${value}px`);
}
```
4. Add `sidebarWidth` to `exportSettings` and `importSettings`
5. Add `onRehydrateStorage` callback to initialize CSS variable from persisted value

- [ ] **Step 2: Create use-resize-handle hook**

Create `hooks/use-resize-handle.ts`:

Implement a hook that:
- Tracks `mousedown` → `mousemove` → `mouseup` drag cycle
- Tracks `touchstart` → `touchmove` → `touchend` for tablet
- Supports `ArrowLeft`/`ArrowRight` keyboard resizing (20px increments)
- Clamps width between `min` and `max` values
- Calls `onResize` during drag (for live CSS variable update)
- Calls `onResizeEnd` when drag completes (for persisting to store)
- Sets `cursor: col-resize` and `user-select: none` on body during drag

Interface:
```typescript
interface UseResizeHandleOptions {
  min: number;    // 180
  max: number;    // 400
  initial: number;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
}

// Returns: { handleMouseDown, handleTouchStart, handleKeyDown }
```

- [ ] **Step 3: Add resize handle to sidebar**

In `components/layout/sidebar.tsx`:

1. Import `useResizeHandle` and settings store
2. Read `sidebarWidth` from settings store
3. Initialize the hook with min=180, max=400, and live CSS variable update
4. Add an invisible drag handle div as the last child of the sidebar container:
   - Positioned absolutely on the right edge
   - 4px wide, full height, `cursor-col-resize`
   - Hover highlight: `hover:bg-primary/20`
   - Hidden on mobile (`hidden lg:block`)
   - Accessible: `role="separator"`, `aria-orientation="vertical"`, `aria-label`, `aria-valuemin/max/now`, `tabIndex={0}`
5. Replace `lg:w-64` class with dynamic `style={{ width: 'var(--sidebar-width, 256px)' }}` on desktop
6. Keep mobile sidebar as full-width overlay (no resize)

- [ ] **Step 4: Run lint and typecheck**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/use-resize-handle.ts components/layout/sidebar.tsx stores/settings-store.ts
git commit -m "feat: add resizable sidebar with drag, touch, and keyboard support"
```

---

### Task 12: Sender info panel

**Files:**
- Create: `components/email/sender-info-panel.tsx`
- Modify: `components/email/email-viewer.tsx`
- Modify: `locales/en/common.json` (+ 7 other locale files)

- [ ] **Step 1: Add i18n keys**

Add to `locales/en/common.json` under `email_viewer`:
```json
"sender_info": {
  "add_to_contacts": "Add to contacts",
  "view_all_emails": "View all emails from this sender",
  "no_contact": "Not in your contacts"
}
```
Add equivalent translations to all 7 other locales.

- [ ] **Step 2: Create sender-info-panel.tsx**

Create `components/email/sender-info-panel.tsx`:

Component that:
- Accepts `sender: EmailAddress`, `onSearch`, `onAddContact` props
- Reads contacts from `useContactStore`
- Looks up sender email in contacts list
- Displays:
  - Larger avatar
  - Full name and email address
  - Contact info if found (company, etc.) or "Not in your contacts" message
  - "Add to contacts" button (if not in contacts)
  - "View all emails from this sender" button (triggers search)
- Styled with slide-in animation, border-top, muted background

- [ ] **Step 3: Integrate into email-viewer.tsx**

In `components/email/email-viewer.tsx`:

1. Import `SenderInfoPanel`
2. Add `showSenderInfo` state (default `false`)
3. Make sender name/avatar clickable to toggle `showSenderInfo`
4. Render `SenderInfoPanel` conditionally below sender line when expanded
5. Wire `onSearch` to trigger email list search
6. Wire `onAddContact` to open existing add-contact flow

- [ ] **Step 4: Run lint and typecheck**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/email/sender-info-panel.tsx components/email/email-viewer.tsx locales/*/common.json
git commit -m "feat: add expandable sender info panel in email viewer"
```

---

## Final: Version bump and documentation

### Task 13: Version bump and documentation update

**Files:**
- Modify: `package.json`
- Modify: `TODO.md`
- Modify: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Bump version in package.json**

Change `"version"` from current to `"1.2.0"`.

- [ ] **Step 2: Update TODO.md**

Review TODO.md and check off or update any items addressed by this work.

- [ ] **Step 3: Update ARCHITECTURE.md**

Add entries for new components and patterns:
- `components/email/sandboxed-email-frame.tsx` — iframe rendering for CSS isolation
- `components/email/mobile-action-bar.tsx` — mobile bottom action bar
- `components/email/sender-info-panel.tsx` — expandable sender info
- `hooks/use-long-press.ts` — touch long-press hook
- `hooks/use-resize-handle.ts` — drag-to-resize hook
- `lib/jmap/retry.ts` — exponential backoff retry utility

- [ ] **Step 4: Run full test suite and build**

Run: `cd /home/matthieu/Documents/Dev.local/webmail && npx vitest run && npm run build`
Expected: ALL PASS, build succeeds

- [ ] **Step 5: Commit**

```bash
git add package.json TODO.md docs/ARCHITECTURE.md
git commit -m "chore: bump version to 1.2.0, update documentation"
```
