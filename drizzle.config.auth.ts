import type { Config } from 'drizzle-kit';

// Config para `drizzle-kit generate` no dialeto MySQL — módulo auth.
// Gerado como parte do ticket AUTH-DB-SCHEMA (P0).
//
// Separado do drizzle.config.ts (contracts) para preservar isolamento de módulo
// (ADR-0014 §"Isolamento por prefixo"). Cada módulo tem config + migration dir próprios.
//
// Uso:
//   pnpm db:generate:auth
//     → drizzle-kit lê o schema auth e emite migration versionada em
//       src/modules/auth/adapters/persistence/migrations/mysql/.
//
// A APLICAÇÃO da migration contra MySQL real (via mysql2/migrator) é trabalho
// de tickets futuros (AUTH-DB-DRIVER). Neste ticket geramos e validamos o SQL.
//
// Sustentação: ADR-0020 §"Convenção", ADR-0014 (prefixo auth_*), ADR-0013 (MySQL 8.4).

export default {
  dialect: 'mysql',
  schema: './src/modules/auth/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/auth/adapters/persistence/migrations/mysql',
} satisfies Config;
