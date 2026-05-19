import type { Config } from 'drizzle-kit';

// Config para `drizzle-kit generate` no dialeto MySQL.
// Gerada como parte do ticket CTR-DB-MIGRATION-MYSQL (#3 da sequência ADR-0020).
//
// Convivência temporária com `drizzle.config.ts` (SQLite, dev/CI legado):
// este config é paralelo e só será invocado por `pnpm db:generate:mysql`.
// A unificação (remoção do SQLite) acontece em `CTR-CLEANUP-SQLITE` (#5).
//
// Uso:
//   pnpm db:generate:mysql
//     → drizzle-kit lê o schema MySQL e emite uma migration versionada em
//       src/modules/contracts/adapters/persistence/migrations/mysql/.
//
// A APLICAÇÃO da migration contra um MySQL real (via mysql2/migrator) é
// trabalho do ticket CTR-DB-DRIVER-MYSQL (#4) — neste ticket geramos e
// validamos o SQL contra o container do compose via `docker exec`, sem
// wirar o driver runtime do app.
//
// Sustentação: ADR-0020 §"Convenção", ADR-0013 (MySQL 8 engine).

export default {
  dialect: 'mysql',
  schema: './src/modules/contracts/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/contracts/adapters/persistence/migrations/mysql',
} satisfies Config;
