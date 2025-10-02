"use client";

import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { Email } from "@/lib/jmap/types";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatFileSize, cn } from "@/lib/utils";
import {
  parseAuthenticationResults,
  parseSpamScore,
  parseReceivedHeaders,
  getSecurityStatus,
  extractListHeaders,
  formatBytes
} from "@/lib/email-headers";
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Star,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Download,
  Paperclip,
  Mail,
  Clock,
  Loader2,
  AlertCircle,
  ExternalLink,
  Printer,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File,
  Shield,
  Image,
  Circle,
  X,
  Check,
  AlertTriangle,
  Minus,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Network,
  Hash,
  List,
} from "lucide-react";

interface EmailViewerProps {
  email: Email | null;
  isLoading?: boolean;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onToggleStar?: () => void;
  onMarkAsRead?: (emailId: string, read: boolean) => void;
  onSetColorTag?: (emailId: string, color: string | null) => void;
  onDownloadAttachment?: (blobId: string, name: string, type?: string) => void;
}

// Helper function to get file icon based on mime type or extension
const getFileIcon = (name?: string, type?: string) => {
  const ext = name?.split('.').pop()?.toLowerCase();
  const mimeType = type?.toLowerCase();

  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return FileImage;
  }
  if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')) {
    return FileVideo;
  }
  if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) {
    return FileAudio;
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return FileText;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
    return FileArchive;
  }
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) {
    return FileText;
  }
  return File;
};

// Color options for email tags
const colorOptions = [
  { name: "Red", value: "red", color: "bg-red-500" },
  { name: "Orange", value: "orange", color: "bg-orange-500" },
  { name: "Yellow", value: "yellow", color: "bg-yellow-500" },
  { name: "Green", value: "green", color: "bg-green-500" },
  { name: "Blue", value: "blue", color: "bg-blue-500" },
  { name: "Purple", value: "purple", color: "bg-purple-500" },
  { name: "Pink", value: "pink", color: "bg-pink-500" },
];

const getCurrentColor = (keywords: Record<string, boolean> | undefined) => {
  if (!keywords) return null;
  for (const key of Object.keys(keywords)) {
    if (key.startsWith("$color:") && keywords[key] === true) {
      return key.replace("$color:", "");
    }
  }
  return null;
};

export function EmailViewer({
  email,
  isLoading = false,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onArchive,
  onToggleStar,
  onMarkAsRead,
  onSetColorTag,
  onDownloadAttachment,
}: EmailViewerProps) {
  const [showFullHeaders, setShowFullHeaders] = useState(false);
  const [allowExternalContent, setAllowExternalContent] = useState(false);
  const [hasBlockedContent, setHasBlockedContent] = useState(false);
  const currentColor = getCurrentColor(email?.keywords);

  useEffect(() => {
    // Mark as read when email is viewed
    if (email && !email.keywords?.$seen && onMarkAsRead) {
      onMarkAsRead(email.id, true);
    }
  }, [email?.id, email?.keywords?.$seen, onMarkAsRead]);

  // Reset external content permission when email changes
  useEffect(() => {
    setAllowExternalContent(false);
    setHasBlockedContent(false);
  }, [email?.id]);

  // Sanitize and prepare email HTML content
  const emailContent = useMemo(() => {
    if (!email) return { html: "", isHtml: false };

    // Check if we have body values
    if (email.bodyValues) {
      // Check if HTML content exists and if it's actually rich HTML or just plain text wrapper
      let useHtmlVersion = false;
      let htmlContent = '';

      if (email.htmlBody?.[0]?.partId && email.bodyValues[email.htmlBody[0].partId]) {
        htmlContent = email.bodyValues[email.htmlBody[0].partId].value;

        // Check if HTML is just a minimal wrapper around plain text
        // by checking if it lacks common HTML formatting elements
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const hasRichFormatting = tempDiv.querySelector('table, img, style, b, strong, i, em, u, font, div[style], span[style], p[style], h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
        const hasMultipleParagraphs = tempDiv.querySelectorAll('p').length > 2;
        const hasBrTags = tempDiv.querySelectorAll('br').length > 0;

        // Use HTML if it has rich formatting, multiple paragraphs, or explicit line breaks
        useHtmlVersion = !!(hasRichFormatting || hasMultipleParagraphs || hasBrTags);
      }

      // If we should use HTML version and it exists
      if (useHtmlVersion && htmlContent) {
        // Create a custom DOMPurify hook to handle external content
        let blockedExternalContent = false;

        const sanitizeConfig: any = {
          ADD_TAGS: ['style'],
          ADD_ATTR: ['target', 'style', 'class', 'width', 'height', 'align', 'valign', 'bgcolor', 'color'],
          ALLOW_DATA_ATTR: false,
          FORCE_BODY: true,
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
        };

        // If external content is not allowed, block images and external resources
        if (!allowExternalContent) {
          sanitizeConfig.FORBID_TAGS.push('link');
          sanitizeConfig.FORBID_ATTR.push('background');

          // Hook to modify src attributes
          DOMPurify.addHook('afterSanitizeAttributes', (node: any) => {
            // Block external images
            if (node.tagName === 'IMG') {
              const src = node.getAttribute('src');
              if (src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//'))) {
                node.setAttribute('data-blocked-src', src);
                // Use a subtle transparent placeholder
                node.setAttribute('src', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8L3N2Zz4=');
                node.setAttribute('alt', '');
                node.style.display = 'none'; // Hide blocked images completely for cleaner look
                blockedExternalContent = true;
              }
            }

            // Block external stylesheets and resources in style attributes
            if (node.style) {
              const style = node.style.cssText;
              if (style && style.includes('url(')) {
                const urlMatch = style.match(/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/gi);
                if (urlMatch) {
                  node.style.cssText = style.replace(/url\(['"]?https?:\/\/[^'")\s]+['"]?\)/gi, 'url()');
                  blockedExternalContent = true;
                }
              }
            }
          });
        }

        // Sanitize HTML to prevent XSS
        const cleanHtml = DOMPurify.sanitize(htmlContent, sanitizeConfig);

        // Remove the hook after sanitization
        DOMPurify.removeAllHooks();

        // Update blocked content state
        if (blockedExternalContent && !hasBlockedContent) {
          setHasBlockedContent(true);
        }

        return {
          html: cleanHtml,
          isHtml: true
        };
      }

      // Use text content if available (either as fallback or when HTML is minimal)
      if (email.textBody?.[0]?.partId && email.bodyValues[email.textBody[0].partId]) {
        const textContent = email.bodyValues[email.textBody[0].partId].value;

        // Convert plain text to HTML with proper formatting
        const htmlFromText = textContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r\n/g, '<br>')  // Windows line endings
          .replace(/\r/g, '<br>')    // Old Mac line endings
          .replace(/\n/g, '<br>')    // Unix line endings
          .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')  // Convert tabs to spaces
          .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); // Don't match across tags

        return {
          html: htmlFromText,
          isHtml: false
        };
      }
    }

    // If no body content is available, show the preview or a message
    if (email.preview) {
      const previewHtml = email.preview
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r\n/g, '<br>')
        .replace(/\r/g, '<br>')
        .replace(/\n/g, '<br>');

      return {
        html: `<div style="color: #666; font-style: italic;">${previewHtml}</div>`,
        isHtml: false
      };
    }

    return {
      html: '<p style="color: #999;">No content available</p>',
      isHtml: false
    };
  }, [email, allowExternalContent, hasBlockedContent]);

  // Show loading skeleton while email is being fetched
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        {/* Loading Header Skeleton */}
        <div className="bg-background border-b border-border">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="h-8 bg-muted rounded-md w-3/4 animate-pulse"></div>
                <div className="flex items-center gap-3">
                  <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Loading Sender Info Skeleton */}
          <div className="px-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-muted rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-64 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Content Skeleton */}
        <div className="flex-1 overflow-auto bg-muted/30">
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-background rounded-lg shadow-sm border border-border overflow-hidden p-6 space-y-3">
              <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-4/6 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-muted/30 to-muted/50">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-background shadow-lg flex items-center justify-center">
            <Mail className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No conversation selected</h3>
          <p className="text-muted-foreground">Choose a conversation from the list to read it here</p>
        </div>
      </div>
    );
  }

  const sender = email.from?.[0];
  const isStarred = email.keywords?.$flagged;
  const isImportant = email.keywords?.["$important"];

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Modern Header Section */}
      <div className="bg-background border-b border-border">
        {/* Subject Bar */}
        <div className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground tracking-tight truncate pr-2">
                {email.subject || "(no subject)"}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {new Date(email.receivedAt).toLocaleString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {email.hasAttachment && (
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4" />
                    Attachments
                  </span>
                )}
                {isImportant && (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                    Important
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Primary Reply Button */}
              <Button
                onClick={onReply}
                size="sm"
                className="mr-1"
                title="Reply"
              >
                <Reply className="w-4 h-4" />
                <span className="ml-1.5">Reply</span>
              </Button>

              {/* Reply Options Dropdown */}
              <div className="relative group mr-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  title="More reply options"
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
                <div className="absolute right-0 top-full mt-1 w-40 bg-background rounded-md shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <button
                    onClick={onReplyAll}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-foreground flex items-center gap-2"
                  >
                    <ReplyAll className="w-4 h-4" />
                    Reply all
                  </button>
                  <button
                    onClick={onForward}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-foreground flex items-center gap-2"
                  >
                    <Forward className="w-4 h-4" />
                    Forward
                  </button>
                </div>
              </div>

              <div className="w-px h-5 bg-border" />

              <Button
                variant="ghost"
                size="icon"
                onClick={onArchive}
                className="h-8 w-8 hover:bg-muted"
                title="Archive"
              >
                <Archive className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 hover:bg-muted"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleStar}
                className="h-8 w-8 hover:bg-muted"
                title={isStarred ? "Unstar" : "Star"}
              >
                <Star className={cn(
                  "w-4 h-4 transition-colors",
                  isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                )} />
              </Button>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Compact Dynamic Color Picker */}
              <div className="relative group">
                <button
                  className="h-8 w-8 rounded hover:bg-muted flex items-center justify-center"
                  title="Set color"
                >
                  <Circle className={cn(
                    "w-4 h-4",
                    currentColor === 'red' && "fill-red-500 text-red-500",
                    currentColor === 'orange' && "fill-orange-500 text-orange-500",
                    currentColor === 'yellow' && "fill-yellow-500 text-yellow-500",
                    currentColor === 'green' && "fill-green-500 text-green-500",
                    currentColor === 'blue' && "fill-blue-500 text-blue-500",
                    currentColor === 'purple' && "fill-purple-500 text-purple-500",
                    currentColor === 'pink' && "fill-pink-500 text-pink-500",
                    !currentColor && "text-gray-400"
                  )} />
                </button>

                {/* Colors appear on hover */}
                <div className="absolute right-0 top-full mt-1 p-1.5 bg-background rounded-lg shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <div className="flex gap-1">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          if (email) {
                            onSetColorTag?.(email.id, option.value);
                          }
                        }}
                        className={cn(
                          "w-6 h-6 rounded-full hover:scale-110 transition-transform",
                          option.color,
                          currentColor === option.value && "ring-2 ring-offset-1 ring-gray-400"
                        )}
                        title={option.name}
                      />
                    ))}
                    {currentColor && (
                      <div className="w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />
                    )}
                    {currentColor && (
                      <button
                        onClick={() => {
                          if (email) {
                            onSetColorTag?.(email.id, null);
                          }
                        }}
                        className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 hover:bg-muted flex items-center justify-center"
                        title="Remove color"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                title="More actions"
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sender Info */}
        <div className="px-6 pb-4">
          <div className="flex items-start gap-4">
            <Avatar
              name={sender?.name}
              email={sender?.email}
              size="lg"
              className="shadow-sm"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">
                  {sender?.name || sender?.email || "Unknown"}
                </span>
                {sender?.email && sender?.name && (
                  <span className="text-sm text-muted-foreground">
                    &lt;{sender.email}&gt;
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1">
                {email.to && email.to.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 text-sm">
                    <span className="text-muted-foreground">To:</span>
                    <span className="text-foreground">
                      {email.to.slice(0, 2).map(r => r.name || r.email).join(", ")}
                      {email.to.length > 2 && (
                        <button
                          onClick={() => setShowFullHeaders(!showFullHeaders)}
                          className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          +{email.to.length - 2} more
                        </button>
                      )}
                    </span>
                  </div>
                )}

                {(email.cc && email.cc.length > 0) && (
                  <div className="flex flex-wrap items-center gap-1 text-sm">
                    <span className="text-muted-foreground">CC:</span>
                    <span className="text-foreground">
                      {email.cc.map(r => r.name || r.email).join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Modern Expandable Details */}
              {showFullHeaders && (
                <div className="mt-4 space-y-3">
                  {/* Security & Authentication Section */}
                  {(email.authenticationResults || email.spamScore !== undefined) && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 px-4 py-2 border-b border-blue-200 dark:border-blue-800">
                        <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Security & Authentication
                        </h3>
                      </div>
                      <div className="bg-background p-4 space-y-3">
                        {/* Authentication Results */}
                        {email.authenticationResults && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* SPF Check */}
                            {email.authenticationResults.spf && (
                              <div className={cn(
                                "px-3 py-2 rounded-md border",
                                getSecurityStatus(email.authenticationResults.spf.result).bgColor,
                                getSecurityStatus(email.authenticationResults.spf.result).borderColor
                              )}>
                                <div className="flex items-center gap-2">
                                  {getSecurityStatus(email.authenticationResults.spf.result).icon === 'check' &&
                                    <Check className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.spf.result).color)} />}
                                  {getSecurityStatus(email.authenticationResults.spf.result).icon === 'x' &&
                                    <X className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.spf.result).color)} />}
                                  {getSecurityStatus(email.authenticationResults.spf.result).icon === 'alert' &&
                                    <AlertTriangle className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.spf.result).color)} />}
                                  {getSecurityStatus(email.authenticationResults.spf.result).icon === 'minus' &&
                                    <Minus className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.spf.result).color)} />}
                                  <div>
                                    <div className="text-xs font-medium">SPF</div>
                                    <div className={cn("text-xs capitalize", getSecurityStatus(email.authenticationResults.spf.result).color)}>
                                      {email.authenticationResults.spf.result}
                                    </div>
                                  </div>
                                </div>
                                {email.authenticationResults.spf.domain && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate" title={email.authenticationResults.spf.domain}>
                                    {email.authenticationResults.spf.domain}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* DKIM Check */}
                            {email.authenticationResults.dkim && (
                              <div className={cn(
                                "px-3 py-2 rounded-md border",
                                getSecurityStatus(email.authenticationResults.dkim.result).bgColor,
                                getSecurityStatus(email.authenticationResults.dkim.result).borderColor
                              )}>
                                <div className="flex items-center gap-2">
                                  {getSecurityStatus(email.authenticationResults.dkim.result).icon === 'check' &&
                                    <Check className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.dkim.result).color)} />}
                                  {getSecurityStatus(email.authenticationResults.dkim.result).icon === 'x' &&
                                    <X className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.dkim.result).color)} />}
                                  {getSecurityStatus(email.authenticationResults.dkim.result).icon === 'alert' &&
                                    <AlertTriangle className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.dkim.result).color)} />}
                                  {getSecurityStatus(email.authenticationResults.dkim.result).icon === 'minus' &&
                                    <Minus className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.dkim.result).color)} />}
                                  <div>
                                    <div className="text-xs font-medium">DKIM</div>
                                    <div className={cn("text-xs capitalize", getSecurityStatus(email.authenticationResults.dkim.result).color)}>
                                      {email.authenticationResults.dkim.result}
                                    </div>
                                  </div>
                                </div>
                                {email.authenticationResults.dkim.domain && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate" title={email.authenticationResults.dkim.domain}>
                                    {email.authenticationResults.dkim.domain}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* DMARC Check */}
                            {email.authenticationResults.dmarc && (
                              <div className={cn(
                                "px-3 py-2 rounded-md border",
                                getSecurityStatus(email.authenticationResults.dmarc.result).bgColor,
                                getSecurityStatus(email.authenticationResults.dmarc.result).borderColor
                              )}>
                                <div className="flex items-center gap-2">
                                  {getSecurityStatus(email.authenticationResults.dmarc.result).icon === 'check' &&
                                    <Check className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.dmarc.result).color)} />}
                                  {getSecurityStatus(email.authenticationResults.dmarc.result).icon === 'x' &&
                                    <X className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.dmarc.result).color)} />}
                                  {getSecurityStatus(email.authenticationResults.dmarc.result).icon === 'alert' &&
                                    <AlertTriangle className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.dmarc.result).color)} />}
                                  {getSecurityStatus(email.authenticationResults.dmarc.result).icon === 'minus' &&
                                    <Minus className={cn("w-4 h-4", getSecurityStatus(email.authenticationResults.dmarc.result).color)} />}
                                  <div>
                                    <div className="text-xs font-medium">DMARC</div>
                                    <div className={cn("text-xs capitalize", getSecurityStatus(email.authenticationResults.dmarc.result).color)}>
                                      {email.authenticationResults.dmarc.result}
                                    </div>
                                  </div>
                                </div>
                                {email.authenticationResults.dmarc.policy && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Policy: {email.authenticationResults.dmarc.policy}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Spam Score */}
                            {email.spamScore !== undefined && (
                              <div className={cn(
                                "px-3 py-2 rounded-md border",
                                email.spamScore > 5 ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" :
                                email.spamScore > 2 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" :
                                "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                              )}>
                                <div className="flex items-center gap-2">
                                  <Shield className={cn(
                                    "w-4 h-4",
                                    email.spamScore > 5 ? "text-red-600 dark:text-red-400" :
                                    email.spamScore > 2 ? "text-amber-600 dark:text-amber-400" :
                                    "text-green-600 dark:text-green-400"
                                  )} />
                                  <div>
                                    <div className="text-xs font-medium">Spam Score</div>
                                    <div className={cn(
                                      "text-xs",
                                      email.spamScore > 5 ? "text-red-600 dark:text-red-400" :
                                      email.spamScore > 2 ? "text-amber-600 dark:text-amber-400" :
                                      "text-green-600 dark:text-green-400"
                                    )}>
                                      {email.spamScore.toFixed(1)}
                                    </div>
                                  </div>
                                </div>
                                {email.spamStatus && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 capitalize">
                                    {email.spamStatus}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Technical Details Section - Only show if we have useful technical info */}
                  {(email.messageId || email.replyTo?.length || (email.sentAt && email.receivedAt &&
                    Math.abs(new Date(email.sentAt).getTime() - new Date(email.receivedAt).getTime()) > 60000)) && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-muted/50 to-muted px-4 py-2 border-b border-border">
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                          <Network className="w-3.5 h-3.5" />
                          Technical Details
                        </h3>
                      </div>
                      <div className="bg-background p-4">
                        <div className="space-y-3 text-xs">
                          {/* Message ID */}
                          {email.messageId && (
                            <div className="flex items-start gap-2">
                              <Hash className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-muted-foreground">Message-ID:</span>
                                <div className="text-foreground break-all font-mono text-xs mt-0.5">
                                  {email.messageId}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Reply-To if different from sender */}
                          {email.replyTo && email.replyTo.length > 0 &&
                           (!email.from || email.replyTo[0].email !== email.from[0]?.email) && (
                            <div className="flex items-start gap-2">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <span className="font-medium text-muted-foreground">Reply-To:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {email.replyTo.map((recipient, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-1 bg-accent/50 border border-accent rounded text-xs">
                                      {recipient.name && <span className="font-medium mr-1 text-accent-foreground">{recipient.name}</span>}
                                      <span className="text-accent-foreground/90">{recipient.email}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Time delay if significant (>1 minute difference) */}
                          {email.sentAt && email.receivedAt &&
                           Math.abs(new Date(email.sentAt).getTime() - new Date(email.receivedAt).getTime()) > 60000 && (
                            <div className="flex items-start gap-2">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <span className="font-medium text-muted-foreground">Delivery time:</span>
                                <div className="text-foreground">
                                  {(() => {
                                    const diff = Math.abs(new Date(email.receivedAt).getTime() - new Date(email.sentAt).getTime());
                                    const minutes = Math.floor(diff / 60000);
                                    const hours = Math.floor(minutes / 60);
                                    const days = Math.floor(hours / 24);
                                    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
                                    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
                                    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Part of conversation */}
                          {email.references && email.references.length > 0 && (
                            <div className="flex items-start gap-2">
                              <List className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-muted-foreground">Part of conversation:</span>
                                <div className="text-foreground text-xs mt-0.5">
                                  {email.references.length} previous message{email.references.length > 1 ? 's' : ''} in this thread
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowFullHeaders(!showFullHeaders)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {showFullHeaders ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show details
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Email Content Area */}
      <div className="flex-1 overflow-auto bg-muted/30">
        {/* Ultra Minimalist External Content Banner */}
        {hasBlockedContent && !allowExternalContent && (
          <div className="border-b border-border">
            <div className="max-w-4xl mx-auto px-6 py-2">
              <button
                onClick={() => setAllowExternalContent(true)}
                className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Image className="w-3.5 h-3.5" />
                Show images
              </button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto p-6">

          {/* Inline Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mb-4">
              {/* Image attachments as thumbnails */}
              {email.attachments.filter(a =>
                a.type?.startsWith('image/') ||
                ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(a.name?.split('.').pop()?.toLowerCase() || '')
              ).length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {email.attachments
                      .filter(a =>
                        a.type?.startsWith('image/') ||
                        ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(a.name?.split('.').pop()?.toLowerCase() || '')
                      )
                      .map((attachment, i) => (
                        <div
                          key={i}
                          className="relative group cursor-pointer"
                          title={attachment.name}
                          onClick={() => {
                            if (attachment.blobId && onDownloadAttachment) {
                              onDownloadAttachment(attachment.blobId, attachment.name || 'download', attachment.type);
                            }
                          }}
                        >
                          <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                            <div className="w-full h-full flex items-center justify-center">
                              <FileImage className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Download className="w-6 h-6 text-white" />
                          </div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate max-w-[128px]">
                            {attachment.name}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Non-image attachments in a compact list */}
              {email.attachments.filter(a =>
                !a.type?.startsWith('image/') &&
                !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(a.name?.split('.').pop()?.toLowerCase() || '')
              ).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  {email.attachments
                    .filter(a =>
                      !a.type?.startsWith('image/') &&
                      !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(a.name?.split('.').pop()?.toLowerCase() || '')
                    )
                    .map((attachment, i) => {
                      const FileIcon = getFileIcon(attachment.name, attachment.type);
                      return (
                        <button
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted hover:bg-accent rounded-md transition-colors group"
                          title={`Download ${attachment.name} (${formatFileSize(attachment.size)})`}
                          onClick={() => {
                            if (attachment.blobId && onDownloadAttachment) {
                              onDownloadAttachment(attachment.blobId, attachment.name || 'download', attachment.type);
                            }
                          }}
                        >
                          <FileIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {attachment.name || "Unnamed"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(attachment.size)})
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Email Body */}
          <div className="bg-background rounded-lg shadow-sm border border-border overflow-hidden">
            {isLoadingContent && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-100 dark:border-amber-800 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-700 dark:text-amber-400">Loading full email content...</span>
              </div>
            )}

            <div className="email-content-wrapper p-6">
              {emailContent.isHtml ? (
                <div
                  className="email-content prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: emailContent.html }}
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.6',
                  }}
                />
              ) : (
                <div
                  className="email-content-text text-foreground"
                  dangerouslySetInnerHTML={{ __html: emailContent.html }}
                  style={{
                    fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    wordBreak: 'break-word',
                  }}
                />
              )}
            </div>
          </div>

          {/* Quick Reply Section */}
          <div className="mt-6 bg-background rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar
                name="You"
                email=""
                size="sm"
              />
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Reply..."
                  className="w-full px-3 py-2 text-sm border border-border bg-background text-foreground rounded-lg hover:border-accent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  onFocus={(e) => {
                    e.target.placeholder = "Type your reply...";
                    e.target.parentElement?.parentElement?.classList.add('focused');
                  }}
                  onBlur={(e) => {
                    e.target.placeholder = "Reply...";
                    if (!e.target.value) {
                      e.target.parentElement?.parentElement?.classList.remove('focused');
                    }
                  }}
                />
              </div>
              <Button
                onClick={onReply}
                size="sm"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}