// Job one-shot (ADR-0041) — backfill do read-model de contagem de contratos (#110). COMPOSITION ROOT.
//
// Lê a contagem de contratos vivos por contraparte no `contracts` (via public-api, ADR-0006) e
// recompõe o `par_contract_count_view` do `partners` com `setCount` ABSOLUTO — idempotente (CA2) e
// reconciliador de drift (#129). Disparado manualmente / por cron externo; re-rodar é seguro.
// Nenhum módulo importa o outro — a ligação cross-módulo é aqui.
//
// Config por env: CONTRACTS_DATABASE_URL + PARTNERS_DATABASE_URL. Migrations NÃO aplicadas aqui.

import process from 'node:process';

import { buildContractsContractCountReadPort } from '#src/modules/contracts/public-api/index.ts';
import { openPartnersMysql } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractCountStore } from '#src/modules/partners/adapters/persistence/repos/contract-count-store.drizzle.ts';
import { backfillContractCounts } from './backfill.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.
const TAG = '[contract-count-backfill] ';

const main = async (): Promise<number> => {
  const contractsUrl = process.env['CONTRACTS_DATABASE_URL'];
  const partnersUrl = process.env['PARTNERS_DATABASE_URL'];
  if (contractsUrl === undefined || partnersUrl === undefined) {
    process.stderr.write(`${TAG}CONTRACTS_DATABASE_URL e PARTNERS_DATABASE_URL são obrigatórios\n`);
    return EX_CONFIG;
  }

  const readR = await buildContractsContractCountReadPort({ connectionString: contractsUrl });
  if (!readR.ok) {
    process.stderr.write(`${TAG}falha ao abrir MySQL (contracts): ${readR.error}\n`);
    return 1;
  }
  const readPort = readR.value;

  const partnersR = await openPartnersMysql({
    connectionString: partnersUrl,
    applyMigrations: false,
  });
  if (!partnersR.ok) {
    process.stderr.write(`${TAG}falha ao abrir MySQL (partners): ${partnersR.error}\n`);
    await readPort.close();
    return 1;
  }
  const partnersHandle = partnersR.value;

  try {
    const countsR = await readPort.listActiveContractCountsByContractor();
    if (!countsR.ok) {
      process.stderr.write(`${TAG}falha ao ler contagens (contracts): ${countsR.error}\n`);
      return 1;
    }

    const store = createDrizzleContractCountStore(partnersHandle);
    const result = await backfillContractCounts(countsR.value, store);
    if (!result.ok) return 1;

    process.stderr.write(
      `${TAG}concluído — ${result.value.applied} contrapartes aplicadas, ${result.value.failed} falhas ` +
        `de ${countsR.value.length} com contratos vivos\n`,
    );
    return result.value.failed > 0 ? 1 : 0;
  } finally {
    await readPort.close();
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
