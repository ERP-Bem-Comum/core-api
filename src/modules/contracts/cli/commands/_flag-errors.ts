import type { ParseFlagsError } from '../parse-flags.ts';
import { formatErrorCode } from '../formatters/error.ts';

// Helper compartilhado entre subcomandos: traduz `ParseFlagsError` para a
// string de stderr no padrão `❌ <mensagem> (--<flag>)`. Centraliza o formato
// para que os 6 comandos não dupliquem o switch.
export const formatFlagError = (error: ParseFlagsError): string => {
  const code = error.kind === 'cli-flag-duplicated' ? 'cli-flag-duplicated' : 'cli-flag-unknown';
  return `❌ ${formatErrorCode(code)} (--${error.flag})\n`;
};
