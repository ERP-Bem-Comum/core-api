// Entrypoint standalone da projeção de contagem de contratos (US6b) — COMPOSITION ROOT.
//
// Lê o `ctr_outbox` (pool do `contracts`) e aplica os eventos de ciclo de vida (enriquecidos com
// contractorRef pela US6a) no read-model `par_contract_count_view` (pool do `partners`), via o
// worker genérico (`shared/outbox`). Dois pools, um processo dedicado (ADR-0041); nenhum módulo
// importa o outro — a ligação é aqui.
//
// Config por env: CONTRACTS_DATABASE_URL + PARTNERS_DATABASE_URL. Migrations NÃO aplicadas aqui
// (responsabilidade do release). Encerrado por SIGTERM/SIGINT (graceful — Node 24).

import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { runLoop } from '#src/shared/outbox/index.ts';
import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleOutboxRepository } from '#src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts';
import { openPartnersMysql } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractCountStore } from '#src/modules/partners/adapters/persistence/repos/contract-count-store.drizzle.ts';
import { createContractCountProjectionDelivery, rowToMessage } from './delivery.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.
const TAG = '[contract-count-projection-worker] ';

const main = async (): Promise<number> => {
  const contractsUrl = process.env['CONTRACTS_DATABASE_URL'];
  const partnersUrl = process.env['PARTNERS_DATABASE_URL'];
  if (contractsUrl === undefined || partnersUrl === undefined) {
    process.stderr.write(`${TAG}CONTRACTS_DATABASE_URL e PARTNERS_DATABASE_URL são obrigatórios\n`);
    return EX_CONFIG;
  }

  const contractsR = await openMysql({ connectionString: contractsUrl, applyMigrations: false });
  if (!contractsR.ok) {
    process.stderr.write(`${TAG}falha ao abrir MySQL (contracts): ${contractsR.error}\n`);
    return 1;
  }
  const partnersR = await openPartnersMysql({
    connectionString: partnersUrl,
    applyMigrations: false,
  });
  if (!partnersR.ok) {
    process.stderr.write(`${TAG}falha ao abrir MySQL (partners): ${partnersR.error}\n`);
    await contractsR.value.close();
    return 1;
  }

  const contractsHandle = contractsR.value;
  const partnersHandle = partnersR.value;
  const clock = ClockReal();
  const outbox = createDrizzleOutboxRepository(contractsHandle);
  const store = createDrizzleContractCountStore(partnersHandle);
  const delivery = createContractCountProjectionDelivery(store);

  const controller = new AbortController();
  const shutdown = (): void => {
    controller.abort();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  process.stderr.write(`${TAG}iniciando — ctr_outbox → par_contract_count_view\n`);

  try {
    const stats = await runLoop(
      {
        outbox,
        delivery,
        rowToProcessed: rowToMessage,
        clock,
        tag: TAG,
        abortSignal: controller.signal,
      },
      { batchSize: 10, maxAttempts: 5, pollIntervalMs: 500, idleSleepMs: 1000 },
    );
    process.stderr.write(`${TAG}shutdown limpo — stats: ${JSON.stringify(stats)}\n`);
    return 0;
  } catch (cause) {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`${TAG}erro fatal: ${detail}\n`);
    return 1;
  } finally {
    process.off('SIGTERM', shutdown);
    process.off('SIGINT', shutdown);
    await contractsHandle.close();
    await partnersHandle.close();
  }
};

await main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((cause: unknown) => {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`${TAG}rejeição não tratada no main: ${detail}\n`);
    process.exitCode = 1;
  });
