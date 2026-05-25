import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { createAmendment } from '../../application/use-cases/create-amendment.ts';
import type { CreateAmendmentCommand } from '../../application/use-cases/create-amendment.ts';
import { formatAmendment, formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';

const KINDS = ['Addition', 'Suppression', 'TermChange', 'Misc'] as const;
type Kind = (typeof KINDS)[number];

const ALLOWED = [
  'contrato',
  'numero',
  'descricao',
  'tipo',
  'valor-centavos',
  'nova-data-fim',
  'help',
  'h',
] as const;

export const descricao = 'Cria um Aditivo Pendente vinculado a um contrato.';

export const help = `Uso: criar-aditivo [flags]

Flags obrigatórias:
  --contrato <uuid>             ID do contrato pai
  --numero <string>             Numeração do aditivo (ex.: AD 01-001/2026)
  --descricao <string>          Descrição da alteração
  --tipo <kind>                 Addition | Suppression | TermChange | Misc

Flags condicionais:
  --valor-centavos <inteiro>    Obrigatório para Addition e Suppression
  --nova-data-fim <YYYY-MM-DD>  Obrigatório para TermChange`;

const buildCommand = (
  flags: Readonly<Record<string, string>>,
): CreateAmendmentCommand | { _error: string } => {
  const kindRaw = flags['tipo'] ?? '';
  if (!(KINDS as readonly string[]).includes(kindRaw)) {
    return { _error: `--tipo precisa ser um de: ${KINDS.join(', ')}` };
  }
  const kind = kindRaw as Kind;
  const base = {
    contractId: flags['contrato'] ?? '',
    amendmentNumber: flags['numero'] ?? '',
    description: flags['descricao'] ?? '',
  };

  switch (kind) {
    case 'Addition':
    case 'Suppression': {
      const valor = flags['valor-centavos'];
      if (valor === undefined || valor === '') {
        return { _error: `--valor-centavos é obrigatório para --tipo ${kind}` };
      }
      const num = Number(valor);
      if (!Number.isFinite(num)) {
        return { _error: '--valor-centavos precisa ser um número.' };
      }
      return { ...base, kind, impactValueCents: num };
    }
    case 'TermChange': {
      const data = flags['nova-data-fim'];
      if (data === undefined || data === '') {
        return {
          _error: '--nova-data-fim é obrigatório para --tipo TermChange',
        };
      }
      return { ...base, kind: 'TermChange', newEndDate: data };
    }
    case 'Misc':
      return { ...base, kind: 'Misc' };
  }
  // Exhaustive: `kind` cobre Addition | Suppression | TermChange | Misc.
};

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

  const required = ['contrato', 'numero', 'descricao', 'tipo'];
  for (const r of required) {
    if (flags[r] === undefined || flags[r] === '') {
      process.stderr.write(`❌ Flag obrigatória ausente: --${r}\n\n${help}\n`);
      return 64;
    }
  }

  const command = buildCommand(flags);
  if ('_error' in command) {
    process.stderr.write(`❌ ${command._error}\n`);
    return 64;
  }

  const useCase = createAmendment({
    contractRepo: ctx.contractRepo,
    amendmentRepo: ctx.amendmentRepo,
    clock: ctx.clock,
  });

  const r = await useCase(command);
  if (!r.ok) {
    process.stderr.write(`❌ ${formatErrorCode(r.error)}\n`);
    return 1;
  }

  const persistResult = await ctx.persist();
  if (!persistResult.ok) {
    process.stderr.write(`❌ ${formatErrorCode(persistResult.error)}\n`);
    return 74; // EX_IOERR
  }
  process.stdout.write('✅ Aditivo criado em status Pendente.\n\n');
  process.stdout.write(`${formatAmendment(r.value.amendment)}\n`);
  return 0;
};
