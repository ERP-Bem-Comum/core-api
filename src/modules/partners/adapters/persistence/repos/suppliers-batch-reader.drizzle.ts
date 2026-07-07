// Adapter Drizzle do SuppliersBatchReadPort (#356) — resolução em lote por ref.
//
//   - 1 query com `inArray` (anti-N+1, CA7 validado no W3 contra MySQL real) — seleciona
//     só as colunas da identidade mínima (id/name/cnpj/service_category); bancário/PIX
//     nem chegam a ser lidos (minimização em profundidade, CA5).
//   - refs sem row correspondente → `missing`. Categoria corrompida (dado legado
//     inválido) → trata como infra: `err('suppliers-batch-read-unavailable')`.
//
// ADR-0014: só lê `par_suppliers`. ADR-0020: SELECT. Zero escrita. Zero throw na borda.

import { inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as ServiceCategory from '#src/modules/partners/domain/supplier/service-category.ts';
import type {
  SuppliersBatchReadPort,
  SuppliersBatchReadError,
  SupplierBatchView,
  SupplierBatchResult,
} from '#src/modules/partners/application/ports/suppliers-batch-read.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-suppliers-batch-read:${scope}] ${String(cause)}\n`);
};

export const createDrizzleSuppliersBatchReader = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): SuppliersBatchReadPort => {
  const { db, schema } = handle;

  const getSuppliersView = async (
    refs: readonly string[],
  ): Promise<Result<SupplierBatchResult, SuppliersBatchReadError>> => {
    if (refs.length === 0) return ok({ items: [], missing: [] });
    try {
      const rows = await db
        .select({
          id: schema.parSuppliers.id,
          name: schema.parSuppliers.name,
          cnpj: schema.parSuppliers.cnpj,
          serviceCategory: schema.parSuppliers.serviceCategory,
        })
        .from(schema.parSuppliers)
        .where(inArray(schema.parSuppliers.id, [...refs]));

      const items: SupplierBatchView[] = [];
      const found = new Set<string>();
      for (const row of rows) {
        const category = ServiceCategory.parse(row.serviceCategory);
        if (!category.ok) {
          logRead('getSuppliersView-category', category.error);
          return err('suppliers-batch-read-unavailable');
        }
        items.push({
          ref: row.id,
          name: row.name,
          taxId: row.cnpj,
          serviceCategory: category.value,
        });
        found.add(row.id);
      }
      const missing = refs.filter((ref) => !found.has(ref));
      return ok({ items, missing });
    } catch (cause) {
      logRead('getSuppliersView', cause);
      return err('suppliers-batch-read-unavailable');
    }
  };

  return { getSuppliersView };
};
