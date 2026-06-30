import type { Config } from 'drizzle-kit';

// Config `drizzle-kit generate` do módulo auth (MySQL, ADR-0014). Uso: `pnpm db:generate:auth`.
// Paths relativos à RAIZ do repo — o drizzle-kit os resolve pelo CWD, e os scripts pnpm rodam da raiz.
export default {
  dialect: 'mysql',
  schema: './src/modules/auth/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/auth/adapters/persistence/migrations/mysql',
} satisfies Config;
