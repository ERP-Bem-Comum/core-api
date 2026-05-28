import type { Result } from '../../../shared/primitives/result.ts';
import type { Clock } from '../../../shared/ports/clock.ts';
import type { ContractRepository } from '../domain/contract/repository.ts';
import type { AmendmentRepository } from '../domain/amendment/repository.ts';
import type { DocumentRepository } from '../domain/document/repository.ts';
import type { MysqlDriverError } from '../adapters/persistence/drivers/mysql-driver.ts';
import type { OutboxPort, WorkerOutboxOps } from '../application/ports/outbox.ts';

import type { DriverFlags, DriverKind } from './parse-driver-flags.ts';
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
// CA-6 (CTR-OUTBOX-INTEGRATION-IN-REPOS): eventBus removido do CliContext —
// use cases não expõem mais EventBus; eventos fluem via outbox embutido nos repos.
//
// CA-9 (CTR-OUTBOX-CLI-WORKER): CliContext expandido para incluir:
//   - `driver`: kind do driver ativo ('memory' | 'mysql') — permite que subcomandos
//     rejeitem drivers incompatíveis (ex.: run-outbox-worker requer 'mysql').
//   - `outbox`: OutboxPort & WorkerOutboxOps — expõe os 4 helpers do worker além
//     do `append`. Driver memory usa InMemoryOutbox; driver mysql usa DrizzleOutboxRepo.
//   - `outboxCleanup`: hook opcional para fechar recursos exclusivos do outbox
//     (ex.: pool separado no driver mysql quando o worker precisar de pool próprio).

export type CliContextError = StateError | MysqlDriverError;

export type CliContext = Readonly<{
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  documentRepo: DocumentRepository;
  clock: Clock;
  driver: DriverKind;
  outbox: OutboxPort & WorkerOutboxOps;
  outboxCleanup?: () => Promise<void>;
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
