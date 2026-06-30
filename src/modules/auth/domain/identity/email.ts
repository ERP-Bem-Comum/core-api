/**
 * Email - branded type + smart constructor do modulo auth.
 *
 * Module-as-namespace (Padrao D): consumir com `import * as Email from '...email.ts'`.
 *
 * Identidade de login: normaliza trim + toLowerCase (email e case-insensitive na pratica;
 * evita duplicata de usuario por diferenca de caixa).
 * Limite 254 chars (RFC 5321, reverse-path pratico) - menor que o EmailAddress de
 * notifications (320) por ser chave de identidade. Modulos isolados (ADR-0006): regex
 * de formato replicada, nao importada cross-modulo.
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type Email = Brand<string, 'Email'>;

export type EmailError = 'email-empty' | 'email-invalid-format' | 'email-too-long';

const MAX_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const parse = (raw: string): Result<Email, EmailError> => {
  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0) return err('email-empty');
  if (normalized.length > MAX_LENGTH) return err('email-too-long');
  if (!EMAIL_REGEX.test(normalized)) return err('email-invalid-format');
  // Cast unico e auditado (SKILL ts-domain-modeler 3.B.4): borda do sistema de tipos.
  return ok(normalized as Email);
};
