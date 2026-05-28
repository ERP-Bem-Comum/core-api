/**
 * Subcomando `aprovar-titulo` — primeiro comando real da CLI do módulo Financial.
 *
 * Consome o use case `approvePayable` (FIN-USECASE-APPROVE-PAYABLE) via
 * `ctx.payableRepo` + `ctx.clock`. Permite à P.O. validar offline o fluxo
 * Open → Approved sem subir banco real.
 *
 * **Sequência canônica (.claude/rules/adapters.md):**
 *   1. `parseFlags(argv)` + `validateAllowedFlags` — rejeita typos.
 *   2. Verifica REQUIRED flags.
 *   3. Instancia `approvePayable({ payableRepo: ctx.payableRepo, clock: ctx.clock })`.
 *   4. Chama use case com strings cruas (use case faz rehydrate internamente).
 *   5. Sucesso: `ctx.persist()` + stdout `✅ Título aprovado` + bloco com info.
 *   6. Erro do use case: tratamento inline para `PayableNotOpen` (CA-8b) +
 *      `formatErrorCode` fallback genérico em stderr + exit 1 (ou 74 se
 *      `ctx.persist()` falhar após use case ok).
 *
 * **Tratamento inline para `PayableNotOpen` (CA-8b):** o formatter é
 * lookup-only e não interpola payload do tagged error. Como `PayableNotOpen`
 * carrega `currentStatus`, formatamos a mensagem **inline** antes de cair no
 * `formatErrorCode` genérico — UX melhor para a P.O. saber em qual estado o
 * título está. Se outros comandos repetirem o pattern, abre-se
 * `FIN-CLI-FORMATTER-INTERPOLATION`.
 *
 * **Comportamento idempotente (CA-8):** se `ctx.persist()` falha após o use case
 * ok, o disco fica intacto (atomic write garante) mas a memória do processo já
 * mutou. Retornamos exit 74 (IOERR); P.O. re-executa e o Payable Open ainda
 * está no disco — operação repetível sem efeito colateral.
 *
 * Pattern espelha `src/modules/contracts/cli/commands/criar-contrato.ts`.
 */

import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { approvePayable } from '../../application/use-cases/approve-payable.ts';
import type { PayableNotOpen } from '../../domain/payable/errors.ts';
import { formatErrorCode } from '../formatters/error.ts';
import { formatFlagError } from './_flag-errors.ts';

const REQUIRED = ['payable-id', 'approved-by'] as const;
const ALLOWED = [...REQUIRED, 'help', 'h'] as const;

export const descricao = 'Aprova um Título Financeiro (status Open → Approved).';

export const help = `Uso: aprovar-titulo [flags]

Flags obrigatórias:
  --payable-id <uuid>      ID do Título Financeiro a aprovar
  --approved-by <uuid>     ID do aprovador autorizado (R1 — Soberania da Aprovação)`;

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

  for (const required of REQUIRED) {
    if (flags[required] === undefined || flags[required] === '') {
      process.stderr.write(`❌ Flag obrigatória ausente: --${required}\n\n${help}\n`);
      return 64;
    }
  }

  const useCase = approvePayable({ payableRepo: ctx.payableRepo, clock: ctx.clock });
  const r = await useCase({
    payableId: flags['payable-id'] ?? '',
    approvedByRaw: flags['approved-by'] ?? '',
  });

  if (!r.ok) {
    // CA-8b: interpolação inline para PayableNotOpen (formatter é lookup-only).
    const e = r.error;
    if (typeof e === 'object' && 'tag' in e && e.tag === 'PayableNotOpen') {
      // Cast type-safe contra a forma do tagged error definida em domain/payable/errors.ts:
      // refactor que renomeie `currentStatus` quebra o build aqui imediatamente.
      const status = (e as PayableNotOpen).currentStatus;
      process.stderr.write(`❌ Título não está em estado Aberto (status atual: ${status}).\n`);
    } else {
      process.stderr.write(`❌ ${formatErrorCode(e)}\n`);
    }
    return 1;
  }

  // CA-8: comportamento idempotente — se persist falha, disco intacto.
  const persisted = await ctx.persist();
  if (!persisted.ok) {
    process.stderr.write(`❌ ${formatErrorCode(persisted.error)}\n`);
    return 74;
  }

  process.stdout.write('✅ Título aprovado.\n\n');
  process.stdout.write(`  ID:           ${r.value.payable.id}\n`);
  process.stdout.write(`  Status:       ${r.value.payable.status}\n`);
  process.stdout.write(`  Aprovado em:  ${r.value.payable.approvedAt.toISOString()}\n`);
  process.stdout.write(`  Aprovado por: ${r.value.payable.approvedBy}\n`);
  return 0;
};
