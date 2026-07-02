/**
 * Diagnóstico pré-go-live do ETL Parceiros (Achado 1 — HANDOFF §11).
 *
 * Conta, no LEGADO, duplicatas das chaves que o DESTINO (core-api) impõe como UNIQUE —
 * `cnpj`/`cpf`/`email`. O legado não tinha essas constraints; duplicatas fariam o 2º
 * registro cair em quarentena / `partners-etl-store-integrity-violation` na migração real (a ordem
 * de PK decide qual sobrevive). Este script revela o volume ANTES do go-live.
 *
 * Saída AGREGADA e **PII-FREE**: apenas CONTAGENS (total, grupos duplicados, linhas afetadas).
 * NUNCA imprime o valor de cnpj/cpf/email. Para resolver os grupos, rode a query detalhada
 * localmente (fora deste script) — os valores são PII e não devem sair em log compartilhável.
 *
 * Uso: `ETL_LEGACY_CONNECTION_STRING=mysql://etl_ro:***@host:3306/legacy pnpm run etl:check-duplicates`
 * Sem Docker (ETL-LEGACY-DIRECT-CONNECTION): conecta direto no legado pela mesma URL do reader.
 */

import process from 'node:process';

import type { RowDataPacket } from 'mysql2/promise';

import { connectReadonly } from '../legacy/connect.ts';

type Normalize = 'digits' | 'email';

type DuplicateCheck = Readonly<{
  table: string;
  column: string;
  normalize: Normalize;
  targetUnique: string;
}>;

// As chaves que o destino impõe como UNIQUE (confirmadas na integração partners/auth).
const CHECKS: readonly DuplicateCheck[] = [
  { table: 'suppliers', column: 'cnpj', normalize: 'digits', targetUnique: 'par_suppliers.cnpj' },
  { table: 'financiers', column: 'cnpj', normalize: 'digits', targetUnique: 'par_financiers.cnpj' },
  {
    table: 'collaborators',
    column: 'cpf',
    normalize: 'digits',
    targetUnique: 'par_collaborators.cpf',
  },
  {
    table: 'collaborators',
    column: 'email',
    normalize: 'email',
    targetUnique: 'par_collaborators.email',
  },
  { table: 'users', column: 'cpf', normalize: 'digits', targetUnique: 'par_user_profiles.cpf' },
  { table: 'users', column: 'email', normalize: 'email', targetUnique: 'auth_user.email' },
] as const;

// Normaliza igual ao destino: cnpj/cpf por dígitos; email por lower+trim.
const keyExpr = (column: string, normalize: Normalize): string =>
  normalize === 'digits'
    ? `REGEXP_REPLACE(\`${column}\`, '[^0-9]', '')`
    : `LOWER(TRIM(\`${column}\`))`;

// mysql2 pode entregar COUNT/SUM como number OU string (BigInt/DECIMAL) — normaliza com Number().
type DupRow = RowDataPacket &
  Readonly<{ total: number | string; dupGroups: number | string; dupRows: number | string }>;

const runChecks = async (): Promise<number> => {
  const conn = await connectReadonly();
  let entitiesWithDup = 0;
  try {
    process.stdout.write('=== Duplicatas de chaves UNIQUE do destino no legado (PII-free) ===\n\n');
    for (const check of CHECKS) {
      const key = keyExpr(check.column, check.normalize);
      const sql =
        'SELECT ' +
        `(SELECT COUNT(*) FROM \`${check.table}\`) AS total, ` +
        'COUNT(*) AS dupGroups, ' +
        'COALESCE(SUM(c), 0) AS dupRows ' +
        `FROM (SELECT ${key} AS k, COUNT(*) AS c FROM \`${check.table}\` ` +
        `WHERE \`${check.column}\` IS NOT NULL AND TRIM(\`${check.column}\`) <> '' ` +
        'GROUP BY k HAVING c > 1) AS dups';
      const [rows] = await conn.query<DupRow[]>(sql);
      const r = rows[0];
      const total = r === undefined ? 0 : Number(r.total);
      const dupGroups = r === undefined ? 0 : Number(r.dupGroups);
      const dupRows = r === undefined ? 0 : Number(r.dupRows);
      const flag = dupGroups > 0 ? ' ⚠️ DUPLICATAS' : ' ok';
      if (dupGroups > 0) entitiesWithDup += 1;
      process.stdout.write(
        `${check.targetUnique.padEnd(28)} (${check.table}.${check.column}): ` +
          `total=${String(total)} grupos_duplicados=${String(dupGroups)} ` +
          `linhas_em_duplicata=${String(dupRows)}${flag}\n`,
      );
    }
    process.stdout.write(
      `\nResumo: ${String(entitiesWithDup)}/${String(CHECKS.length)} chaves com duplicata no legado.\n`,
    );
    return entitiesWithDup;
  } finally {
    await conn.end();
  }
};

const main = async (): Promise<number> => {
  const legacyConn = process.env['ETL_LEGACY_CONNECTION_STRING'];
  if (legacyConn === undefined || legacyConn.trim() === '') {
    process.stderr.write(
      'Defina ETL_LEGACY_CONNECTION_STRING=<url do legado> (read-only, PII — nunca commitar).\n',
    );
    return 2;
  }
  await runChecks();
  return 0;
};

main().then(
  (code) => {
    process.exit(code);
  },
  (cause: unknown) => {
    process.stderr.write(`Erro inesperado: ${String(cause)}\n`);
    process.exit(1);
  },
);
