// 010-partner-contract-counts — public-api de LEITURA: contagem de contratos/aditivos por contratado.
// Único ponto pelo qual partners consome a contagem (ADR-0006/0014), sem tocar `ctr_*` cru nem importar
// `contracts/domain`. Espelha `buildProgramsReadPort` (abre pool próprio; falha não derruba — caller degrada).

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { openMysql, type MysqlDriverError } from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractCountReadStore } from '../adapters/persistence/repos/contract-count-read.drizzle.ts';
import type { ContractCountReadPort } from '../application/ports/contract-count-read.ts';

export type {
  ContractCountReadPort,
  ContractCountReadError,
  ContractorCount,
  ContractorType,
} from '../application/ports/contract-count-read.ts';
export { makeInMemoryContractCountReadPort } from '../adapters/persistence/repos/contract-count-read.in-memory.ts';
export type { InMemoryContractCountRow } from '../adapters/persistence/repos/contract-count-read.in-memory.ts';

export type ContractCountReadHandle = ContractCountReadPort &
  Readonly<{ close: () => Promise<void> }>;

export const buildContractCountReadPort = async (
  opts: Readonly<{ connectionString: string }>,
): Promise<Result<ContractCountReadHandle, MysqlDriverError>> => {
  // Leitura: as ctr_* já existem (provisionadas pelo módulo contracts). Sem applyMigrations.
  const handleR = await openMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const store = createDrizzleContractCountReadStore(handle);
  return ok({ ...store, close: async () => handle.close() });
};
