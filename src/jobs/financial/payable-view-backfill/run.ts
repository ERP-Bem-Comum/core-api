// Job one-shot (ADR-0041) — backfill do read-model de payables (#236). COMPOSITION ROOT.
//
// Lê `fin_payables ⋈ fin_documents` (fonte-de-verdade) e popula `fin_payable_view`. Cobre o GAP do
// worker: payables SEM evento no `fin_outbox` (pré-#127 ou podados). Idempotente (upsert por
// payableId); NÃO clobbera `status` de linha existente (o upsert preserva — status é do worker).
// Disparado manualmente / por cron externo. Sai com exit code.
//
// Config por env: FINANCIAL_DATABASE_URL.

import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzlePayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.drizzle.ts';
import { readPayableBackfillRecords } from './reader.ts';
import { backfillPayableViews } from './backfill.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.
const TAG = '[payable-view-backfill] ';

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

  try {
    const source = await readPayableBackfillRecords(handle);
    if (!source.ok) {
      process.stderr.write(`${TAG}falha ao ler a fonte: ${source.error}\n`);
      return 1;
    }
    const store = createDrizzlePayableViewStore(handle, ClockReal());
    const result = await backfillPayableViews(source.value.records, store);
    if (!result.ok) return 1;
    process.stderr.write(
      `${TAG}concluído — ${result.value.applied} aplicados, ${result.value.failed} falhas, ` +
        `${source.value.skipped} pulados de ${source.value.total} payables\n`,
    );
    return result.value.failed > 0 ? 1 : 0;
  } finally {
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
