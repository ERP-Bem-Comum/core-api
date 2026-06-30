// Job one-shot (ADR-0041) — backfill do read-model de fornecedor (US2 #47). COMPOSITION ROOT.
//
// Lista os fornecedores existentes no `partners` (via public-api) e popula o `fin_supplier_view`
// do `financial`, com `occurredAt` antigo (eventos reais sempre vencem o guard de recência).
// Disparado manualmente / por cron externo; idempotente (re-rodar é seguro). Sai com exit code.
//
// Config por env: PARTNERS_DATABASE_URL + FINANCIAL_DATABASE_URL.

import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { listSuppliersForProjection } from '#src/modules/partners/public-api/index.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleSupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.drizzle.ts';
import { backfillSupplierViews } from './backfill.ts';

const EX_CONFIG = 78;
const TAG = '[supplier-view-backfill] ';
// occurredAt antigo: o backfill nunca regride um snapshot vindo de evento real (guard de recência).
const BACKFILL_OCCURRED_AT = new Date('2000-01-01T00:00:00.000Z');

const main = async (): Promise<number> => {
  const partnersUrl = process.env['PARTNERS_DATABASE_URL'];
  const financialUrl = process.env['FINANCIAL_DATABASE_URL'];
  if (partnersUrl === undefined || financialUrl === undefined) {
    process.stderr.write(`${TAG}PARTNERS_DATABASE_URL e FINANCIAL_DATABASE_URL são obrigatórios\n`);
    return EX_CONFIG;
  }

  const suppliersR = await listSuppliersForProjection(partnersUrl);
  if (!suppliersR.ok) {
    process.stderr.write(`${TAG}falha ao listar fornecedores (partners): ${suppliersR.error}\n`);
    return 1;
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
    const store = createDrizzleSupplierViewStore(handle, ClockReal());
    const result = await backfillSupplierViews(suppliersR.value, store, BACKFILL_OCCURRED_AT);
    if (!result.ok) return 1;
    process.stderr.write(
      `${TAG}concluído — ${result.value.applied} aplicados, ${result.value.failed} falhas ` +
        `de ${suppliersR.value.length} fornecedores\n`,
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
