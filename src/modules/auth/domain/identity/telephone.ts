/**
 * Telephone - branded type + smart constructor do modulo auth.
 *
 * Module-as-namespace (Padrao D): consumir com `import * as Telephone from '...telephone.ts'`.
 *
 * Identidade cadastral: armazena SOMENTE digitos. A mascara de apresentacao
 * ("(15)99713-3502") e responsabilidade da camada de apresentacao (FR-008 da spec 005).
 * Forma BR: 10 digitos (DDD + fixo) ou 11 digitos (DDD + celular com 9 inicial).
 * DDD valido: 11..99. Modulo isolado (ADR-0006): logica propria.
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type Telephone = Brand<string, 'Telephone'>;

export type TelephoneError = 'telephone-empty' | 'telephone-invalid';

const FIXED_LENGTH = 10;
const MOBILE_LENGTH = 11;
const MIN_DDD = 11;

const onlyDigits = (raw: string): string => raw.replace(/\D/g, '');

export const parse = (raw: string): Result<Telephone, TelephoneError> => {
  const digits = onlyDigits(raw);
  if (digits.length === 0) return err('telephone-empty');
  if (digits.length !== FIXED_LENGTH && digits.length !== MOBILE_LENGTH) {
    return err('telephone-invalid');
  }

  const ddd = Number(digits.slice(0, 2));
  if (ddd < MIN_DDD) return err('telephone-invalid');

  // Celular (11 digitos): o primeiro digito do numero (apos o DDD) e sempre 9.
  if (digits.length === MOBILE_LENGTH && digits.slice(2, 3) !== '9') {
    return err('telephone-invalid');
  }

  // Cast unico e auditado (SKILL ts-domain-modeler 3.B.4): borda do sistema de tipos.
  return ok(digits as Telephone);
};
