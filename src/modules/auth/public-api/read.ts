/**
 * Public-API de LEITURA do nome de usuário do módulo auth (AUTH-USER-READ-PORT / #207).
 *
 * Único ponto pelo qual outro módulo (financial — rota gorda ADR-0032) lê o NOME de um
 * usuário (read-only), SEM tocar os internos de persistência nem `auth_*` cru (ADR-0006/
 * ADR-0014). Devolve a projeção mínima `{ id, name }`. Espelha `buildPartnersReadPort` —
 * monta o store a partir de uma connection-string, sem subir Fastify. Read-only (zero escrita).
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import {
  openAuthMysql,
  type AuthMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleUserReadStore } from '../adapters/persistence/repos/user-read.drizzle.ts';
import type {
  AuthUserReadPort,
  ApproverAuthorityReadPort,
} from '../application/ports/user-read.ts';

export type {
  AuthUserReadPort,
  ApproverAuthorityReadPort,
  AuthUserReadError,
  AuthUserNameView,
  ApproverAuthorityView,
} from '../application/ports/user-read.ts';

export type AuthReadPort = AuthUserReadPort &
  ApproverAuthorityReadPort &
  Readonly<{
    close: () => Promise<void>;
  }>;

export type BuildAuthUserReadPortOptions = Readonly<{ connectionString: string }>;

export type BuildAuthUserReadPortError = AuthMysqlDriverError;

export const buildAuthUserReadPort = async (
  opts: BuildAuthUserReadPortOptions,
): Promise<Result<AuthReadPort, BuildAuthUserReadPortError>> => {
  // Leitura: as auth_* já existem (provisionadas pela migration). Sem applyMigrations.
  const handleR = await openAuthMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const store = createDrizzleUserReadStore(handle);

  return ok({
    ...store,
    close: async () => handle.close(),
  });
};
