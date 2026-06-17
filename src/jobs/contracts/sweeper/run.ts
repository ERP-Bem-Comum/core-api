// Entrypoint one-shot do job de auto-expire de contratos (CTR-AUTO-EXPIRE / ADR-0041).
//
// DIFERENÇAS em relação ao outbox worker (`worker/run.ts`):
//   • SEM AbortController / SIGTERM listener — one-shot. Se o processo receber SIGTERM
//     no meio, a transação MySQL faz rollback → próximo disparo refaz (idempotente).
//   • SEM loop — conecta → executa → fecha pool → sai.
//   • `process.exitCode` (não `process.exit()`) — deixa o event loop esvaziar naturalmente
//     antes de encerrar. O pool é fechado no `finally`, sem handles pendentes.
//
// BOOTSTRAP espelha `worker/run.ts`:
//   readJobConfig → openMysql → createDrizzleContractRepository → runSweep → close pool.
//   `withNewCorrelation` propaga correlationId em todos os logs/eventos da execução.
//
// Exit codes (sysexits.h):
//   0  — sucesso (mesmo que expired=0: é resultado válido, não erro)
//   78 — EX_CONFIG: config inválida (env ausente ou mal-formada)
//   1  — erro de runtime (conexão, I/O, repositório)

import process from 'node:process';

import { withNewCorrelation } from '#src/shared/observability/correlation.ts';
import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import { claimJobRun } from '#src/modules/contracts/adapters/persistence/repos/job-run.drizzle.ts';
import { runSweep } from './sweeper.ts';
import { readJobConfig } from './config.ts';
import { ClockSaoPaulo } from './clock-sao-paulo.ts';

const EX_CONFIG = 78; // sysexits.h — configuração inválida.

const main = async (): Promise<number> => {
  // 1. Config — falha rápida antes de abrir qualquer handle.
  const configR = readJobConfig(process.env);
  if (!configR.ok) {
    process.stderr.write(`[contracts-sweeper] configuração inválida: ${configR.error}\n`);
    return EX_CONFIG;
  }
  const config = configR.value;

  // 2. Conexão MySQL — applyMigrations: false (prod-safe; migrations são do release).
  const handleR = await openMysql({
    connectionString: config.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) {
    process.stderr.write(`[contracts-sweeper] falha ao abrir MySQL: ${handleR.error}\n`);
    return 1;
  }
  const handle = handleR.value;

  // 3. Execução one-shot — pool fechado no `finally` em qualquer caminho.
  try {
    const contractRepo = createDrizzleContractRepository(handle);
    const clock = ClockSaoPaulo();

    // Coordenação multi-instância (defense-in-depth — ADR-0041): só uma instância roda o sweep do dia.
    // Backstop sobre o cron singleton; o próprio sweep já é idempotente (lock de eficiência).
    const runKey = clock.now().toISOString().slice(0, 10);
    const claim = await claimJobRun(handle, 'contracts-sweeper', runKey, clock.now());
    if (!claim.ok) {
      process.stderr.write(
        `[contracts-sweeper] falha ao reivindicar execução (${runKey}): ${claim.error}\n`,
      );
      return 1;
    }
    if (!claim.value) {
      process.stdout.write(
        `[contracts-sweeper] execução de ${runKey} já reivindicada por outra instância — skip\n`,
      );
      return 0;
    }

    const result = await withNewCorrelation(async () =>
      runSweep({ contractRepo, clock }, { batchSize: config.batchSize }),
    );

    if (!result.ok) {
      const detail = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      process.stderr.write(`[contracts-sweeper] erro no sweep: ${detail}\n`);
      return 1;
    }

    // Linha de resultado consumível — stdout para pipes/observabilidade.
    const { expired, scanned } = result.value;
    process.stdout.write(`[contracts-sweeper] expired=${expired} scanned=${scanned}\n`);
    return 0;
  } catch (cause) {
    // Defesa em profundidade: `runSweep` não deve lançar (converte para Result),
    // mas um bug inesperado não pode deixar o pool aberto.
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[contracts-sweeper] erro fatal inesperado: ${detail}\n`);
    return 1;
  } finally {
    await handle.close();
  }
};

// Defesa de segunda camada: rejeição inesperada no main() (ex.: bug no próprio
// bootstrap antes do try) não deixa processo travado sem exitCode definido.
await main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((cause: unknown) => {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[contracts-sweeper] rejeição não tratada no main: ${detail}\n`);
    process.exitCode = 1;
  });
