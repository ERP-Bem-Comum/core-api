import type { Config } from 'drizzle-kit';

// Config `drizzle-kit generate` do módulo budget-plans (MySQL, ADR-0014). Uso: `pnpm db:generate:budget-plans`.
// Paths relativos à RAIZ do repo — o drizzle-kit os resolve pelo CWD, e os scripts pnpm rodam da raiz.
export default {
  dialect: 'mysql',
  schema: './src/modules/budget-plans/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/budget-plans/adapters/persistence/migrations/mysql',
} satisfies Config;
