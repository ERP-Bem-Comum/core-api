/**
 * Port de persistencia do agregado PasswordResetToken (modulo auth, BE-REC-003).
 *
 * Posicionado em domain/ (§3.H.2). `findByTokenHash` e o lookup do confirm (use case hasheia o
 * token em claro e busca). `findUnusedByUserId` serve o request a invalidar tokens pendentes
 * anteriores: criterio ARMAZENAVEL (`used_at IS NULL`); `expired` e temporal e o repo nao tem Clock
 * (espelha `findRevocableByUserId` do refresh). ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { UserId } from '../identity/user-id.ts';
import type { PasswordResetToken } from './password-reset-token.ts';

export type PasswordResetTokenRepositoryError = 'password-reset-token-repo-unavailable';

/**
 * Mensagem de outbox ja montada (payload opaco serializado), gravada na MESMA tx do save
 * (AUTH-DOMAIN-OUTBOX / ADR-0047). Shape estrutural — declarado aqui para o repo (persistencia)
 * nao depender da application layer (regra domain.md). Equivalente ao `OutboxMessage` do
 * `application/ports/outbox.ts` (structural typing reconcilia ambos).
 */
export type PasswordResetOutboxMessage = Readonly<{
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  occurredAt: Date;
  payload: string;
}>;

export type PasswordResetTokenRepository = Readonly<{
  save: (token: PasswordResetToken) => Promise<Result<void, PasswordResetTokenRepositoryError>>;
  /**
   * saveWithEvents — AUTH-DOMAIN-OUTBOX (ADR-0047). Salva o token E grava as `events`
   * (mensagens de outbox ja montadas, ex.: PasswordResetRequested/UserInvited) na MESMA
   * transacao (atomicidade — ADR-0015). Ambos persistem ou nenhum (rollback total). O
   * adapter Drizzle envolve `appendOutboxInTx` na propria `db.transaction` do save; o
   * InMemory grava token + outbox em sequencia (atomico em memoria).
   */
  saveWithEvents: (
    token: PasswordResetToken,
    events: readonly PasswordResetOutboxMessage[],
  ) => Promise<Result<void, PasswordResetTokenRepositoryError>>;
  findByTokenHash: (
    tokenHash: string,
  ) => Promise<Result<PasswordResetToken | null, PasswordResetTokenRepositoryError>>;
  findUnusedByUserId: (
    userId: UserId,
  ) => Promise<Result<readonly PasswordResetToken[], PasswordResetTokenRepositoryError>>;
}>;
