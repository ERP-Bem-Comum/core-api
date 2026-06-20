/**
 * Public-API de LEITURA do módulo contracts (#178 — CTR-PUBLICAPI-CATEGORIZATION).
 *
 * Único ponto pelo qual outro módulo (financial — categorização herdada do documento, #48) lê a
 * categorização de um contrato (categoria/programa/plano/centro de custo) SEM tocar os internos de
 * persistência nem `ctr_*` cru (ADR-0006/ADR-0014). Devolve a PROJEÇÃO plana (`ContractCategorizationView`).
 * Espelha `buildPartnersReadPort` — monta o store a partir de uma connection-string, sem subir Fastify.
 * Read-only (zero escrita; sem applyMigrations).
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { openMysql, type MysqlDriverError } from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractCategorizationReadStore } from '../adapters/persistence/repos/contract-categorization-read.drizzle.ts';
import type { ContractCategorizationReadPort } from '../application/ports/contract-categorization-read.ts';

export type {
  ContractCategorizationReadPort,
  ContractCategorizationReadError,
  ContractCategorizationView,
} from '../application/ports/contract-categorization-read.ts';

export { createInMemoryContractCategorizationReadStore } from '../adapters/persistence/repos/contract-categorization-read.in-memory.ts';

export type ContractsReadPort = ContractCategorizationReadPort &
  Readonly<{ close: () => Promise<void> }>;

export type BuildContractsReadPortOptions = Readonly<{ connectionString: string }>;
export type BuildContractsReadPortError = MysqlDriverError;

export const buildContractsReadPort = async (
  opts: BuildContractsReadPortOptions,
): Promise<Result<ContractsReadPort, BuildContractsReadPortError>> => {
  // Leitura: as ctr_* já existem (provisionadas pelas migrations do writer). Sem applyMigrations.
  const handleR = await openMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const store = createDrizzleContractCategorizationReadStore(handle);

  return ok({
    ...store,
    close: async () => handle.close(),
  });
};
