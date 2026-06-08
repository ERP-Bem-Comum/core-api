import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { endContract } from '../../application/use-cases/end-contract.ts';
import type { EndContractKind } from '../../application/use-cases/end-contract.ts';
import { formatContract, formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';

const ALLOWED = ['contrato', 'motivo', 'data', 'justificativa', 'help', 'h'] as const;
export const allowedFlags: readonly string[] = ALLOWED;

// PT-BR na borda (CLAUDE.md §Idioma): `expiracao`/`distrato` → kind do domínio.
const MOTIVO_TO_KIND: Readonly<Record<string, EndContractKind>> = {
  expiracao: 'Expire',
  distrato: 'Terminate',
};

export const descricao = 'Encerra um Contrato vigente (expiração por data fim ou distrato).';

export const help = `Uso: encerrar-contrato --contrato <uuid> --motivo <expiracao|distrato>

Flags obrigatórias:
  --contrato <uuid>   ID do contrato a encerrar
  --motivo <motivo>   expiracao (chegada da data fim) | distrato (rescisão antecipada)

Flags do distrato (--motivo distrato; CTR-HTTP-DISTRATO-DOCUMENTO):
  --data <YYYY-MM-DD>      data efetiva do distrato (obrigatória, não-futura)
  --justificativa <texto>  motivo/justificativa do distrato (obrigatória)
                           exige documento "signed_termination" vinculado ao contrato`;

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

  for (const required of ['contrato', 'motivo']) {
    if (flags[required] === undefined || flags[required] === '') {
      process.stderr.write(`❌ Flag obrigatória ausente: --${required}\n\n${help}\n`);
      return 64;
    }
  }

  const motivo = flags['motivo'] ?? '';
  const kind = MOTIVO_TO_KIND[motivo];
  if (kind === undefined) {
    process.stderr.write(
      `❌ Motivo inválido: "${motivo}". Use: expiracao | distrato.\n\n${help}\n`,
    );
    return 64;
  }

  const useCase = endContract({
    contractRepo: ctx.contractRepo,
    documentRepo: ctx.documentRepo,
    clock: ctx.clock,
  });
  const contractId = flags['contrato'] ?? '';
  if (kind === 'Terminate') {
    const data = flags['data'] ?? '';
    const justificativa = flags['justificativa'] ?? '';
    if (data === '' || justificativa === '') {
      process.stderr.write(
        `❌ Distrato exige --data <YYYY-MM-DD> e --justificativa <texto>.\n\n${help}\n`,
      );
      return 64;
    }
    const r = await useCase({
      contractId,
      kind,
      terminatedAt: data,
      reason: justificativa,
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
    process.stdout.write('✅ Contrato encerrado.\n\n');
    process.stdout.write(`${formatContract(r.value.contract)}\n`);
    return 0;
  }

  const r = await useCase({ contractId, kind });

  if (!r.ok) {
    process.stderr.write(`❌ ${formatErrorCode(r.error)}\n`);
    return 1;
  }

  const persistResult = await ctx.persist();
  if (!persistResult.ok) {
    process.stderr.write(`❌ ${formatErrorCode(persistResult.error)}\n`);
    return 74; // EX_IOERR
  }

  process.stdout.write('✅ Contrato encerrado.\n\n');
  process.stdout.write(`${formatContract(r.value.contract)}\n`);
  return 0;
};
