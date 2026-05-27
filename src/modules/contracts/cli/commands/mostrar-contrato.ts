import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { getContract } from '../../application/use-cases/get-contract.ts';
import { formatContract, formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';

const ALLOWED = ['id', 'help', 'h'] as const;
export const allowedFlags: readonly string[] = ALLOWED;

export const descricao = 'Mostra detalhes de um contrato pelo ID.';

export const help = `Uso: mostrar-contrato --id <uuid>

Flags obrigatórias:
  --id <uuid>    ID do contrato`;

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

  if (flags['id'] === undefined || flags['id'] === '') {
    process.stderr.write(`❌ Flag obrigatória ausente: --id\n\n${help}\n`);
    return 64;
  }

  const useCase = getContract({ contractRepo: ctx.contractRepo });
  const r = await useCase({ contractId: flags['id'] });

  if (!r.ok) {
    process.stderr.write(`❌ ${formatErrorCode(r.error)}\n`);
    return 1;
  }

  process.stdout.write(`${formatContract(r.value)}\n`);
  return 0;
};
