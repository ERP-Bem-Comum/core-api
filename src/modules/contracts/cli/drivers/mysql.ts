import { type Result, ok } from '../../../../shared/result.ts';
import { ClockReal } from '../../../../shared/adapters/clock-real.ts';
import {
  openMysql,
  type MysqlDriverError,
} from '../../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '../../adapters/persistence/repos/contract-repository.drizzle.ts';
import { createDrizzleAmendmentRepository } from '../../adapters/persistence/repos/amendment-repository.drizzle.ts';
import { InMemoryEventBus } from '../../adapters/event-bus.in-memory.ts';

import type { CliContext } from '../context.ts';

// Driver mysql: pool `mysql2/promise` + Drizzle/MySQL com migration aplicada
// no boot (idempotente via journal do drizzle-kit).
// EventBus continua in-memory — outbox MySQL persistente é ticket separado.
export const buildMysqlContext = async (
  connectionString: string,
): Promise<Result<CliContext, MysqlDriverError>> => {
  const handleR = await openMysql({ connectionString, applyMigrations: true });
  if (!handleR.ok) return handleR;
  const handle = handleR.value;

  const eventHandle = InMemoryEventBus();

  const ctx: CliContext = {
    contractRepo: createDrizzleContractRepository(handle),
    amendmentRepo: createDrizzleAmendmentRepository(handle),
    eventBus: eventHandle.bus,
    clock: ClockReal(),
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
