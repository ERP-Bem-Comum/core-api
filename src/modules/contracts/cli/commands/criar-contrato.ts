import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { createContract } from '../../application/use-cases/create-contract.ts';
import { createPendingContract } from '../../application/use-cases/create-pending-contract.ts';
import { formatContract, formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';

// `assinado-em` é OPCIONAL (ADR-0023): sem ela, o contrato nasce Pendente.
const REQUIRED = [
  'numero',
  'titulo',
  'objetivo',
  'valor-centavos',
  'inicio',
  'contratado-tipo',
  'contratado-id',
] as const;

const ALLOWED = [...REQUIRED, 'assinado-em', 'fim', 'sem-fim', 'help', 'h'] as const;
export const allowedFlags: readonly string[] = ALLOWED;

export const descricao = 'Cria um Contrato Mãe (Pendente sem --assinado-em; Em Andamento com).';

export const help = `Uso: criar-contrato [flags]

Flags obrigatórias:
  --numero <string>             Numeração sequencial do contrato (ex.: 001/2026)
  --titulo <string>             Título do contrato
  --objetivo <string>           Objetivo / descrição
  --valor-centavos <inteiro>    Valor original em centavos (ex.: 10000000 = R$ 100.000,00)
  --inicio <YYYY-MM-DD>         Início da vigência
  --contratado-tipo <tipo>      Tipo do contratado: supplier | financier | collaborator | act
  --contratado-id <uuid>        Id (UUID v4) do contratado no módulo Parceiros

Flags opcionais:
  --assinado-em <YYYY-MM-DD>    Data de assinatura. Sem ela, o contrato nasce Pendente
                                (ativar depois com documento assinado).
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

  // `--sem-fim` = vigência indefinida (sinônimo explícito de omitir --fim).
  // `--fim <date>` = vigência fixa.
  const semFimRequested = flags['sem-fim'] !== undefined;
  const fimRaw = flags['fim'];
  const periodEnd = semFimRequested || fimRaw === undefined || fimRaw === '' ? null : fimRaw;

  const sequentialNumber = flags['numero'] ?? '';
  const title = flags['titulo'] ?? '';
  const objective = flags['objetivo'] ?? '';
  const periodStart = flags['inicio'] ?? '';
  const signedAtRaw = flags['assinado-em'];
  const contractorType = flags['contratado-tipo'] ?? '';
  const contractorId = flags['contratado-id'] ?? '';

  // ADR-0023: com `--assinado-em` nasce Ativo; sem ela, Pendente.
  const r =
    signedAtRaw !== undefined && signedAtRaw !== ''
      ? await createContract({ contractRepo: ctx.contractRepo, clock: ctx.clock })({
          sequentialNumber,
          title,
          objective,
          signedAt: signedAtRaw,
          originalValueCents: valorCentavos,
          originalPeriodStart: periodStart,
          originalPeriodEnd: periodEnd,
          contractorType,
          contractorId,
        })
      : await createPendingContract({ contractRepo: ctx.contractRepo, clock: ctx.clock })({
          sequentialNumber,
          title,
          objective,
          originalValueCents: valorCentavos,
          periodStart,
          periodEnd,
          contractorType,
          contractorId,
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
