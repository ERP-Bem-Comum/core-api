import { type Result, ok } from '../../../../shared/primitives/result.ts';
import { ClockReal } from '../../../../shared/adapters/clock-real.ts';
import { InMemoryContractRepository } from '../../adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '../../adapters/persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryDocumentRepository } from '../../adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryOutbox } from '../../adapters/outbox/outbox.in-memory.ts';

import type { CliContext } from '../context.ts';
import {
  type StateError,
  loadState,
  saveState,
  acquireStateLock,
  releaseStateLock,
} from '../state.ts';

// Driver memory: InMemory repos + state file JSON opcional.
// CA-8 (CTR-OUTBOX-INTEGRATION-IN-REPOS): InMemoryOutbox injetado nos repos.
// Outbox é efêmero no driver memory (não persiste em cli-state.json) — decisão
// pragmática documentada em .claude/.pipeline/CTR-OUTBOX-INTEGRATION-IN-REPOS/000-request.md §Risco 4.
//
// REGR #3: para `statePath !== null` adquirimos lock exclusivo via
// `${statePath}.lock` ANTES do load e liberamos no shutdown. Isso garante que
// dois processos concorrentes vejam estados sequenciais (R-M-W serializado).
export const buildMemoryContext = async (
  statePath: string | null,
): Promise<Result<CliContext, StateError>> => {
  await Promise.resolve();

  // CA-8: outbox compartilhado entre os repos (mesma instância).
  // CTR-AMENDMENT-DOCUMENT-LINK: + documentRepo no driver memory.
  const outbox = InMemoryOutbox();
  const contractHandle = InMemoryContractRepository(outbox.port);
  const amendmentHandle = InMemoryAmendmentRepository(outbox.port);
  const documentHandle = InMemoryDocumentRepository(outbox.port);

  let lockPath: string | null = null;
  if (statePath !== null) {
    const lockR = acquireStateLock(statePath);
    if (!lockR.ok) return lockR;
    lockPath = lockR.value;

    const loaded = loadState(statePath, contractHandle, amendmentHandle, documentHandle);
    if (!loaded.ok) {
      releaseStateLock(lockPath);
      return loaded;
    }
  }

  const ctx: CliContext = {
    contractRepo: contractHandle.repo,
    amendmentRepo: amendmentHandle.repo,
    documentRepo: documentHandle.repo,
    clock: ClockReal(),
    driver: 'memory',
    // CA-9 (CTR-OUTBOX-CLI-WORKER): mescla OutboxPort (append) + WorkerOutboxOps
    // (4 helpers) num único objeto que satisfaz `OutboxPort & WorkerOutboxOps`.
    // Efêmero no driver memory — não persiste em cli-state.json (decisão documentada em
    // .pipeline/CTR-OUTBOX-INTEGRATION-IN-REPOS/000-request.md §Risco 4).
    outbox: {
      append: outbox.port.append,
      findPendingForUpdate: outbox.findPendingForUpdate,
      markProcessed: outbox.markProcessed,
      markFailed: outbox.markFailed,
      moveToDeadLetter: outbox.moveToDeadLetter,
    },
    persist: async () => {
      await Promise.resolve();
      if (statePath === null) return ok(undefined);
      return saveState(statePath, contractHandle, amendmentHandle, documentHandle);
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
