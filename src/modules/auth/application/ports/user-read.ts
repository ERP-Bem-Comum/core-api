/**
 * AUTH-USER-READ-PORT (#207) — Port de LEITURA (read-only) do nome de usuário,
 * consumível cross-módulo SÓ pela public-api (ADR-0006/ADR-0014).
 *
 * Espelha o molde `partners/application/ports/contractor-read.ts`. Devolve a projeção
 * mínima `{ id, name }` — nunca o agregado interno. `name` pode ser `null` (auth_user.name
 * é nullable). id inexistente → `ok(null)`. Erro de infra → `err('auth-user-read-unavailable')`
 * (sem throw cruzando a borda). Zero escrita.
 */

import type { Result } from '#src/shared/primitives/result.ts';

export type AuthUserReadError = 'auth-user-read-unavailable';

export type AuthUserNameView = Readonly<{ id: string; name: string | null }>;

export type AuthUserReadPort = Readonly<{
  getUserName: (id: string) => Promise<Result<AuthUserNameView | null, AuthUserReadError>>;
}>;
