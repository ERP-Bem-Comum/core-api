import type { Config } from 'drizzle-kit';

// Config `drizzle-kit generate` do módulo partners (MySQL, ADR-0014). Uso: `pnpm db:generate:partners`.
// Paths relativos à RAIZ do repo — o drizzle-kit os resolve pelo CWD, e os scripts pnpm rodam da raiz.
export default {
  dialect: 'mysql',
  schema: './src/modules/partners/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/partners/adapters/persistence/migrations/mysql',
} satisfies Config;
