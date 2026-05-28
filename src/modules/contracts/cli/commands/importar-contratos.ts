import process from 'node:process';
import { readFile } from 'node:fs/promises';

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { formatFlagError } from './_flag-errors.ts';
import { parseImportRows } from '../import-parser.ts';
import type { ImportFormat } from '../import-parser.ts';
import { importContracts } from '../../application/use-cases/import-contracts.ts';
import {
  formatErrorCode,
  formatImportReport,
  formatImportParseError,
} from '../formatters/index.ts';

const ALLOWED = ['arquivo', 'formato', 'confirmar', 'help', 'h'] as const;
export const allowedFlags: readonly string[] = ALLOWED;

export const descricao =
  'Importa Contratos Mãe de um arquivo CSV/JSON (UTF-8). Dry-run por padrão; --confirmar persiste.';

export const help = `Uso: importar-contratos --arquivo <path> [--formato csv|json] [--confirmar]

Flags obrigatórias:
  --arquivo <path>     arquivo CSV ou JSON em UTF-8

Flags opcionais:
  --formato <csv|json> força o formato (default: inferido da extensão)
  --confirmar          persiste de fato (sem esta flag, roda em dry-run)

Schema (CSV header / JSON keys): numero, titulo, objetivo, assinado_em,
valor_centavos, inicio [, fim, cnpj]. Colunas extras são ignoradas.`;

const readFileUtf8 = async (path: string): Promise<Result<string, 'read-failed'>> => {
  try {
    return ok(await readFile(path, 'utf-8'));
  } catch {
    return err('read-failed');
  }
};

const detectFormat = (arquivo: string, formatoFlag: string | undefined): ImportFormat | null => {
  if (formatoFlag === 'csv' || formatoFlag === 'json') return formatoFlag;
  if (formatoFlag !== undefined && formatoFlag !== '') return null;
  if (arquivo.endsWith('.csv')) return 'csv';
  if (arquivo.endsWith('.json')) return 'json';
  return null;
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

  const arquivo = flags['arquivo'];
  if (arquivo === undefined || arquivo === '') {
    process.stderr.write(`❌ Flag obrigatória ausente: --arquivo\n\n${help}\n`);
    return 64;
  }

  const format = detectFormat(arquivo, flags['formato']);
  if (format === null) {
    process.stderr.write(
      '❌ Formato desconhecido. Use --formato csv|json ou extensão .csv/.json.\n',
    );
    return 64;
  }

  const read = await readFileUtf8(arquivo);
  if (!read.ok) {
    process.stderr.write(`❌ Não foi possível ler o arquivo: ${arquivo}\n`);
    return 66; // EX_NOINPUT
  }

  const rows = parseImportRows(read.value, format);
  if (!rows.ok) {
    process.stderr.write(`❌ ${formatImportParseError(rows.error)}\n`);
    return 65; // EX_DATAERR
  }

  const dryRun = !('confirmar' in flags);

  const useCase = importContracts({ contractRepo: ctx.contractRepo, clock: ctx.clock });
  const result = await useCase({ rows: rows.value, dryRun });
  if (!result.ok) {
    process.stderr.write(`❌ ${formatErrorCode(result.error)}\n`);
    return 74; // EX_IOERR
  }

  if (!dryRun) {
    const persistResult = await ctx.persist();
    if (!persistResult.ok) {
      process.stderr.write(`❌ ${formatErrorCode(persistResult.error)}\n`);
      return 74;
    }
  }

  process.stdout.write(`${formatImportReport(result.value)}\n`);
  return 0;
};
