// Entrypoint standalone do consumer de projeção de payables (#235/#307) — COMPOSITION ROOT.
//
// Lê o `fin_outbox` e aplica os eventos (DocumentSaved enriquecido + transições) no read-model
// `fin_payable_view`, via o worker genérico (`shared/outbox`). UM único pool (financial: outbox e
// read-model no mesmo módulo, ADR-0014) — diferente do supplier-view (dois pools). Nenhum módulo
// importa o outro; a ligação (public-api) é aqui.
//
// Config por env: FINANCIAL_DATABASE_URL. Migrations NÃO são aplicadas aqui (responsabilidade do
// release). Encerrado por SIGTERM/SIGINT (graceful — Node 24). Rodar single-instance (FIFO por
// agregado; ver runbook para a ressalva multi-instância).

import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { runLoop } from '#src/shared/outbox/index.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleFinancialOutboxReader } from '#src/modules/financial/adapters/persistence/repos/fin-outbox-reader.drizzle.ts';
import { createDrizzlePayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.drizzle.ts';
import { createPayableProjectionDelivery, rowToMessage } from './delivery.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.
const TAG = '[payable-projection-worker] ';

const main = async (): Promise<number> => {
  const financialUrl = process.env['FINANCIAL_DATABASE_URL'];
  if (financialUrl === undefined) {
    process.stderr.write(`${TAG}FINANCIAL_DATABASE_URL é obrigatório\n`);
    return EX_CONFIG;
  }

  const financialR = await openMysqlFinancial({
    connectionString: financialUrl,
    applyMigrations: false,
  });
  if (!financialR.ok) {
    process.stderr.write(`${TAG}falha ao abrir MySQL (financial): ${financialR.error}\n`);
    return 1;
  }

  const handle = financialR.value;
  const clock = ClockReal();
  const outbox = createDrizzleFinancialOutboxReader(handle);
  const store = createDrizzlePayableViewStore(handle, clock);
  const delivery = createPayableProjectionDelivery(store);

  const controller = new AbortController();
  const shutdown = (): void => {
    controller.abort();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  process.stderr.write(`${TAG}iniciando — fin_outbox → fin_payable_view\n`);

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
    await handle.close();
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
