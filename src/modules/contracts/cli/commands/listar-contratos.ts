import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { listContracts } from '../../application/use-cases/list-contracts.ts';
import { formatContractSummary, formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';

// listar-contratos não tem flags do subcomando; só aceita --help/-h.
const ALLOWED = ['help', 'h'] as const;

export const descricao = 'Lista todos os contratos.';

export const help = 'Uso: listar-contratos\n\nNão recebe flags.';

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

  const useCase = listContracts({ contractRepo: ctx.contractRepo });
  const r = await useCase();

  if (!r.ok) {
    process.stderr.write(`❌ ${formatErrorCode(r.error)}\n`);
    return 1;
  }

  if (r.value.length === 0) {
    process.stdout.write('Nenhum contrato cadastrado.\n');
    return 0;
  }

  process.stdout.write(`${r.value.length} contrato(s):\n`);
  for (const contract of r.value) {
    process.stdout.write(`  - ${formatContractSummary(contract)}\n`);
    process.stdout.write(`      ID: ${contract.id as unknown as string}\n`);
  }
  return 0;
};
