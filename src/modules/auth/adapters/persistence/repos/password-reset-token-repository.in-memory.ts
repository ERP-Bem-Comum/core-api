/**
 * Adapter InMemory de PasswordResetTokenRepository (modulo auth, BE-REC-003).
 * `Map<id, PasswordResetToken>`. `findByTokenHash`/`findUnusedByUserId` por varredura.
 * Para testes/CLI e o boot HTTP sem DB.
 *
 * AUTH-DOMAIN-OUTBOX (ADR-0047): `saveWithEvents(token, events)` grava o token E publica os
 * eventos num `OutboxPort` opcionalmente INJETADO (espelha makeInMemorySupplierStore). Atomico
 * em memoria (token gravado, depois eventos). O invariante de atomicidade REAL (rollback) e
 * coberto pela suite Drizzle/MySQL. Sem outbox injetado: os eventos sao descartados (no-op).
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  PasswordResetTokenRepository,
  PasswordResetTokenRepositoryError,
  PasswordResetOutboxMessage,
} from '../../../domain/session/password-reset-token-repository.ts';
import type { PasswordResetToken } from '../../../domain/session/password-reset-token.ts';
import type { OutboxPort, OutboxMessage } from '../../../application/ports/outbox.ts';

export type InMemoryPasswordResetTokenStore = Readonly<{
  repository: PasswordResetTokenRepository;
  clear: () => void;
}>;

/**
 * makeInMemoryPasswordResetTokenStore — opcionalmente recebe um `outbox` (OutboxPort InMemory)
 * para inspecao em testes. Quando ausente, `saveWithEvents` apenas grava o token (eventos no-op).
 */
export const makeInMemoryPasswordResetTokenStore = (
  outbox?: OutboxPort,
): InMemoryPasswordResetTokenStore => {
  const map = new Map<string, PasswordResetToken>();

  const saveWithEvents = async (
    token: PasswordResetToken,
    events: readonly PasswordResetOutboxMessage[],
  ): Promise<Result<void, PasswordResetTokenRepositoryError>> => {
    map.set(token.id, token);
    if (outbox !== undefined && events.length > 0) {
      const appended = await outbox.append(events as readonly OutboxMessage[]);
      if (!appended.ok) return err('password-reset-token-repo-unavailable');
    }
    return ok(undefined);
  };

  const repository: PasswordResetTokenRepository = {
    save: async (token) => {
      map.set(token.id, token);
      return ok(undefined);
    },
    saveWithEvents,
    findByTokenHash: async (tokenHash) =>
      ok([...map.values()].find((t) => t.tokenHash === tokenHash) ?? null),
    findUnusedByUserId: async (userId) =>
      ok([...map.values()].filter((t) => t.userId === userId && t.usedAt === null)),
  };

  return {
    repository,
    clear: () => {
      map.clear();
    },
  };
};
