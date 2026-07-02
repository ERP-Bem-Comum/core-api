/**
 * Porta pública de ETL do módulo financial (ETL-FINANCIAL-WRITER) — espelha
 * `partners/public-api/etl.ts` (D14: a ETL nunca toca internos do módulo).
 *
 * `buildFinancialEtlPort({ connectionString })` abre o pool do financial
 * (applyMigrations: true — idempotente; garante a migration 0030 do legacy_id),
 * monta o store de correlação e devolve `{ documents, close }`.
 *
 * A escrita de NEGÓCIO continua pelos use cases (saveDocument/saveDraft/
 * approveDocument) — este port cobre APENAS a correlação legado↔novo
 * (idempotência por fin_documents.legacy_id, UNIQUE).
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import {
  openMysqlFinancial,
  type FinancialMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleFinancialEtlStore } from '../adapters/persistence/repos/financial-etl-store.drizzle.ts';
import type { FinancialEtlStore } from '../application/ports/financial-etl-store.ts';

export type {
  FinancialEtlStore,
  FinancialEtlStoreError,
  EtlDocumentRef,
} from '../application/ports/financial-etl-store.ts';

export type FinancialEtlPort = Readonly<{
  documents: FinancialEtlStore;
  close: () => Promise<void>;
}>;

export type BuildFinancialEtlPortError = FinancialMysqlDriverError;

export type BuildFinancialEtlPortOptions = Readonly<{ connectionString: string }>;

export const buildFinancialEtlPort = async (
  opts: BuildFinancialEtlPortOptions,
): Promise<Result<FinancialEtlPort, BuildFinancialEtlPortError>> => {
  const handle = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: true,
  });
  if (!handle.ok) return err(handle.error);

  return ok({
    documents: createDrizzleFinancialEtlStore(handle.value),
    close: handle.value.close,
  });
};
