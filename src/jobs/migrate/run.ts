// Entrypoint one-shot do job `migrate` (CORE-MIGRATE-JOB).
//
// Aplica as migrations de TODOS os módulos com persistência, de uma só vez, ANTES
// de http/workers subirem. Substitui (no Slice B) o migrate-no-boot das compositions
// HTTP — deploy-safe, sem race multi-instância (M5 do mysql-driver). No Slice A o job
// já existe e migra; as compositions HTTP ainda migram também (redundante, idempotente).
//
// Espelha `src/jobs/contracts/sweeper/run.ts`:
//   • one-shot: conecta → migra → sai. Cada porta fecha seu próprio pool.
//   • `process.exitCode` (não `process.exit`) — deixa o event loop esvaziar.
//
// Exit codes (sysexits.h):
//   0  — todos os módulos migrados (idempotente)
//   78 — EX_CONFIG: MIGRATE_DATABASE_URL ausente/vazia
//   1  — erro de runtime (conexão/migrator de algum módulo)

import process from 'node:process';

import { readMigrateConfig } from './config.ts';
import { runMigrations, type ModuleMigrator } from './migrate.ts';
import { applyMigrations as authApply } from '#src/modules/auth/public-api/migrate.ts';
import { applyMigrations as budgetPlansApply } from '#src/modules/budget-plans/public-api/migrate.ts';
import { applyMigrations as contractsApply } from '#src/modules/contracts/public-api/migrate.ts';
import { applyMigrations as financialApply } from '#src/modules/financial/public-api/migrate.ts';
import { applyMigrations as notificationsApply } from '#src/modules/notifications/public-api/migrate.ts';
import { applyMigrations as partnersApply } from '#src/modules/partners/public-api/migrate.ts';
import { applyMigrations as programsApply } from '#src/modules/programs/public-api/migrate.ts';

const EX_CONFIG = 78; // sysexits.h — configuração inválida.

// Ordem determinística. Os módulos compartilham o DB `core` mas têm journals
// próprios (`__drizzle_migrations_<m>`), então a ordem não cria dependência —
// fixá-la só torna o log e os testes reproduzíveis.
const MIGRATORS: readonly ModuleMigrator[] = [
  { module: 'auth', apply: authApply },
  { module: 'budget-plans', apply: budgetPlansApply },
  { module: 'contracts', apply: contractsApply },
  { module: 'financial', apply: financialApply },
  { module: 'notifications', apply: notificationsApply },
  { module: 'partners', apply: partnersApply },
  { module: 'programs', apply: programsApply },
];

const main = async (): Promise<number> => {
  const configR = readMigrateConfig(process.env);
  if (!configR.ok) {
    process.stderr.write(`[migrate] configuração inválida: ${configR.error}\n`);
    return EX_CONFIG;
  }

  const r = await runMigrations(MIGRATORS, configR.value.connectionString, (module) => {
    process.stderr.write(`[migrate] ${module}: ok\n`);
  });
  if (!r.ok) {
    process.stderr.write(`[migrate] falha ao migrar ${r.error.module}: ${r.error.error}\n`);
    return 1;
  }

  // Linha de resultado consumível — stdout para pipes/observabilidade.
  process.stdout.write(`[migrate] ok: ${r.value.join(', ')}\n`);
  return 0;
};

// Defesa de segunda camada: rejeição inesperada no main() não deixa o processo
// travado sem exitCode definido.
await main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((cause: unknown) => {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[migrate] rejeição não tratada no main: ${detail}\n`);
    process.exitCode = 1;
  });
