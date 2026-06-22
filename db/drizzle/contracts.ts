import type { Config } from 'drizzle-kit';

// Config `drizzle-kit generate` do módulo contracts (MySQL, ADR-0014). Uso: `pnpm db:generate`.
// Paths relativos à RAIZ do repo — o drizzle-kit os resolve pelo CWD, e os scripts pnpm rodam da raiz.
export default {
  dialect: 'mysql',
  schema: './src/modules/contracts/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/contracts/adapters/persistence/migrations/mysql',
} satisfies Config;
