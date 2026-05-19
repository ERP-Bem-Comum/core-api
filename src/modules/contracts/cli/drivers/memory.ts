import { type Result, ok } from '../../../../shared/result.ts';
import { ClockReal } from '../../../../shared/adapters/clock-real.ts';
import { InMemoryContractRepository } from '../../adapters/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '../../adapters/amendment-repository.in-memory.ts';
import { InMemoryEventBus } from '../../adapters/event-bus.in-memory.ts';

import type { CliContext } from '../context.ts';
import {
  type StateError,
  loadState,
  saveState,
  acquireStateLock,
  releaseStateLock,
} from '../state.ts';

// Driver memory: InMemory repos + state file JSON opcional.
// Preserva o comportamento anterior do CLI (backward compat).
//
// REGR #3: para `statePath !== null` adquirimos lock exclusivo via
// `${statePath}.lock` ANTES do load e liberamos no shutdown. Isso garante que
// dois processos concorrentes vejam estados sequenciais (R-M-W serializado).
export const buildMemoryContext = async (
  statePath: string | null,
): Promise<Result<CliContext, StateError>> => {
  await Promise.resolve();
  const contractHandle = InMemoryContractRepository();
  const amendmentHandle = InMemoryAmendmentRepository();
  const eventHandle = InMemoryEventBus();

  let lockPath: string | null = null;
  if (statePath !== null) {
    const lockR = acquireStateLock(statePath);
    if (!lockR.ok) return lockR;
    lockPath = lockR.value;

    const loaded = loadState(statePath, contractHandle, amendmentHandle);
    if (!loaded.ok) {
      releaseStateLock(lockPath);
      return loaded;
    }
  }

  const ctx: CliContext = {
    contractRepo: contractHandle.repo,
    amendmentRepo: amendmentHandle.repo,
    eventBus: eventHandle.bus,
    clock: ClockReal(),
    persist: async () => {
      await Promise.resolve();
      if (statePath === null) return ok(undefined);
      return saveState(statePath, contractHandle, amendmentHandle);
    },
    shutdown: async () => {
      await Promise.resolve();
      if (lockPath !== null) {
        releaseStateLock(lockPath);
        lockPath = null;
      }
    },
  };
  return ok(ctx);
};
