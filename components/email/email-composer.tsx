"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Paperclip, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailComposerProps {
  onSend?: (data: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
  }) => void;
  onClose?: () => void;
  className?: string;
}

export function EmailComposer({ onSend, onClose, className }: EmailComposerProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const handleSend = () => {
    const toAddresses = to.split(",").map(e => e.trim()).filter(Boolean);
    const ccAddresses = cc.split(",").map(e => e.trim()).filter(Boolean);
    const bccAddresses = bcc.split(",").map(e => e.trim()).filter(Boolean);

    if (toAddresses.length > 0 && subject && body) {
      onSend?.({
        to: toAddresses,
        cc: ccAddresses,
        bcc: bccAddresses,
        subject,
        body,
      });

      // Reset form
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setBody("");
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background border rounded-lg", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">New Message</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="space-y-2 px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-16">To:</span>
            <Input
              type="email"
              placeholder="Recipient email addresses (comma separated)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 border-0 focus-visible:ring-0"
            />
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCc(!showCc)}
                className="text-xs"
              >
                Cc
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBcc(!showBcc)}
                className="text-xs"
              >
                Bcc
              </Button>
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-16">Cc:</span>
              <Input
                type="email"
                placeholder="Cc recipients (comma separated)"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="flex-1 border-0 focus-visible:ring-0"
              />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-16">Bcc:</span>
              <Input
                type="email"
                placeholder="Bcc recipients (comma separated)"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="flex-1 border-0 focus-visible:ring-0"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-16">Subject:</span>
            <Input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 border-0 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex-1 px-4 py-3">
          <textarea
            className="w-full h-full resize-none outline-none text-sm"
            placeholder="Compose email..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t">
          <Button variant="ghost" size="sm">
            <Paperclip className="w-4 h-4 mr-2" />
            Attach
          </Button>
          <Button onClick={handleSend}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}