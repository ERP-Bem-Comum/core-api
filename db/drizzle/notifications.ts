import type { Config } from 'drizzle-kit';

// Config `drizzle-kit generate` do módulo notifications (MySQL, ADR-0014). Uso: `pnpm db:generate:notifications`.
// Paths relativos à RAIZ do repo — o drizzle-kit os resolve pelo CWD, e os scripts pnpm rodam da raiz.
export default {
  dialect: 'mysql',
  schema: './src/modules/notifications/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/notifications/adapters/persistence/migrations/mysql',
} satisfies Config;
