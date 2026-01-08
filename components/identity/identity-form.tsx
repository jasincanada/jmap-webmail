'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Identity, EmailAddress } from '@/lib/jmap/types';

interface IdentityFormData {
  name: string;
  email: string;
  replyTo?: EmailAddress[];
  bcc?: EmailAddress[];
  textSignature?: string;
  htmlSignature?: string;
}

interface IdentityFormProps {
  identity?: Identity;
  onSave: (data: IdentityFormData) => Promise<void>;
  onCancel: () => void;
}

export function IdentityForm({ identity, onSave, onCancel }: IdentityFormProps) {
  const t = useTranslations('identities.form');
  const isEditing = !!identity;

  const [formData, setFormData] = useState<IdentityFormData>({
    name: identity?.name || '',
    email: identity?.email || '',
    replyTo: identity?.replyTo,
    bcc: identity?.bcc,
    textSignature: identity?.textSignature || '',
    htmlSignature: identity?.htmlSignature || '',
  });

  const [replyToInput, setReplyToInput] = useState(
    identity?.replyTo?.map(a => a.email).join(', ') || ''
  );
  const [bccInput, setBccInput] = useState(
    identity?.bcc?.map(a => a.email).join(', ') || ''
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const parseEmailList = (input: string): EmailAddress[] | undefined => {
    if (!input.trim()) return undefined;

    const emails = input.split(',').map(e => e.trim()).filter(Boolean);
    return emails.map(email => ({ email }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('name_required');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('email_required');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('email_invalid');
    }

    // Validate reply-to emails
    if (replyToInput.trim()) {
      const emails = replyToInput.split(',').map(e => e.trim());
      for (const email of emails) {
        if (email && !validateEmail(email)) {
          newErrors.replyTo = t('email_invalid');
          break;
        }
      }
    }

    // Validate bcc emails
    if (bccInput.trim()) {
      const emails = bccInput.split(',').map(e => e.trim());
      for (const email of emails) {
        if (email && !validateEmail(email)) {
          newErrors.bcc = t('email_invalid');
          break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await onSave({
        ...formData,
        replyTo: parseEmailList(replyToInput),
        bcc: parseEmailList(bccInput),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label htmlFor="identity-name" className="block text-sm font-medium mb-1">
          {t('name_label')} <span className="text-destructive">*</span>
        </label>
        <Input
          id="identity-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('name_placeholder')}
          disabled={isSubmitting}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="identity-email" className="block text-sm font-medium mb-1">
          {t('email_label')} <span className="text-destructive">*</span>
        </label>
        <Input
          id="identity-email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder={t('email_placeholder')}
          disabled={isSubmitting || isEditing}
          className={errors.email ? 'border-destructive' : ''}
        />
        {isEditing && (
          <p className="text-sm text-muted-foreground mt-1">
            {t('email_immutable')}
          </p>
        )}
        {errors.email && (
          <p className="text-sm text-destructive mt-1">{errors.email}</p>
        )}
      </div>

      {/* Reply-To */}
      <div>
        <label htmlFor="identity-reply-to" className="block text-sm font-medium mb-1">
          {t('reply_to_label')}
        </label>
        <Input
          id="identity-reply-to"
          type="text"
          value={replyToInput}
          onChange={(e) => setReplyToInput(e.target.value)}
          placeholder={t('reply_to_placeholder')}
          disabled={isSubmitting}
          className={errors.replyTo ? 'border-destructive' : ''}
        />
        {errors.replyTo && (
          <p className="text-sm text-destructive mt-1">{errors.replyTo}</p>
        )}
      </div>

      {/* BCC */}
      <div>
        <label htmlFor="identity-bcc" className="block text-sm font-medium mb-1">
          {t('bcc_label')}
        </label>
        <Input
          id="identity-bcc"
          type="text"
          value={bccInput}
          onChange={(e) => setBccInput(e.target.value)}
          placeholder={t('bcc_placeholder')}
          disabled={isSubmitting}
          className={errors.bcc ? 'border-destructive' : ''}
        />
        {errors.bcc && (
          <p className="text-sm text-destructive mt-1">{errors.bcc}</p>
        )}
      </div>

      {/* Text Signature */}
      <div>
        <label htmlFor="identity-text-sig" className="block text-sm font-medium mb-1">
          {t('text_signature_label')}
        </label>
        <textarea
          id="identity-text-sig"
          value={formData.textSignature}
          onChange={(e) => setFormData({ ...formData, textSignature: e.target.value })}
          rows={3}
          disabled={isSubmitting}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* HTML Signature */}
      <div>
        <label htmlFor="identity-html-sig" className="block text-sm font-medium mb-1">
          {t('html_signature_label')}
        </label>
        <textarea
          id="identity-html-sig"
          value={formData.htmlSignature}
          onChange={(e) => setFormData({ ...formData, htmlSignature: e.target.value })}
          rows={5}
          disabled={isSubmitting}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-mono transition-all duration-200 placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEditing
              ? t('updating')
              : t('creating')
            : t('save')}
        </Button>
      </div>
    </form>
  );
}
