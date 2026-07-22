// Config do job `auth:sync-permissions` (#462). Função pura — falha antes de abrir handle.
//
// Deliberadamente NÃO exige as envs `ADMIN_*` do `seed:admin`: sincronizar catálogo não cria
// usuário, e exigi-las faria o job sair 78 no deploy — o desfecho que a issue existe para evitar.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';

export type SyncPermissionsConfig = Readonly<{ connectionString: string }>;

export type SyncPermissionsConfigError = 'auth-database-url-missing';

export const readSyncPermissionsConfig = (
  env: Readonly<Record<string, string | undefined>>,
): Result<SyncPermissionsConfig, SyncPermissionsConfigError> => {
  const url = env['AUTH_DATABASE_URL']?.trim();
  if (url === undefined || url.length === 0) return err('auth-database-url-missing');
  return ok({ connectionString: url });
};
