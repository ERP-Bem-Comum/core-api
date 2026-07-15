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
import { createDrizzleContractCountReadStore } from '../adapters/persistence/repos/contract-count-read.drizzle.ts';
import { createDrizzleActiveContractorReadStore } from '../adapters/persistence/repos/active-contractor-read.drizzle.ts';
import type { ContractCategorizationReadPort } from '../application/ports/contract-categorization-read.ts';
import type { ContractCountReadPort } from '../application/ports/contract-count-read.ts';
import type { ActiveContractorReadPort } from '../application/ports/active-contractor-read.ts';

export type {
  ContractCategorizationReadPort,
  ContractCategorizationReadError,
  ContractCategorizationView,
} from '../application/ports/contract-categorization-read.ts';

export { createInMemoryContractCategorizationReadStore } from '../adapters/persistence/repos/contract-categorization-read.in-memory.ts';

export type {
  ContractCountReadPort,
  ContractCountReadError,
  ContractCountByContractor,
} from '../application/ports/contract-count-read.ts';

export { makeInMemoryContractCountRead } from '../adapters/persistence/repos/contract-count-read.in-memory.ts';

export type {
  ActiveContractorReadPort,
  ActiveContractorReadError,
} from '../application/ports/active-contractor-read.ts';

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

// #110 — PAR-CONTRACT-COUNT-BACKFILL: leitura de contagem de contratos vivos por contraparte,
// consumida pelo job de backfill do partners (`src/jobs/partners/contract-count-backfill/`).
// Espelha `buildContractsReadPort` — mesma forma, mesmo driver, sem applyMigrations.

export type ContractsContractCountReadPort = ContractCountReadPort &
  Readonly<{ close: () => Promise<void> }>;

export type BuildContractsContractCountReadPortOptions = Readonly<{ connectionString: string }>;
export type BuildContractsContractCountReadPortError = MysqlDriverError;

export const buildContractsContractCountReadPort = async (
  opts: BuildContractsContractCountReadPortOptions,
): Promise<Result<ContractsContractCountReadPort, BuildContractsContractCountReadPortError>> => {
  // Leitura: as ctr_* já existem (provisionadas pelas migrations do writer). Sem applyMigrations.
  const handleR = await openMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const store = createDrizzleContractCountReadStore(handle);

  return ok({
    ...store,
    close: async () => handle.close(),
  });
};

// #437 — REPORTS-SUPPLIERS-NO-ACTIVE-CONTRACT: conjunto de contratantes (fornecedores) com contrato
// `Active`, consumido pelo `reports` para subtrair, EM MEMÓRIA, os candidatos vindos do `financial`
// (JOIN `ctr_*` × `fin_*` é proibido — ADR-0006 `:150`/`:154`, ADR-0014 `:130`).
// Espelha `buildContractsContractCountReadPort` — mesma forma, mesmo driver, sem applyMigrations.

export type ContractsActiveContractorReadPort = ActiveContractorReadPort &
  Readonly<{ close: () => Promise<void> }>;

export type BuildContractsActiveContractorReadPortOptions = Readonly<{ connectionString: string }>;
export type BuildContractsActiveContractorReadPortError = MysqlDriverError;

export const buildContractsActiveContractorReadPort = async (
  opts: BuildContractsActiveContractorReadPortOptions,
): Promise<
  Result<ContractsActiveContractorReadPort, BuildContractsActiveContractorReadPortError>
> => {
  // Leitura: as ctr_* já existem (provisionadas pelas migrations do writer). Sem applyMigrations.
  const handleR = await openMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const store = createDrizzleActiveContractorReadStore(handle);

  return ok({
    ...store,
    close: async () => handle.close(),
  });
};
