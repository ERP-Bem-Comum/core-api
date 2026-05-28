/**
 * substituir-documento — comando CLI para substituir documento por nova versao (RN-AS-02).
 *
 * Ticket: CTR-USECASE-SUPERSEDE-DOCUMENT.
 *
 * ASCII puro.
 */

import process from 'node:process';
import { randomUUID } from 'node:crypto';

import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';
import { supersedeDocument } from '../../application/use-cases/supersede-document.ts';

const ALLOWED = ['documento', 'substituido-por', 'user-id', 'help', 'h'] as const;
export const allowedFlags: readonly string[] = ALLOWED;

export const descricao = 'Substitui um documento por nova versao (RN-AS-02) preservando audit.';

export const help = `Uso: substituir-documento --documento <uuid> --substituido-por <uuid> [--user-id <uuid>]

Flags obrigatorias:
  --documento <uuid>          ID do documento a substituir
  --substituido-por <uuid>    ID do documento substituto (nova versao)

Flags opcionais:
  --user-id <uuid>            UserRef de quem substituiu (default = randomUUID)`;

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

  for (const r of ['documento', 'substituido-por']) {
    if (flags[r] === undefined || flags[r] === '') {
      process.stderr.write(`Flag obrigatoria ausente: --${r}\n\n${help}\n`);
      return 64;
    }
  }

  const userId = flags['user-id'] ?? randomUUID();

  const useCase = supersedeDocument({
    clock: ctx.clock,
    documentRepo: ctx.documentRepo,
  });

  const r = await useCase({
    documentId: flags['documento'] ?? '',
    supersededByDocumentId: flags['substituido-por'] ?? '',
    supersededBy: userId,
  });

  if (!r.ok) {
    process.stderr.write(`${formatErrorCode(r.error)}\n`);
    return 1;
  }

  const persistResult = await ctx.persist();
  if (!persistResult.ok) {
    process.stderr.write(`${formatErrorCode(persistResult.error)}\n`);
    return 74;
  }

  process.stdout.write(`Documento substituido.\nID: ${String(r.value.document.id)}\n`);
  process.stdout.write(`Substituido por: ${String(r.value.document.supersededByDocumentId)}\n`);
  return 0;
};
