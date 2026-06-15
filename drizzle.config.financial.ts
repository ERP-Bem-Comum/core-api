import type { Config } from 'drizzle-kit';

// Config `drizzle-kit generate` do módulo financial (MySQL). Isolado por módulo
// (ADR-0014). Uso: `pnpm db:generate:financial`.
//
// A aplicação da migration contra MySQL real é feita via `openMysqlFinancial`
// (driver em adapters/persistence/drivers/mysql-driver.ts) no boot do servidor
// ou em `pnpm run test:integration:financial`.
//
// Referência: padrão espelhado de `drizzle.config.programs.ts` e `drizzle.config.partners.ts`.

export default {
  dialect: 'mysql',
  schema: './src/modules/financial/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/financial/adapters/persistence/migrations/mysql',
} satisfies Config;
