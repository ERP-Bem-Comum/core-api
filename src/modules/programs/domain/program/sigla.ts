import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// VO Sigla: identificador curto do programa. Normalizado (trim + uppercase) e
// validado [A-Z0-9]{2,20}. A unicidade case-insensitive e garantida na persistencia
// pela coluna ja normalizada + UNIQUE (a aplicacao sempre grava o valor normalizado).

export type Sigla = Brand<string, 'Sigla'>;
export type SiglaError = 'program-sigla-invalid';

const SIGLA_FORMAT = /^[A-Z0-9]{2,20}$/;

export const create = (raw: string): Result<Sigla, SiglaError> => {
  const normalized = raw.trim().toUpperCase();
  return SIGLA_FORMAT.test(normalized) ? ok(normalized as Sigla) : err('program-sigla-invalid');
};

export const value = (sigla: Sigla): string => sigla;
