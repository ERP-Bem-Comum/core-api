// Entrypoint one-shot (issue #425 · ADR-0041) — backfill de renumeração pelo ano de vigência
// inicial. COMPOSITION ROOT. Molde: `src/jobs/financial/payable-view-backfill/run.ts`.
//
// Fluxo: config (env) → openMysql → renumberContractsByVigencia → fecha pool → exit code.
// Config por env: CONTRACTS_DATABASE_URL.
//
// DIFERENÇAS vs. worker contínuo (ADR-0041 §"Job periódico é one-shot"):
//   • SEM AbortController / SIGTERM listener — one-shot. SIGTERM no meio → MySQL faz rollback
//     da statement corrente → próximo disparo refaz (idempotência é a garantia).
//   • SEM loop — conecta → executa → fecha pool → sai.
//   • `process.exitCode` (não `process.exit()`) — o pool fecha no `finally` sem handles pendentes.

import process from 'node:process';

import { withNewCorrelation } from '#src/shared/observability/correlation.ts';
import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { renumberContractsByVigencia } from './renumber.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.
const TAG = '[renumber-by-vigencia] ';

const main = async (): Promise<number> => {
  const connectionString = process.env['CONTRACTS_DATABASE_URL'];
  if (connectionString === undefined || connectionString === '') {
    process.stderr.write(`${TAG}CONTRACTS_DATABASE_URL é obrigatório\n`);
    return EX_CONFIG;
  }

  // applyMigrations: false — prod-safe; migrations são do release (M5 do driver).
  const handleR = await openMysql({ connectionString, applyMigrations: false });
  if (!handleR.ok) {
    process.stderr.write(`${TAG}falha ao abrir MySQL: ${handleR.error}\n`);
    return 1;
  }
  const handle = handleR.value;

  try {
    const result = await withNewCorrelation(async () => renumberContractsByVigencia(handle));
    if (!result.ok) {
      process.stderr.write(`${TAG}erro no backfill: ${result.error}\n`);
      return 1;
    }
    const s = result.value;
    process.stdout.write(
      `${TAG}concluído — ${s.affected} renumerados ` +
        `(${s.preserved} preservados, ${s.reassigned} por colisão), ` +
        `${s.skippedMalformed} pulados de ${s.scanned} contratos; ` +
        `anos reconciliados: [${s.reconciledYears.join(', ')}]\n`,
    );
    return 0;
  } catch (cause) {
    // Defesa em profundidade: renumber não deve lançar (converte para Result), mas um
    // bug inesperado não pode deixar o pool aberto.
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`${TAG}erro fatal inesperado: ${detail}\n`);
    return 1;
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
