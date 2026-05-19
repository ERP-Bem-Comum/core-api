import type { Result } from '../../../shared/result.ts';
import type { Clock } from '../../../shared/ports/clock.ts';
import type { ContractRepository } from '../application/ports/contract-repository.ts';
import type { AmendmentRepository } from '../application/ports/amendment-repository.ts';
import type { EventBus } from '../application/ports/event-bus.ts';
import type { MysqlDriverError } from '../adapters/persistence/drivers/mysql-driver.ts';

import type { DriverFlags } from './parse-driver-flags.ts';
import type { StateError } from './state.ts';

import { buildMemoryContext } from './drivers/memory.ts';
import { buildMysqlContext } from './drivers/mysql.ts';

// CliContext expõe **ports** (não mais handles InMemory). Cada driver
// (`drivers/{memory,mysql}.ts`) retorna uma instância deste tipo.
// `persist` e `shutdown` são pontos de hooks por-driver:
//  - memory: persist grava state file JSON; shutdown é no-op.
//  - mysql: persist é no-op (DB grava a cada save); shutdown fecha o pool.
//
// ADR-0020 (CTR-CLEANUP-SQLITE #5): SQLite foi removido como driver.

export type CliContextError = StateError | MysqlDriverError;

export type CliContext = Readonly<{
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  eventBus: EventBus;
  clock: Clock;
  persist: () => Promise<Result<void, StateError>>;
  shutdown: () => Promise<void>;
}>;

export const buildContext = async (
  driver: DriverFlags,
): Promise<Result<CliContext, CliContextError>> => {
  switch (driver.kind) {
    case 'memory':
      return buildMemoryContext(driver.statePath);
    case 'mysql':
      return buildMysqlContext(driver.connectionString);
  }
  // Exhaustive: TS valida em compile time todas as variantes de DriverFlags.
};
