import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { homologateAmendment } from '../../application/use-cases/homologate-amendment.ts';
import { formatAmendment, formatContract, formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';

const ALLOWED = ['aditivo', 'contrato', 'usuario', 'help', 'h'] as const;
export const allowedFlags: readonly string[] = ALLOWED;

export const descricao = 'Homologa um Aditivo Pendente, aplicando o efeito no Contrato vigente.';

export const help = `Uso: homologar-aditivo --aditivo <uuid> --contrato <uuid> --usuario <uuid>

Flags obrigatórias:
  --aditivo <uuid>    ID do aditivo a homologar (precisa ter documento anexado)
  --contrato <uuid>   ID do contrato pai
  --usuario <uuid>    ID do usuário que homologa (UUID v4)`;

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

  for (const r of ['aditivo', 'contrato', 'usuario']) {
    if (flags[r] === undefined || flags[r] === '') {
      process.stderr.write(`❌ Flag obrigatória ausente: --${r}\n\n${help}\n`);
      return 64;
    }
  }

  const useCase = homologateAmendment({
    contractRepo: ctx.contractRepo,
    amendmentRepo: ctx.amendmentRepo,
    clock: ctx.clock,
  });

  const r = await useCase({
    amendmentId: flags['aditivo'] ?? '',
    contractId: flags['contrato'] ?? '',
    homologatedBy: flags['usuario'] ?? '',
  });

  if (!r.ok) {
    process.stderr.write(`❌ ${formatErrorCode(r.error)}\n`);
    return 1;
  }

  const persistResult = await ctx.persist();
  if (!persistResult.ok) {
    process.stderr.write(`❌ ${formatErrorCode(persistResult.error)}\n`);
    return 74; // EX_IOERR
  }
  process.stdout.write('✅ Aditivo homologado.\n\n');
  process.stdout.write(`${formatAmendment(r.value.amendment)}\n\n`);
  process.stdout.write(`${formatContract(r.value.contract)}\n`);
  return 0;
};
