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

/**
 * Projeção MÍNIMA da autoridade de aprovação (FIN-APPROVER-LIMIT-AUTH #289), consumida
 * cross-módulo pelo financial (ADR-0006). Estado remoto mínimo (Vernon, "Think Minimalistic"):
 * o consumidor recebe só { canApprove, limitCents }, nunca o User/Role internos.
 *   - canApprove: usuário tem ≥1 papel com 'payable:approve';
 *   - limitCents: MAX da alçada entre os papéis aprovadores; null = sem alçada (não aprova).
 */
export type ApproverAuthorityView = Readonly<{
  userId: string;
  canApprove: boolean;
  limitCents: number | null;
}>;

export type AuthUserReadPort = Readonly<{
  getUserName: (id: string) => Promise<Result<AuthUserNameView | null, AuthUserReadError>>;
}>;

/**
 * Port SEGREGADO (ISP) para a autoridade de aprovação. Mantém `AuthUserReadPort` (nome) intacto
 * para não quebrar consumidores existentes. O adapter Drizzle implementa ambos.
 */
export type ApproverAuthorityReadPort = Readonly<{
  getApproverAuthority: (
    userId: string,
  ) => Promise<Result<ApproverAuthorityView | null, AuthUserReadError>>;
  listApproversWithAuthority: () => Promise<
    Result<readonly ApproverAuthorityView[], AuthUserReadError>
  >;
}>;
