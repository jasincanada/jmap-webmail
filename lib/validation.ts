/**
 * RFC 5322 compliant email validation with security enhancements
 */
export function isValidEmail(email: string): boolean {
  // Length check
  if (!email || email.length > 254) return false;

  // Security: Block control characters and header injection
  if (/[\r\n\0<>]/.test(email)) return false;

  // RFC 5322 compliant regex (simplified but secure)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) return false;

  // Additional checks
  const [localPart, domain] = email.split('@');

  // Local part max 64 chars
  if (localPart.length > 64) return false;

  // Domain validation
  if (domain.length > 255) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.includes('..')) return false;

  return true;
}

/**
 * Validate comma-separated email list
 * @returns Object with validation result and invalid emails
 */
export function validateEmailList(csv: string): {
  valid: boolean;
  invalidEmails: string[];
} {
  if (!csv?.trim()) {
    return { valid: true, invalidEmails: [] };
  }

  const emails = csv.split(',').map(e => e.trim()).filter(Boolean);
  const invalid = emails.filter(e => !isValidEmail(e));

  return {
    valid: invalid.length === 0,
    invalidEmails: invalid
  };
}

/**
 * Get user-friendly validation error message
 */
export function getEmailValidationError(email: string): string | null {
  if (!email?.trim()) return 'Email address is required';

  if (email.length > 254) return 'Email address is too long (max 254 characters)';

  if (/[\r\n\0<>]/.test(email)) {
    return 'Email address contains invalid characters';
  }

  if (!isValidEmail(email)) {
    return 'Please enter a valid email address';
  }

  return null;
}
