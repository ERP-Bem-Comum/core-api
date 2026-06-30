/**
 * Mapeamento da borda HTTP: corpo CSV (text/csv) → `RegisterCollaboratorCommand[]` para o use-case
 * `importCollaborators`. Consome o util compartilhado `parseCsv` (CORE-CSV-PARSE-UTIL / ADR-0002).
 *
 * Separa dois tipos de falha de linha:
 *  - **mapeamento** (coluna obrigatória vazia, data inválida) → detectada aqui (`mappingFailures`);
 *  - **domínio** (CPF/email inválido ou duplicado) → detectada pelo use-case, reconciliada na rota
 *    via `lineOf` (índice no array de commands → nº da linha no arquivo).
 *
 * Não há `Date`-coercion mágica: `startOfContract` é parseado explicitamente; data inválida é falha.
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import { parseCsv, type CsvParseError } from '#src/shared/utils/csv.ts';
import type { RegisterCollaboratorCommand } from '../../application/use-cases/register-collaborator.ts';

const REQUIRED = [
  'name',
  'email',
  'cpf',
  'occupationArea',
  'role',
  'startOfContract',
  'employmentRelationship',
] as const;

export type ImportLineFailure = Readonly<{ line: number; error: string }>;

export type ParsedCollaboratorImport = Readonly<{
  commands: readonly RegisterCollaboratorCommand[];
  /** `lineOf[i]` = nº da linha (1-based, header = 1) de origem de `commands[i]`. */
  lineOf: readonly number[];
  /** Falhas de mapeamento (não viram command). */
  mappingFailures: readonly ImportLineFailure[];
}>;

export const parseCollaboratorImportCsv = (
  content: string,
): Result<ParsedCollaboratorImport, CsvParseError> => {
  const parsed = parseCsv(content);
  if (!parsed.ok) return parsed;

  const { headers, rows } = parsed.value;
  const commands: RegisterCollaboratorCommand[] = [];
  const lineOf: number[] = [];
  const mappingFailures: ImportLineFailure[] = [];

  rows.forEach((row, i) => {
    const line = i + 2; // header ocupa a linha 1
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = row[idx] ?? '';
    });
    const get = (k: string): string => rec[k] ?? '';

    const missing = REQUIRED.filter((c) => get(c).trim() === '');
    if (missing.length > 0) {
      mappingFailures.push({ line, error: `missing-columns:${missing.join(',')}` });
      return;
    }

    const startOfContract = new Date(get('startOfContract'));
    if (Number.isNaN(startOfContract.getTime())) {
      mappingFailures.push({ line, error: 'invalid-start-of-contract' });
      return;
    }

    commands.push({
      name: get('name'),
      email: get('email'),
      cpf: get('cpf'),
      occupationArea: get('occupationArea'),
      role: get('role'),
      startOfContract,
      employmentRelationship: get('employmentRelationship'),
    });
    lineOf.push(line);
  });

  return ok({ commands, lineOf, mappingFailures });
};
