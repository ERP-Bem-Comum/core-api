/**
 * AccountLockout - modelo puro de cooldown progressivo por conta (BE-REC-001, OWASP WSTG-ATHN-03).
 *
 * Module-as-namespace (Padrao D). DD-USER-06: lockout/`failedAttempts` moram na camada de sessao,
 * nao no `User`. Defesa contra brute force / password spraying, complementar ao rate-limit por IP.
 *
 * Politica: ate `threshold-1` falhas nao bloqueiam; da `threshold`-esima em diante, cada falha
 * aplica um cooldown crescente (`stepsMinutes`, com cap no ultimo step) a partir de `at`. O cooldown
 * e SEMPRE temporario (anti-DoS: nunca permanente). `reset` zera tudo (login bem-sucedido). ASCII puro.
 */

import type { UserId } from '../identity/user-id.ts';

/** Parametros do cooldown. `stepsMinutes` deve ser nao-vazio; o ultimo valor e o cap. */
export type LockoutPolicy = Readonly<{ threshold: number; stepsMinutes: readonly number[] }>;

export type AccountLockout = Readonly<{
  userId: UserId;
  failedAttempts: number;
  /** Instante ate o qual a conta esta em cooldown; `null` = sem bloqueio ativo. */
  lockedUntil: Date | null;
}>;

export const initial = (userId: UserId): AccountLockout => ({
  userId,
  failedAttempts: 0,
  lockedUntil: null,
});

export const isLocked = (lockout: AccountLockout, at: Date): boolean =>
  lockout.lockedUntil !== null && lockout.lockedUntil.getTime() > at.getTime();

export const registerFailure = (
  lockout: AccountLockout,
  at: Date,
  policy: LockoutPolicy,
): AccountLockout => {
  const failedAttempts = lockout.failedAttempts + 1;
  if (failedAttempts < policy.threshold) {
    return { userId: lockout.userId, failedAttempts, lockedUntil: null };
  }
  // Nivel 0 na threshold-esima falha; cada falha extra sobe um step ate o cap (ultimo).
  const level = failedAttempts - policy.threshold;
  const lastIdx = policy.stepsMinutes.length - 1;
  const minutes =
    policy.stepsMinutes[Math.min(level, lastIdx)] ?? policy.stepsMinutes[lastIdx] ?? 1;
  return {
    userId: lockout.userId,
    failedAttempts,
    lockedUntil: new Date(at.getTime() + minutes * 60_000),
  };
};

export const reset = (lockout: AccountLockout): AccountLockout => ({
  userId: lockout.userId,
  failedAttempts: 0,
  lockedUntil: null,
});
