/**
 * EmailSubject - branded type + smart constructor.
 *
 * Module-as-namespace: consumir com `import * as EmailSubject from '...subject.ts'`.
 *
 * Limite: 998 chars (RFC 5322 §2.1.1: max line length excluindo CRLF).
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type EmailSubject = Brand<string, 'EmailSubject'>;

export type EmailSubjectError = 'empty-subject' | 'subject-too-long';

const MAX_LENGTH = 998;

export const parse = (raw: string): Result<EmailSubject, EmailSubjectError> => {
  if (raw.length === 0) return err('empty-subject');
  if (raw.length > MAX_LENGTH) return err('subject-too-long');
  return ok(raw as EmailSubject);
};
