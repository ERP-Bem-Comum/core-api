/**
 * EmailAddress - branded type + smart constructor.
 *
 * Module-as-namespace: consumir com `import * as EmailAddress from '...address.ts'`.
 *
 * Limite: 320 chars (RFC 5321 §4.5.3.1.3: local-part 64 + @ + domain 255).
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type EmailAddress = Brand<string, 'EmailAddress'>;

export type EmailAddressError = 'invalid-email-format' | 'email-address-too-long';

const MAX_LENGTH = 320;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const parse = (raw: string): Result<EmailAddress, EmailAddressError> => {
  if (raw.length > MAX_LENGTH) return err('email-address-too-long');
  if (!EMAIL_REGEX.test(raw)) return err('invalid-email-format');
  return ok(raw as EmailAddress);
};
