/**
 * Public-API de LEITURA do contratado do módulo partners (PARTNERS-CONTRACTOR-READ-PORT).
 *
 * Único ponto pelo qual outro módulo (Contratos — rota gorda ADR-0032) lê o
 * contratado (supplier/financier/collaborator) com bancário/PIX read-only, SEM
 * tocar os internos de persistência nem `par_*` cru (ADR-0006/ADR-0014). Devolve
 * a PROJEÇÃO plana (`*View`). Espelha `buildPartnersEtlPort` — monta o store a
 * partir de uma connection-string, sem subir Fastify. Read-only (zero escrita).
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import {
  openPartnersMysql,
  type PartnersMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractorReadStore } from '../adapters/persistence/repos/contractor-read.drizzle.ts';
import type { ContractorReadPort } from '../application/ports/contractor-read.ts';

export type {
  ContractorReadPort,
  ContractorReadError,
} from '../application/ports/contractor-read.ts';
export type {
  SupplierView,
  FinancierView,
  CollaboratorView,
  ActView,
  ContractorView,
} from './contractor-view.mapper.ts';

export type PartnersReadPort = ContractorReadPort &
  Readonly<{
    close: () => Promise<void>;
  }>;

export type BuildPartnersReadPortOptions = Readonly<{ connectionString: string }>;

export type BuildPartnersReadPortError = PartnersMysqlDriverError;

export const buildPartnersReadPort = async (
  opts: BuildPartnersReadPortOptions,
): Promise<Result<PartnersReadPort, BuildPartnersReadPortError>> => {
  // Leitura: as par_* já existem (provisionadas pela ETL). Sem applyMigrations.
  const handleR = await openPartnersMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const store = createDrizzleContractorReadStore(handle);

  return ok({
    ...store,
    close: async () => handle.close(),
  });
};
