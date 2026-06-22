// Config do job `migrate` (CORE-MIGRATE-JOB). Função pura — falha rápida antes de
// abrir qualquer handle (espelha `readJobConfig` do sweeper).
//
// Lê `MIGRATE_DATABASE_URL`. Como o database é único (`core`, ADR-0014), uma só
// connection string migra os 6 módulos (cada um com sua migrationsTable própria).

import { type Result, ok, err } from '#src/shared/primitives/result.ts';

export type MigrateConfig = Readonly<{ connectionString: string }>;

export type MigrateConfigError = 'migrate-database-url-missing';

export const readMigrateConfig = (
  env: Readonly<Record<string, string | undefined>>,
): Result<MigrateConfig, MigrateConfigError> => {
  const url = env['MIGRATE_DATABASE_URL']?.trim();
  if (url === undefined || url.length === 0) return err('migrate-database-url-missing');
  return ok({ connectionString: url });
};
