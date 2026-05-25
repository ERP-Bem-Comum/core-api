/**
 * excluir-documento — comando CLI para exclusao logica de ContractDocument (RN-11).
 *
 * Ticket: CTR-USECASE-DELETE-DOCUMENT.
 *
 * Chama use case `deleteDocument` + persist do estado (driver memory).
 *
 * ASCII puro.
 */

import process from 'node:process';
import { randomUUID } from 'node:crypto';

import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';
import { deleteDocument } from '../../application/use-cases/delete-document.ts';

const ALLOWED = ['documento', 'motivo', 'user-id', 'help', 'h'] as const;

export const descricao = 'Exclui logicamente um documento (RN-11) preservando audit trail.';

export const help = `Uso: excluir-documento --documento <uuid> --motivo <texto> [--user-id <uuid>]

Flags obrigatorias:
  --documento <uuid>   ID do documento (UUID v4)
  --motivo <texto>     Motivo da exclusao (1-500 chars)

Flags opcionais:
  --user-id <uuid>     UserRef de quem excluiu (default = randomUUID)`;

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

  for (const r of ['documento', 'motivo']) {
    if (flags[r] === undefined || flags[r] === '') {
      process.stderr.write(`Flag obrigatoria ausente: --${r}\n\n${help}\n`);
      return 64;
    }
  }

  const userId = flags['user-id'] ?? randomUUID();

  const useCase = deleteDocument({
    clock: ctx.clock,
    documentRepo: ctx.documentRepo,
  });

  const r = await useCase({
    documentId: flags['documento'] ?? '',
    deletedReason: flags['motivo'] ?? '',
    deletedBy: userId,
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

  process.stdout.write(`Documento excluido logicamente.\nID: ${String(r.value.document.id)}\n`);
  process.stdout.write(`Motivo: ${r.value.document.deletedReason}\n`);
  return 0;
};
