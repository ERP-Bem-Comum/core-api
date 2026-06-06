// Adapter Drizzle do ContractorReadPort (módulo partners) — LEITURA read-only.
//
//   - SELECT por id (limit 1) → reconstrói o agregado via `*FromRow` (reuso dos
//     mappers de leitura) + projeta para `*View` injetando `row.updatedAt`.
//   - id inexistente → ok(null). Mapper-error (dado corrompido) → tratado como
//     infra → err('contractor-read-unavailable'). Boundary: try/catch → Result.
//
// ADR-0014: só lê `par_*` (nunca expõe row cru — devolve a View). ADR-0020: SELECT.
// Zero escrita (CA2). Zero throw cruzando a borda (CA3).

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  ContractorReadPort,
  ContractorReadError,
} from '#src/modules/partners/application/ports/contractor-read.ts';
import {
  supplierToView,
  financierToView,
  collaboratorToView,
  actToView,
  type SupplierView,
  type FinancierView,
  type CollaboratorView,
  type ActView,
} from '#src/modules/partners/public-api/contractor-view.mapper.ts';
import { supplierFromRow } from '../mappers/supplier.mapper.ts';
import { financierFromRow } from '../mappers/financier.mapper.ts';
import { collaboratorFromRow } from '../mappers/collaborator.mapper.ts';
import { actFromRow } from '../mappers/act.mapper.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-contractor-read:${scope}] ${String(cause)}\n`);
};

export const createDrizzleContractorReadStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ContractorReadPort => {
  const { db, schema } = handle;

  const getSupplierView = async (
    id: string,
  ): Promise<Result<SupplierView | null, ContractorReadError>> => {
    try {
      const rows = await db
        .select()
        .from(schema.parSuppliers)
        .where(eq(schema.parSuppliers.id, id))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      const mapped = supplierFromRow(row);
      if (!mapped.ok) {
        logRead('supplier-mapper', mapped.error);
        return err('contractor-read-unavailable');
      }
      return ok(supplierToView(mapped.value, row.updatedAt));
    } catch (cause) {
      logRead('getSupplierView', cause);
      return err('contractor-read-unavailable');
    }
  };

  const getFinancierView = async (
    id: string,
  ): Promise<Result<FinancierView | null, ContractorReadError>> => {
    try {
      const rows = await db
        .select()
        .from(schema.parFinanciers)
        .where(eq(schema.parFinanciers.id, id))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      const mapped = financierFromRow(row);
      if (!mapped.ok) {
        logRead('financier-mapper', mapped.error);
        return err('contractor-read-unavailable');
      }
      return ok(financierToView(mapped.value, row.updatedAt));
    } catch (cause) {
      logRead('getFinancierView', cause);
      return err('contractor-read-unavailable');
    }
  };

  const getCollaboratorView = async (
    id: string,
  ): Promise<Result<CollaboratorView | null, ContractorReadError>> => {
    try {
      const rows = await db
        .select()
        .from(schema.parCollaborators)
        .where(eq(schema.parCollaborators.id, id))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      const mapped = collaboratorFromRow(row);
      if (!mapped.ok) {
        logRead('collaborator-mapper', mapped.error);
        return err('contractor-read-unavailable');
      }
      return ok(collaboratorToView(mapped.value, row.updatedAt));
    } catch (cause) {
      logRead('getCollaboratorView', cause);
      return err('contractor-read-unavailable');
    }
  };

  const getActView = async (id: string): Promise<Result<ActView | null, ContractorReadError>> => {
    try {
      const rows = await db.select().from(schema.parActs).where(eq(schema.parActs.id, id)).limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      const mapped = actFromRow(row);
      if (!mapped.ok) {
        logRead('act-mapper', mapped.error);
        return err('contractor-read-unavailable');
      }
      return ok(actToView(mapped.value, row.updatedAt));
    } catch (cause) {
      logRead('getActView', cause);
      return err('contractor-read-unavailable');
    }
  };

  return { getSupplierView, getFinancierView, getCollaboratorView, getActView };
};
