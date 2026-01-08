import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  validateEmailList,
  getEmailValidationError,
} from '../validation';

describe('validation', () => {
  describe('isValidEmail', () => {
    it('should accept valid basic emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('john.doe@company.co.uk')).toBe(true);
      expect(isValidEmail('test_user@subdomain.example.com')).toBe(true);
    });

    it('should accept emails with plus addressing', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('user+shopping@example.com')).toBe(true);
    });

    it('should accept various valid formats', () => {
      expect(isValidEmail('a@b.co')).toBe(true);
      expect(isValidEmail('user123@test-domain.com')).toBe(true);
      expect(isValidEmail('first.last+tag@example.co.uk')).toBe(true);
    });

    it('should reject emails without @ symbol', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
      expect(isValidEmail('user')).toBe(false);
    });

    it('should reject emails without domain', () => {
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should reject header injection attempts', () => {
      expect(isValidEmail('test\r\nBcc:evil@example.com')).toBe(false);
      expect(isValidEmail('test\rBcc:evil@example.com')).toBe(false);
      expect(isValidEmail('test\nBcc:evil@example.com')).toBe(false);
    });

    it('should reject emails with dangerous characters', () => {
      expect(isValidEmail('test<script>@example.com')).toBe(false);
      expect(isValidEmail('test>evil@example.com')).toBe(false);
      expect(isValidEmail('test@evil>.com')).toBe(false);
    });

    it('should reject overly long emails', () => {
      const longLocal = 'a'.repeat(256);
      expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
    });

    it('should reject emails with local part > 64 chars', () => {
      const longLocal = 'a'.repeat(65);
      expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
    });

    it('should reject emails with domain > 255 chars', () => {
      const longDomain = 'a'.repeat(256) + '.com';
      expect(isValidEmail(`user@${longDomain}`)).toBe(false);
    });

    it('should reject domains starting or ending with dot', () => {
      expect(isValidEmail('user@.example.com')).toBe(false);
      expect(isValidEmail('user@example.com.')).toBe(false);
    });

    it('should reject domains with consecutive dots', () => {
      expect(isValidEmail('user@example..com')).toBe(false);
      expect(isValidEmail('user@sub..domain.com')).toBe(false);
    });

    it('should reject empty or null input', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('   ')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('user@localhost')).toBe(true); // Valid per RFC
      expect(isValidEmail('user@192.168.1.1')).toBe(true); // IP address domain
    });
  });

  describe('validateEmailList', () => {
    it('should validate single valid email', () => {
      const result = validateEmailList('user@example.com');
      expect(result.valid).toBe(true);
      expect(result.invalidEmails).toEqual([]);
    });

    it('should validate multiple valid emails', () => {
      const result = validateEmailList('user1@example.com, user2@test.com, user3@domain.co.uk');
      expect(result.valid).toBe(true);
      expect(result.invalidEmails).toEqual([]);
    });

    it('should handle whitespace around emails', () => {
      const result = validateEmailList('  user1@example.com  ,  user2@test.com  ');
      expect(result.valid).toBe(true);
      expect(result.invalidEmails).toEqual([]);
    });

    it('should reject list with one invalid email', () => {
      const result = validateEmailList('user1@example.com, invalid-email, user3@domain.com');
      expect(result.valid).toBe(false);
      expect(result.invalidEmails).toEqual(['invalid-email']);
    });

    it('should identify all invalid emails', () => {
      const result = validateEmailList('user1@example.com, bad1, user2@test.com, bad2@');
      expect(result.valid).toBe(false);
      expect(result.invalidEmails).toContain('bad1');
      expect(result.invalidEmails).toContain('bad2@');
      expect(result.invalidEmails).toHaveLength(2);
    });

    it('should handle empty string', () => {
      const result = validateEmailList('');
      expect(result.valid).toBe(true);
      expect(result.invalidEmails).toEqual([]);
    });

    it('should handle whitespace-only string', () => {
      const result = validateEmailList('   ');
      expect(result.valid).toBe(true);
      expect(result.invalidEmails).toEqual([]);
    });

    it('should filter out empty entries from commas', () => {
      const result = validateEmailList('user1@example.com,,user2@test.com,');
      expect(result.valid).toBe(true);
      expect(result.invalidEmails).toEqual([]);
    });
  });

  describe('getEmailValidationError', () => {
    it('should return null for valid email', () => {
      expect(getEmailValidationError('user@example.com')).toBeNull();
      expect(getEmailValidationError('user+tag@example.com')).toBeNull();
    });

    it('should return error for empty email', () => {
      const error = getEmailValidationError('');
      expect(error).not.toBeNull();
      expect(error).toContain('required');
    });

    it('should return error for whitespace-only email', () => {
      const error = getEmailValidationError('   ');
      expect(error).not.toBeNull();
      expect(error).toContain('required');
    });

    it('should return error for overly long email', () => {
      const longEmail = 'a'.repeat(256) + '@example.com';
      const error = getEmailValidationError(longEmail);
      expect(error).not.toBeNull();
      expect(error).toContain('too long');
      expect(error).toContain('254');
    });

    it('should return error for dangerous characters', () => {
      const error = getEmailValidationError('test\r\nBcc:evil@example.com');
      expect(error).not.toBeNull();
      expect(error).toContain('invalid characters');
    });

    it('should return error for invalid format', () => {
      const error = getEmailValidationError('not-an-email');
      expect(error).not.toBeNull();
      expect(error).toContain('valid email');
    });

    it('should provide user-friendly messages', () => {
      const error1 = getEmailValidationError('test@');
      const error2 = getEmailValidationError('@example.com');
      const error3 = getEmailValidationError('no-at-sign');

      expect(error1).toContain('valid');
      expect(error2).toContain('valid');
      expect(error3).toContain('valid');
    });
  });
});
