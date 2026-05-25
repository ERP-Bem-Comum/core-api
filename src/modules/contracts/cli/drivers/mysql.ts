import { type Result, ok } from '../../../../shared/primitives/result.ts';
import { ClockReal } from '../../../../shared/adapters/clock-real.ts';
import {
  openMysql,
  type MysqlDriverError,
} from '../../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '../../adapters/persistence/repos/contract-repository.drizzle.ts';
import { createDrizzleAmendmentRepository } from '../../adapters/persistence/repos/amendment-repository.drizzle.ts';
import { DocumentRepositoryDrizzle } from '../../adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzleOutboxRepository } from '../../adapters/persistence/repos/outbox-repository.drizzle.ts';

import type { CliContext } from '../context.ts';

// Driver mysql: pool `mysql2/promise` + Drizzle/MySQL com migration aplicada
// no boot (idempotente via journal do drizzle-kit).
// Os repos Drizzle persistem events no outbox via appendOutboxInTx dentro
// de cada db.transaction. Outbox MySQL persiste automaticamente (sem instância separada aqui).
//
// CA-9 (CTR-OUTBOX-CLI-WORKER): outbox Drizzle repo instanciado aqui para que o
// subcomando run-outbox-worker possa acessar os 4 helpers do worker (findPendingForUpdate,
// markProcessed, markFailed, moveToDeadLetter) via ctx.outbox. O mesmo handle MySQL é
// reutilizado — pool compartilhado; o worker usa o handle existente.
// outboxCleanup é undefined porque o pool é fechado via shutdown() do handle principal.
export const buildMysqlContext = async (
  connectionString: string,
): Promise<Result<CliContext, MysqlDriverError>> => {
  const handleR = await openMysql({ connectionString, applyMigrations: true });
  if (!handleR.ok) return handleR;
  const handle = handleR.value;

  const outboxRepo = createDrizzleOutboxRepository(handle);

  const ctx: CliContext = {
    contractRepo: createDrizzleContractRepository(handle),
    amendmentRepo: createDrizzleAmendmentRepository(handle),
    documentRepo: DocumentRepositoryDrizzle(handle.db),
    clock: ClockReal(),
    driver: 'mysql',
    // CA-9: OutboxPort (append) + WorkerOutboxOps (4 helpers) num único objeto.
    // Reutiliza o mesmo handle/pool que os repos de contrato e aditivo.
    outbox: {
      append: outboxRepo.append,
      findPendingForUpdate: outboxRepo.findPendingForUpdate,
      markProcessed: outboxRepo.markProcessed,
      markFailed: outboxRepo.markFailed,
      moveToDeadLetter: outboxRepo.moveToDeadLetter,
    },
    // MySQL persiste a cada save — `persist` é no-op.
    persist: async () => {
      await Promise.resolve();
      return ok(undefined);
    },
    shutdown: async () => {
      await handle.close();
    },
  };
  return ok(ctx);
};
