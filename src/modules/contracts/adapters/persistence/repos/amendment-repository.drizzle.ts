import { eq } from 'drizzle-orm';

import { type Result, ok, err } from '../../../../../shared/result.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../../../application/ports/amendment-repository.ts';
import type { Amendment } from '../../../domain/amendment/types.ts';
import type { AmendmentId } from '../../../domain/shared/ids.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';
import { amendmentFromRow, amendmentToInsert } from '../mappers/amendment.mapper.ts';

// W2 NOTE 1: erro original registrado via stderr antes de ser substituído
// pelo código do port (que só conhece `amendment-repo-unavailable`).
const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, AmendmentRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[amendment-repo:${ctx}] ${String(cause)}\n`);
    return err('amendment-repo-unavailable');
  }
};

// Drizzle MySQL `MySql2Database` expõe interface internamente mutável.
// Handle é leitura — não mutamos.
export const createDrizzleAmendmentRepository = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): AmendmentRepository => {
  const { db, schema } = handle;

  return {
    findById: async (id: AmendmentId) =>
      safe('findById', async () => {
        const rows = await db
          .select()
          .from(schema.amendments)
          .where(eq(schema.amendments.id, id as unknown as string));
        const row = rows[0];
        if (row === undefined) return null;
        const r = amendmentFromRow(row);
        if (!r.ok) throw new Error(r.error);
        return r.value as Amendment | null;
      }),

    save: async (amendment: Amendment) =>
      safe('save', async () => {
        const row = amendmentToInsert(amendment);
        // Upsert estrito por PK (`id`). Mesma motivação do `contract-repository.drizzle.ts`:
        // `ON DUPLICATE KEY UPDATE` do MySQL dispara em QUALQUER UNIQUE violada
        // (Refman §13.2.6.2), não é dirigível como Postgres/SQLite `ON CONFLICT (col)`.
        // Hoje `ctr_amendments` só tem UNIQUE na PK — ODKU seria correto neste
        // momento. Mantemos o padrão SELECT-then por consistência com `contract-repository`
        // e como defesa preventiva: quando uma UNIQUE secundária for adicionada
        // (ex.: composta `(contract_id, amendment_number)`), o repo já está pronto.
        await db.transaction(async (tx) => {
          // Audit §M3 — gap/next-key lock no SELECT pré-INSERT/UPDATE evita
          // ER_DUP_ENTRY falso por corrida entre tx concorrentes. Refman §15.7.
          const existing = await tx
            .select({ id: schema.amendments.id })
            .from(schema.amendments)
            .where(eq(schema.amendments.id, row.id))
            .for('update');
          if (existing.length > 0) {
            await tx.update(schema.amendments).set(row).where(eq(schema.amendments.id, row.id));
          } else {
            await tx.insert(schema.amendments).values(row);
          }
        });
      }),
  };
};
