/**
 * Subcomando `mostrar-titulo` — comando read-only da CLI do módulo Financial.
 *
 * Consome o use case `getPayable` via `ctx.payableRepo` (sem clock — query
 * não precisa de timestamp). Imprime o título formatado em PT-BR com narrow
 * por status (Open, Approved, Transmitted, Rejected, Overdue, Paid, Settled).
 *
 * **Sequência canônica (.claude/rules/adapters.md):**
 *   1. `parseFlags(argv)` + `validateAllowedFlags` — rejeita typos.
 *   2. Verifica REQUIRED flag `--payable-id`.
 *   3. Instancia `getPayable({ payableRepo: ctx.payableRepo })`.
 *   4. Chama use case com string crua (use case faz rehydrate).
 *   5. Sucesso: stdout com `formatPayable(payable)` + exit 0.
 *   6. Erro: `formatErrorCode` em stderr + exit 1.
 *
 * **Sem `ctx.persist()`** — read-only não muta state file.
 *
 * Pattern espelha `src/modules/contracts/cli/commands/mostrar-contrato.ts`.
 */

import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { getPayable } from '../../application/use-cases/get-payable.ts';
import { formatErrorCode, formatPayable } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';

const ALLOWED = ['payable-id', 'help', 'h'] as const;

export const descricao = 'Mostra detalhes de um Título Financeiro pelo ID.';

export const help = `Uso: mostrar-titulo --payable-id <uuid>

Flags obrigatórias:
  --payable-id <uuid>      ID do Título Financeiro a inspecionar`;

export const run = async (ctx: CliContext, argv: readonly string[]): Promise<number> => {
  const parsed = parseFlags(argv);
  if (!parsed.ok) {
    process.stderr.write(formatFlagError(parsed.error));
    return 64;
  }
  const allowed = validateAllowedFlags(parsed.value, ALLOWED);
  if (!allowed.ok) {
    process.stderr.write(formatFlagError(allowed.error));
    return 64;
  }
  const flags = parsed.value;

  if (flags['payable-id'] === undefined || flags['payable-id'] === '') {
    process.stderr.write(`❌ Flag obrigatória ausente: --payable-id\n\n${help}\n`);
    return 64;
  }

  const useCase = getPayable({ payableRepo: ctx.payableRepo });
  const r = await useCase({ payableId: flags['payable-id'] });

  if (!r.ok) {
    process.stderr.write(`❌ ${formatErrorCode(r.error)}\n`);
    return 1;
  }

  process.stdout.write(`${formatPayable(r.value)}\n`);
  return 0;
};
