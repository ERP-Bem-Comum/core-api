/**
 * Driver `memory` da CLI do módulo Financial.
 *
 * Cria `InMemoryOutbox` + `InMemoryPayableRepository(outbox.port)`. Se um
 * `statePath` é informado, adquire lock exclusivo e carrega Payables do
 * arquivo antes de devolver o contexto.
 *
 * `persist()` grava o snapshot Payables atual em disco (atomicamente, via
 * `${path}.tmp.${uuid}` + rename).
 *
 * `shutdown()` libera o lock se foi adquirido.
 *
 * **Outbox efêmero:** o `InMemoryOutbox` criado aqui **NÃO** é serializado
 * no state file (`fin-cli-state.json` contém apenas Payables, nunca eventos).
 * Mesma decisão do `contracts/cli/drivers/memory.ts`. Quando
 * `FIN-WORKER-OUTBOX` chegar com persistência real, será via tabela
 * `fin_outbox` no driver mysql — não via state file do driver memory.
 *
 * Pattern espelha `src/modules/contracts/cli/drivers/memory.ts` (versão
 * enxuta — só 1 handle de repositório).
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { InMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { InMemoryPayableRepository } from '#src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts';

import type { CliContext } from '../context.ts';
import {
  type StateError,
  loadState,
  saveState,
  acquireStateLock,
  releaseStateLock,
} from '../state.ts';

export const buildMemoryContext = async (
  statePath: string | null,
): Promise<Result<CliContext, StateError>> => {
  await Promise.resolve();

  const outbox = InMemoryOutbox();
  const handle = InMemoryPayableRepository(outbox.port);

  let lockPath: string | null = null;
  if (statePath !== null) {
    const lockR = acquireStateLock(statePath);
    if (!lockR.ok) return lockR;
    lockPath = lockR.value;

    const loaded = loadState(statePath, handle);
    if (!loaded.ok) {
      // Erro de loadState exceto 'state-file-not-readable' quando o arquivo
      // simplesmente não existe — mas neste caso já tratamos antes em loadState.
      releaseStateLock(lockPath);
      return loaded;
    }
  }

  const ctx: CliContext = {
    payableRepo: handle.repo,
    clock: ClockReal(),
    driver: 'memory',
    outbox: outbox.port,
    persist: async (): Promise<Result<void, StateError>> => {
      await Promise.resolve();
      if (statePath === null) return ok(undefined);
      return saveState(statePath, handle);
    },
    shutdown: async (): Promise<void> => {
      await Promise.resolve();
      if (lockPath !== null) {
        releaseStateLock(lockPath);
        lockPath = null;
      }
    },
  };
  return ok(ctx);
};
