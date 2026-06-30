// Entrypoint standalone do consumer de projeção de fornecedor (US2 #47) — COMPOSITION ROOT.
//
// Lê o `par_outbox` (pool do `partners`) e aplica os eventos `SupplierRegistered`/`SupplierEdited`
// no read-model `fin_supplier_view` (pool do `financial`), via o worker genérico (`shared/outbox`).
// Dois pools, um processo dedicado (ADR-0041); nenhum módulo importa o outro — a ligação é aqui.
//
// Config por env: PARTNERS_DATABASE_URL + FINANCIAL_DATABASE_URL. Migrations NÃO são aplicadas aqui
// (responsabilidade do release). Encerrado por SIGTERM/SIGINT (graceful — Node 24).

import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { runLoop } from '#src/shared/outbox/index.ts';
import { openPartnersMysql } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleOutboxRepository } from '#src/modules/partners/adapters/persistence/repos/outbox-repository.drizzle.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleSupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.drizzle.ts';
import { createSupplierProjectionDelivery, rowToMessage } from './delivery.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.
const TAG = '[supplier-projection-worker] ';

const main = async (): Promise<number> => {
  const partnersUrl = process.env['PARTNERS_DATABASE_URL'];
  const financialUrl = process.env['FINANCIAL_DATABASE_URL'];
  if (partnersUrl === undefined || financialUrl === undefined) {
    process.stderr.write(`${TAG}PARTNERS_DATABASE_URL e FINANCIAL_DATABASE_URL são obrigatórios\n`);
    return EX_CONFIG;
  }

  const partnersR = await openPartnersMysql({
    connectionString: partnersUrl,
    applyMigrations: false,
  });
  if (!partnersR.ok) {
    process.stderr.write(`${TAG}falha ao abrir MySQL (partners): ${partnersR.error}\n`);
    return 1;
  }
  const financialR = await openMysqlFinancial({
    connectionString: financialUrl,
    applyMigrations: false,
  });
  if (!financialR.ok) {
    process.stderr.write(`${TAG}falha ao abrir MySQL (financial): ${financialR.error}\n`);
    await partnersR.value.close();
    return 1;
  }

  const partnersHandle = partnersR.value;
  const financialHandle = financialR.value;
  const clock = ClockReal();
  const outbox = createDrizzleOutboxRepository(partnersHandle);
  const store = createDrizzleSupplierViewStore(financialHandle, clock);
  const delivery = createSupplierProjectionDelivery(store);

  const controller = new AbortController();
  const shutdown = (): void => {
    controller.abort();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  process.stderr.write(`${TAG}iniciando — par_outbox → fin_supplier_view\n`);

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
    await partnersHandle.close();
    await financialHandle.close();
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
