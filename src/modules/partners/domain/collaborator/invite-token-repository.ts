/**
 * Port de persistência do agregado `CollaboratorInviteToken` (US5).
 *
 * Posicionado em `domain/collaborator/` (mesma convenção de `repository.ts` e do molde
 * `auth/domain/session/password-reset-token-repository.ts`). `findByTokenHash` é o lookup do
 * fluxo público (a borda hasheia o token claro e busca). `markUsed` é o **consume atômico**:
 * transição `pending → used` condicionada a `used_at IS NULL` no adapter real
 * (`UPDATE ... WHERE id = ? AND used_at IS NULL`), devolvendo se ESTA chamada venceu a corrida —
 * defesa anti-replay que o `auth` (find→save sem tx) NÃO tem. `expired` é temporal e o repo não
 * tem Clock (o use case computa via `state()` com `clock.now()`).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { CollaboratorInviteToken } from './invite-token.ts';
import type { CollaboratorInviteTokenId } from './invite-token-id.ts';

export type CollaboratorInviteTokenRepositoryError = 'invite-token-repo-unavailable';

export type CollaboratorInviteTokenRepository = Readonly<{
  /** Persiste um convite recém-emitido (insert; `usedAt` null). */
  save: (
    token: CollaboratorInviteToken,
  ) => Promise<Result<void, CollaboratorInviteTokenRepositoryError>>;
  findByTokenHash: (
    tokenHash: string,
  ) => Promise<Result<CollaboratorInviteToken | null, CollaboratorInviteTokenRepositoryError>>;
  /**
   * Consume atômico: marca `used_at = usedAt` apenas se ainda `pending` (`used_at IS NULL`).
   * `true` = esta chamada venceu a corrida; `false` = já consumido (replay → 404 token-used).
   */
  markUsed: (
    id: CollaboratorInviteTokenId,
    usedAt: Date,
  ) => Promise<Result<boolean, CollaboratorInviteTokenRepositoryError>>;
}>;
