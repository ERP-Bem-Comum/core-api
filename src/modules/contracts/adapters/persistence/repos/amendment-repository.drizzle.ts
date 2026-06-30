import { asc, eq } from 'drizzle-orm';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../../../domain/amendment/repository.ts';
import type { Amendment } from '../../../domain/amendment/types.ts';
import type { AmendmentId, ContractId } from '../../../domain/shared/ids.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';
import { amendmentFromRow, amendmentToInsert } from '../mappers/amendment.mapper.ts';
import { appendOutboxInTx } from './outbox-repository.drizzle.ts';
import { formatAmendmentNumber } from '../../../domain/amendment/amendment-number.ts';
import process from 'node:process';

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
    // CTR-AMENDMENT-SIGNEDAT-AND-NUMBER (G3): gera o próximo número do aditivo por contrato.
    // Padrão CHILD_CODES (Refman 8.4 §17.7.2.4): INSERT...ODKU garante a linha do contrato (a PK
    // `contract_id` é a única UNIQUE — ODKU dirigível) → SELECT last_seq FOR UPDATE (lock exclusivo,
    // serializa geradores concorrentes) → UPDATE +1 → formata `NN/AAAA`.
    nextAmendmentNumber: async (contractId: ContractId, year: number) =>
      safe('nextAmendmentNumber', async () =>
        db.transaction(async (tx) => {
          const cid = contractId as unknown as string;
          await tx
            .insert(schema.ctrAmendmentSeq)
            .values({ contractId: cid, lastSeq: 0 })
            .onDuplicateKeyUpdate({ set: { contractId: cid } });

          const rows = await tx
            .select({ lastSeq: schema.ctrAmendmentSeq.lastSeq })
            .from(schema.ctrAmendmentSeq)
            .where(eq(schema.ctrAmendmentSeq.contractId, cid))
            .for('update');

          const nextSeq = (rows[0]?.lastSeq ?? 0) + 1;
          await tx
            .update(schema.ctrAmendmentSeq)
            .set({ lastSeq: nextSeq })
            .where(eq(schema.ctrAmendmentSeq.contractId, cid));

          return formatAmendmentNumber(nextSeq, year);
        }),
      ),

    findById: async (id: AmendmentId) =>
      safe('findById', async () => {
        const rows = await db
          .select()
          .from(schema.amendments)
          .where(eq(schema.amendments.id, id as unknown as string));
        const row = rows[0];
        if (row === undefined) return null;
        const r = amendmentFromRow(row);
        if (!r.ok) throw new Error(r.error.tag);
        return r.value as Amendment | null;
      }),

    // Leitura agregada: aditivos do contrato (índice `ctr_amendments_contract_id_idx`),
    // ordenados por `amendment_number` asc — paridade com o adapter InMemory.
    findByContractId: async (contractId: ContractId) =>
      safe('findByContractId', async () => {
        const rows = await db
          .select()
          .from(schema.amendments)
          .where(eq(schema.amendments.contractId, contractId as unknown as string))
          .orderBy(asc(schema.amendments.amendmentNumber));
        const amendments: Amendment[] = [];
        for (const row of rows) {
          const r = amendmentFromRow(row);
          if (!r.ok) throw new Error(r.error.tag);
          amendments.push(r.value);
        }
        return amendments as readonly Amendment[];
      }),

    // CA-3: save(amendment, events) abre UMA transação que persiste state + outbox atomicamente.
    save: async (amendment: Amendment, events: readonly ContractsModuleEvent[]) =>
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
          // CA-3: outbox appended atomically within the same transaction.
          await appendOutboxInTx(tx, schema, events);
        });
      }),
  };
};
