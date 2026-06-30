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

/**
 * Mensagem de outbox de e-mail (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047). Shape estrutural —
 * declarado aqui para o repo (persistencia) nao depender da application layer (regra domain.md).
 * Equivalente ao `OutboxMessage` do `application/ports/email-outbox.ts` (structural typing
 * reconcilia ambos).
 */
export type CollaboratorInviteOutboxMessage = Readonly<{
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  occurredAt: Date;
  payload: string;
}>;

export type CollaboratorInviteTokenRepository = Readonly<{
  /** Persiste um convite recém-emitido (insert; `usedAt` null). */
  save: (
    token: CollaboratorInviteToken,
  ) => Promise<Result<void, CollaboratorInviteTokenRepositoryError>>;
  /**
   * saveWithEvents — PARTNERS-INVITE-DOMAIN-EVENT (ADR-0047). Salva o invite-token E grava as
   * `events` (mensagens de outbox ja montadas, ex.: CollaboratorInvited) na MESMA transacao
   * (atomicidade — ADR-0015). Ambos persistem ou nenhum (rollback total). O adapter Drizzle
   * envolve `appendEmailOutboxInTx` na propria `db.transaction` do save; o InMemory grava
   * token + outbox em sequencia (atomico em memoria).
   */
  saveWithEvents: (
    token: CollaboratorInviteToken,
    events: readonly CollaboratorInviteOutboxMessage[],
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
