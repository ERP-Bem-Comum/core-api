import type { Config } from 'drizzle-kit';

// Config `drizzle-kit generate` do módulo programs (MySQL, ADR-0014). Uso: `pnpm db:generate:programs`.
// Paths relativos à RAIZ do repo — o drizzle-kit os resolve pelo CWD, e os scripts pnpm rodam da raiz.
export default {
  dialect: 'mysql',
  schema: './src/modules/programs/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/programs/adapters/persistence/migrations/mysql',
} satisfies Config;
