/**
 * Parser de import legado (CTR-IMPORT-LEGACY-CLI): CSV (subset RFC-4180) + JSON,
 * ambos UTF-8 → `ImportContractRow[]`. Função pura — IO de arquivo fica no comando.
 *
 * Sem dependência externa (decisão de supply-chain, ADR-0011): CSV é tokenizado à
 * mão (campos entre aspas com vírgula/quebra de linha e `""` escapado). JSON usa
 * `JSON.parse` nativo. Schema canônico (D4): numero,titulo,objetivo,assinado_em,
 * valor_centavos,inicio (obrigatórias) + fim,cnpj (opcionais).
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { tokenizeCsv } from '../../../shared/utils/csv.ts';
import type { ImportContractRow } from '../application/use-cases/import-contracts.ts';

export type ImportParseError =
  | 'import-file-empty'
  | 'import-malformed-json'
  | 'import-json-not-array'
  | 'import-row-not-object'
  | Readonly<{ kind: 'import-missing-columns'; columns: readonly string[] }>;

export type ImportFormat = 'csv' | 'json';

const REQUIRED: readonly string[] = [
  'numero',
  'titulo',
  'objetivo',
  'assinado_em',
  'valor_centavos',
  'inicio',
];

// CSV tokenizer: agora consome o util compartilhado `shared/utils/csv.ts` (tokenizeCsv),
// promovido em CORE-CSV-PARSE-UTIL (ADR-0002). A validação de colunas/mapeamento é específica
// deste módulo e permanece aqui.

// ─── Mapeamento record → ImportContractRow ──────────────────────────────────

// Coage apenas primitivos a string. Objetos/arrays (dado inválido num campo de
// importação) viram '' — a validação de domínio downstream reporta a linha como falha.
// Evita `[object Object]` silencioso (no-base-to-string).
const asString = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  return '';
};

const asNullableString = (v: unknown): string | null => {
  const s = asString(v);
  return s.trim() === '' ? null : s;
};

const recordToRow = (
  rec: Readonly<Record<string, unknown>>,
): Result<ImportContractRow, ImportParseError> => {
  const missing = REQUIRED.filter((c) => rec[c] === undefined);
  if (missing.length > 0) return err({ kind: 'import-missing-columns', columns: missing });

  const base = {
    numero: asString(rec['numero']),
    titulo: asString(rec['titulo']),
    objetivo: asString(rec['objetivo']),
    assinadoEm: asString(rec['assinado_em']),
    valorCentavos: asString(rec['valor_centavos']),
    inicio: asString(rec['inicio']),
    fim: asNullableString(rec['fim']),
  };

  const cnpj = asNullableString(rec['cnpj']);
  const row: ImportContractRow = cnpj === null ? base : { ...base, cnpj };
  return ok(row);
};

const recordsToRows = (
  recs: readonly unknown[],
): Result<readonly ImportContractRow[], ImportParseError> => {
  const rows: ImportContractRow[] = [];
  for (const rec of recs) {
    if (typeof rec !== 'object' || rec === null) return err('import-row-not-object');
    const rowR = recordToRow(rec as Readonly<Record<string, unknown>>);
    if (!rowR.ok) return rowR;
    rows.push(rowR.value);
  }
  return ok(rows);
};

// ─── Parsers por formato ─────────────────────────────────────────────────────

const parseCsv = (content: string): Result<readonly ImportContractRow[], ImportParseError> => {
  if (content.trim() === '') return err('import-file-empty');

  const records = tokenizeCsv(content);
  const [header, ...dataRecords] = records;
  if (header === undefined) return err('import-file-empty');

  const objs = dataRecords
    .filter((rec) => rec.some((f) => f.trim() !== ''))
    .map((rec) => {
      const obj: Record<string, string> = {};
      header.forEach((col, idx) => {
        obj[col] = rec[idx] ?? '';
      });
      return obj;
    });

  return recordsToRows(objs);
};

const tryParseJson = (content: string): Result<unknown, ImportParseError> => {
  try {
    return ok(JSON.parse(content));
  } catch {
    return err('import-malformed-json');
  }
};

const parseJson = (content: string): Result<readonly ImportContractRow[], ImportParseError> => {
  if (content.trim() === '') return err('import-file-empty');

  const data = tryParseJson(content);
  if (!data.ok) return data;
  if (!Array.isArray(data.value)) return err('import-json-not-array');

  return recordsToRows(data.value);
};

export const parseImportRows = (
  content: string,
  format: ImportFormat,
): Result<readonly ImportContractRow[], ImportParseError> => {
  switch (format) {
    case 'csv':
      return parseCsv(content);
    case 'json':
      return parseJson(content);
  }
};
