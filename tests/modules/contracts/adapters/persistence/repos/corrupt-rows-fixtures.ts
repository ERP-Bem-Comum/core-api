import { MySqlDialect } from 'drizzle-orm/mysql-core';
import type { SQL } from 'drizzle-orm';

import * as schema from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { ContractRow } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';

/** Contrato `Active` + `Fixed` vencido em 2026-12-31, com o `id` e o fim de vigência dados. */
export const activeRow = (id: string, currentPeriodEnd: Date): ContractRow => ({
  id,
  sequentialNumber: `${id.slice(0, 4)}/2026`,
  title: 'Contrato vencido',
  objective: 'Objeto',
  signedAt: new Date('2026-01-15T00:00:00.000Z'),
  originalValueCents: 10_000_000,
  originalPeriodKind: 'Fixed',
  originalPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
  originalPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
  currentValueCents: 10_000_000,
  currentPeriodKind: 'Fixed',
  currentPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
  currentPeriodEnd,
  status: 'Active',
  endedAt: null,
  terminationReason: null,
  contractorType: 'supplier',
  contractorId: '55555555-5555-4555-8555-555555555555',
  classification: 'CT',
  programId: null,
  budgetPlanId: null,
  categorizacao: null,
  centroDeCusto: null,
  costCenterRef: null,
  categoryRef: null,
  subcategoryRef: null,
  observations: null,
  email: null,
  telephone: null,
});

/** Linha com o fim de vigência que o mysql2 devolve para data zerada: `Date` inválido. */
export const corruptRow = (id: string): ContractRow => activeRow(id, new Date('invalid'));

/** Linha válida vencida. */
export const validRow = (id: string): ContractRow =>
  activeRow(id, new Date('2026-12-31T00:00:00.000Z'));

/** O que o stub viu em cada `SELECT` de `ctr_contracts`: o `WHERE` renderizado pelo dialeto MySQL. */
export type SeenSelect = Readonly<{ sql: string; params: readonly unknown[] }>;

const dialect = new MySqlDialect();

/**
 * `MysqlHandle` com `db` falso. Cada `select()` sem campos (linhas de `ctr_contracts`) devolve a
 * próxima página de `pages`, e depois nenhuma; `select({ total })` devolve `total`; os demais
 * `select` (junção de aditivos) devolvem nada.
 */
export const stubHandle = (
  pages: readonly (readonly ContractRow[])[],
  total = 0,
): Readonly<{ handle: MysqlHandle; seen: SeenSelect[] }> => {
  const seen: SeenSelect[] = [];
  let page = 0;
  const query = (rows: readonly unknown[], onWhere?: (w: SQL | undefined) => void) => {
    const builder: Record<string, unknown> = {};
    for (const step of ['from', 'orderBy', 'limit', 'offset']) builder[step] = () => builder;
    builder['where'] = (w: SQL | undefined) => {
      onWhere?.(w);
      return builder;
    };
    builder['then'] = (resolve: (v: readonly unknown[]) => unknown) => resolve(rows);
    return builder;
  };
  const db = {
    select: (fields?: Record<string, unknown>) => {
      if (fields === undefined) {
        const rows = pages[page] ?? [];
        page += 1;
        return query(rows, (w) => {
          const q = w === undefined ? { sql: '', params: [] } : dialect.sqlToQuery(w);
          seen.push({ sql: q.sql, params: q.params });
        });
      }
      return query('total' in fields ? [{ total }] : []);
    },
  };
  return { handle: { db, schema } as unknown as MysqlHandle, seen };
};
