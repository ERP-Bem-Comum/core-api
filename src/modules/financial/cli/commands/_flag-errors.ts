/**
 * Helper compartilhado entre subcomandos do módulo Financial: traduz
 * `ParseFlagsError` para a string de stderr no padrão `❌ <mensagem> (--<flag>)`.
 *
 * Pattern espelha `src/modules/contracts/cli/commands/_flag-errors.ts`.
 *
 * **CANDIDATO A EXTRAÇÃO** quando 3º módulo precisar — mover para
 * `src/shared/cli/_flag-errors.ts` (também extrairia o `formatErrorCode`
 * para callback injetado, evitando dep cross-módulo dos dicionários).
 * Por enquanto: criar local em cada módulo (YAGNI; 10L duplicadas).
 */

import type { ParseFlagsError } from '../parse-flags.ts';
import { formatErrorCode } from '../formatters/error.ts';

export const formatFlagError = (error: ParseFlagsError): string => {
  const code = error.kind === 'cli-flag-duplicated' ? 'cli-flag-duplicated' : 'cli-flag-unknown';
  return `❌ ${formatErrorCode(code)} (--${error.flag})\n`;
};
