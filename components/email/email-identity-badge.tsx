'use client';

import { useTranslations } from 'next-intl';
import { Mail, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Email, Identity } from '@/lib/jmap/types';
import { parseSubAddress } from '@/lib/sub-addressing';

interface EmailIdentityBadgeProps {
  email: Email;
  identities: Identity[];
  compact?: boolean;
  className?: string;
}

export function EmailIdentityBadge({
  email,
  identities,
  compact = false,
  className,
}: EmailIdentityBadgeProps) {
  const t = useTranslations('identities.badge');

  // Check if this email was sent by the current user
  const fromAddress = email.from?.[0]?.email;
  if (!fromAddress) return null;

  // Parse the from address to check for sub-addressing
  const parsed = parseSubAddress(fromAddress);

  // Find matching identity
  const matchingIdentity = identities.find(
    (identity) => identity.email === fromAddress || identity.email === `${parsed.baseUser}@${parsed.domain}`
  );

  // Don't show badge if not from user's identity
  if (!matchingIdentity && !parsed.tag) return null;

  if (compact) {
    // Compact view for email list
    if (parsed.tag) {
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
            'bg-primary/10 text-primary',
            className
          )}
          title={t('sub_address_tag', { tag: parsed.tag })}
        >
          <Tag className="w-3 h-3" />
          <span className="font-mono">+{parsed.tag}</span>
        </div>
      );
    }

    if (matchingIdentity && matchingIdentity.name) {
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
            'bg-secondary text-muted-foreground',
            className
          )}
          title={t('identity_name', { name: matchingIdentity.name })}
        >
          <Mail className="w-3 h-3" />
          <span className="truncate max-w-[100px]">{matchingIdentity.name}</span>
        </div>
      );
    }

    return null;
  }

  // Full view for email viewer
  return (
    <div className={cn('inline-flex items-center gap-2 text-sm', className)}>
      {parsed.tag ? (
        <>
          <Tag className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {t('sent_via', { email: fromAddress })}
          </span>
        </>
      ) : matchingIdentity && matchingIdentity.name ? (
        <>
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {t('sent_via', { email: `${matchingIdentity.name} <${fromAddress}>` })}
          </span>
        </>
      ) : null}
    </div>
  );
}
