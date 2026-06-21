import type { Config } from 'drizzle-kit';

// Config `drizzle-kit generate` do módulo financial (MySQL, ADR-0014). Uso: `pnpm db:generate:financial`.
// Paths relativos à RAIZ do repo — o drizzle-kit os resolve pelo CWD, e os scripts pnpm rodam da raiz.
export default {
  dialect: 'mysql',
  schema: './src/modules/financial/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/financial/adapters/persistence/migrations/mysql',
} satisfies Config;
