import type { Config } from 'drizzle-kit';

// Config para `drizzle-kit generate` no dialeto MySQL — módulo notifications.
// Separado dos demais (contracts/auth/partners) para preservar isolamento de módulo
// (ADR-0014 §"isolamento por prefixo"). Cada módulo tem config + migration dir próprios.
//
// Uso:
//   pnpm db:generate:notifications
//     → emite migration versionada em
//       src/modules/notifications/adapters/persistence/migrations/mysql/.
//
// Após gerar, editar o SQL com ENGINE/charset e COLLATE utf8mb4_bin em colunas UUID
// (limitação Drizzle 0.45.x — ver cabeçalho de schemas/mysql.ts).
//
// Sustentação: ADR-0020 §"Convenção", ADR-0014 (prefixo notifications_*), ADR-0013 (MySQL 8.4).

export default {
  dialect: 'mysql',
  schema: './src/modules/notifications/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/notifications/adapters/persistence/migrations/mysql',
} satisfies Config;
