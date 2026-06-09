import type { Config } from 'drizzle-kit';

// Config `drizzle-kit generate` do módulo programs (MySQL). Isolado por módulo
// (ADR-0014). Uso: `pnpm db:generate:programs`.

export default {
  dialect: 'mysql',
  schema: './src/modules/programs/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/programs/adapters/persistence/migrations/mysql',
} satisfies Config;
