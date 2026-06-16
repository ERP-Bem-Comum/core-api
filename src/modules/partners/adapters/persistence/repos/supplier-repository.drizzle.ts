// Adapter Drizzle de SupplierRepository (módulo partners).
//
//   - findById/findByCnpj/list: SELECT + mapper.
//   - save: UMA transação — SELECT-then-UPDATE-or-INSERT do supplier (ADR-0020 — sem ON
//     DUPLICATE KEY) + appendOutboxInTx dos eventos publicáveis, na MESMA tx (atomicidade
//     estado+outbox — ADR-0015/0043). UNIQUE `par_suppliers_cnpj_idx` → ER_DUP_ENTRY (1062)
//     → rollback total → supplier-cnpj-duplicate.
//
// ADR-0020: sem ODKU. ADR-0014: só par_*. Boundary: try/catch → Result (zero throw).

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type {
  SupplierRepository,
  SupplierRepositoryError,
} from '#src/modules/partners/domain/supplier/repository.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';
import type { SupplierEvent } from '#src/modules/partners/domain/supplier/events.ts';
import type { SupplierId } from '#src/modules/partners/domain/supplier/supplier-id.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  supplierToInsert,
  supplierFromRow,
  type SupplierMapperError,
} from '../mappers/supplier.mapper.ts';
import { supplierEventsToOutboxMessages } from '../mappers/supplier-outbox.mapper.ts';
import { appendOutboxInTx } from './outbox-repository.drizzle.ts';
import type { SupplierRow } from '../schemas/mysql.ts';

const isCnpjDupEntry = (e: unknown): boolean => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (
        obj['errno'] === 1062 &&
        typeof obj['sqlMessage'] === 'string' &&
        obj['sqlMessage'].includes('par_suppliers_cnpj_idx')
      ) {
        return true;
      }
    }
  }
  return false;
};

const logRepo = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-supplier-repo:${scope}] ${String(cause)}\n`);
};

// Mapper error em leitura = dado persistido corrompido → tratamos como infra.
const reconstruct = (row: Readonly<SupplierRow>): Result<Supplier, SupplierRepositoryError> => {
  const mapped = supplierFromRow(row);
  if (mapped.ok) return mapped;
  logRepo('mapper', mapped.error satisfies SupplierMapperError);
  return err('supplier-repo-unavailable');
};

export const createDrizzleSupplierStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): SupplierRepository => {
  const { db, schema } = handle;
  const table = schema.parSuppliers;

  return {
    findById: async (id: SupplierId) => {
      try {
        const rows = await db
          .select()
          .from(table)
          .where(eq(table.id, id as unknown as string))
          .limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findById', cause);
        return err('supplier-repo-unavailable');
      }
    },

    findByCnpj: async (cnpj: Cnpj) => {
      try {
        const rows = await db
          .select()
          .from(table)
          .where(eq(table.cnpj, cnpj as unknown as string))
          .limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findByCnpj', cause);
        return err('supplier-repo-unavailable');
      }
    },

    list: async () => {
      try {
        const rows = await db.select().from(table);
        const out: Supplier[] = [];
        for (const row of rows) {
          const mapped = reconstruct(row);
          if (!mapped.ok) return mapped;
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logRepo('list', cause);
        return err('supplier-repo-unavailable');
      }
    },

    save: async (supplier: Supplier, events: readonly SupplierEvent[]) => {
      const now = clock.now();
      const row = supplierToInsert(supplier, now);
      // Eventos de integração montados ANTES da tx (puro): snapshot pós-operação do agregado.
      const messages = supplierEventsToOutboxMessages(events, supplier);
      try {
        // UMA transação: persist do supplier + append do outbox. Se qualquer passo
        // lançar (ex.: ER_DUP_ENTRY no CNPJ), o Drizzle faz rollback de tudo —
        // estado e outbox somem juntos (atomicidade — ADR-0015/0043).
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: table.id })
            .from(table)
            .where(eq(table.id, row.id))
            .limit(1);

          if (existing.length > 0) {
            const { createdAt: _createdAt, ...rest } = row;
            await tx
              .update(table)
              .set({ ...rest, updatedAt: now })
              .where(eq(table.id, row.id));
          } else {
            await tx.insert(table).values(row);
          }

          await appendOutboxInTx(tx, schema, messages);
        });
        return ok(undefined);
      } catch (cause) {
        if (isCnpjDupEntry(cause)) return err('supplier-cnpj-duplicate');
        logRepo('save', cause);
        return err('supplier-repo-unavailable');
      }
    },
  };
};
