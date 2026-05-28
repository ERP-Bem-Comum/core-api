/**
 * CliContext — superfície técnica exposta aos subcomandos da CLI do módulo
 * Financial.
 *
 * `buildContext(driver)` despacha para o driver concreto:
 *   - `memory` → `buildMemoryContext` (InMemory repo + outbox + state file opcional)
 *   - `mysql`  → `err('cli-driver-not-supported-yet')` — adapter Drizzle ainda
 *     não existe (ver `FIN-ADAPTER-DRIZZLE-PAYABLE`).
 *
 * Pattern espelha `src/modules/contracts/cli/context.ts` (versão enxuta — só
 * `payableRepo`, sem amendmentRepo/documentRepo; sem `WorkerOutboxOps` ainda).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import { err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { PayableRepository } from '#src/modules/financial/domain/payable/repository.ts';
import type { OutboxPort } from '#src/modules/financial/application/ports/outbox.ts';

import type { DriverFlags, DriverKind } from './parse-driver-flags.ts';
import type { StateError } from './state.ts';
import { buildMemoryContext } from './drivers/memory.ts';

export type CliContextError = StateError | 'cli-driver-not-supported-yet';

export type CliContext = Readonly<{
  payableRepo: PayableRepository;
  clock: Clock;
  driver: DriverKind;
  outbox: OutboxPort;
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
      return err('cli-driver-not-supported-yet');
  }
  // Exhaustive: TS valida todas as variantes em compile time.
};
