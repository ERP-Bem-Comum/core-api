import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { createContract } from '../../application/use-cases/create-contract.ts';
import { formatContract, formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';

const REQUIRED = [
  'numero',
  'titulo',
  'objetivo',
  'assinado-em',
  'valor-centavos',
  'inicio',
] as const;

const ALLOWED = [...REQUIRED, 'fim', 'sem-fim', 'help', 'h'] as const;

export const descricao = 'Cria um novo Contrato Mãe (status Ativo).';

export const help = `Uso: criar-contrato [flags]

Flags obrigatórias:
  --numero <string>             Numeração sequencial do contrato (ex.: 001/2026)
  --titulo <string>             Título do contrato
  --objetivo <string>           Objetivo / descrição
  --assinado-em <YYYY-MM-DD>    Data de assinatura
  --valor-centavos <inteiro>    Valor original em centavos (ex.: 10000000 = R$ 100.000,00)
  --inicio <YYYY-MM-DD>         Início da vigência

Flag opcional:
  --fim <YYYY-MM-DD>            Fim da vigência (omita para vigência indefinida)`;

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

  const valorCentavos = Number(flags['valor-centavos']);
  if (!Number.isFinite(valorCentavos)) {
    process.stderr.write('❌ --valor-centavos precisa ser um número.\n');
    return 64;
  }

  const useCase = createContract({
    contractRepo: ctx.contractRepo,
    clock: ctx.clock,
  });

  // `--sem-fim` = vigência indefinida (sinônimo explícito de omitir --fim).
  // `--fim <date>` = vigência fixa.
  const semFimRequested = flags['sem-fim'] !== undefined;
  const fimRaw = flags['fim'];
  const originalPeriodEnd =
    semFimRequested || fimRaw === undefined || fimRaw === '' ? null : fimRaw;

  const r = await useCase({
    sequentialNumber: flags['numero'] ?? '',
    title: flags['titulo'] ?? '',
    objective: flags['objetivo'] ?? '',
    signedAt: flags['assinado-em'] ?? '',
    originalValueCents: valorCentavos,
    originalPeriodStart: flags['inicio'] ?? '',
    originalPeriodEnd,
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
  process.stdout.write('✅ Contrato criado.\n\n');
  process.stdout.write(`${formatContract(r.value.contract)}\n`);
  return 0;
};
