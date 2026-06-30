/**
 * Listagem de fornecedores para projeção/backfill cross-módulo (US2 #47) — public-api do partners.
 *
 * Read-only: abre o pool, lista os fornecedores (`createDrizzleSupplierStore.list`) e devolve só os
 * campos do contrato de integração (`{ supplierRef, name, document }`). Encapsula os adapters do
 * partners para que o consumidor (job de backfill do financial) não os importe (ADR-0006).
 */
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { openPartnersMysql } from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleSupplierStore } from '../adapters/persistence/repos/supplier-repository.drizzle.ts';

export type SupplierProjectionRecord = Readonly<{
  supplierRef: string;
  name: string;
  document: string;
}>;

export const listSuppliersForProjection = async (
  connectionString: string,
): Promise<Result<readonly SupplierProjectionRecord[], string>> => {
  const handleR = await openPartnersMysql({ connectionString, applyMigrations: false });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  try {
    const repo = createDrizzleSupplierStore(handle, ClockReal());
    const listed = await repo.list();
    if (!listed.ok) return err(listed.error);
    return ok(
      listed.value.map((supplier) => ({
        supplierRef: String(supplier.id),
        name: supplier.name,
        document: String(supplier.cnpj),
      })),
    );
  } finally {
    await handle.close();
  }
};
