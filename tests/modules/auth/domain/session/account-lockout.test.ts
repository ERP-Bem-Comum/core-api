/**
 * CTR-AUTH-ACCOUNT-LOCKOUT — W0 (RED) — BE-REC-001 (account lockout por conta).
 *
 * Modelo puro do cooldown progressivo (DD-USER-06: lockout mora na camada de sessao).
 * Politica: threshold falhas -> cooldown crescente (stepsMinutes), reset no sucesso.
 * DEVE FALHAR ate o W1: `account-lockout.ts` ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as AccountLockout from '#src/modules/auth/domain/session/account-lockout.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

const AT = new Date('2026-05-30T12:00:00.000Z');
const USER = UserId.generate();
const POLICY = { threshold: 5, stepsMinutes: [1, 5, 15, 60] } as const;

const after = (base: Date, minutes: number): Date => new Date(base.getTime() + minutes * 60_000);

describe('AccountLockout (cooldown progressivo)', () => {
  it('inicial: nao bloqueado, zero falhas', () => {
    const l = AccountLockout.initial(USER);
    assert.equal(l.failedAttempts, 0);
    assert.equal(AccountLockout.isLocked(l, AT), false);
  });

  it('falhas abaixo do threshold nao bloqueiam', () => {
    let l = AccountLockout.initial(USER);
    for (let i = 0; i < POLICY.threshold - 1; i += 1) {
      l = AccountLockout.registerFailure(l, AT, POLICY);
    }
    assert.equal(l.failedAttempts, POLICY.threshold - 1);
    assert.equal(AccountLockout.isLocked(l, AT), false);
  });

  it('na threshold-esima falha bloqueia pelo 1o step (1min)', () => {
    let l = AccountLockout.initial(USER);
    for (let i = 0; i < POLICY.threshold; i += 1) {
      l = AccountLockout.registerFailure(l, AT, POLICY);
    }
    assert.equal(AccountLockout.isLocked(l, AT), true);
    // ainda bloqueado 59s depois; liberado 61s depois (1min)
    assert.equal(AccountLockout.isLocked(l, new Date(AT.getTime() + 59_000)), true);
    assert.equal(AccountLockout.isLocked(l, new Date(AT.getTime() + 61_000)), false);
  });

  it('cooldown e progressivo: cada falha extra sobe o step (5min, 15min) ate o cap (60min)', () => {
    let l = AccountLockout.initial(USER);
    for (let i = 0; i < POLICY.threshold; i += 1) l = AccountLockout.registerFailure(l, AT, POLICY);
    // +1 falha -> step[1] = 5min
    l = AccountLockout.registerFailure(l, AT, POLICY);
    assert.equal(AccountLockout.isLocked(l, after(AT, 4)), true);
    assert.equal(AccountLockout.isLocked(l, after(AT, 6)), false);
    // +1 -> step[2] = 15min
    l = AccountLockout.registerFailure(l, AT, POLICY);
    assert.equal(AccountLockout.isLocked(l, after(AT, 14)), true);
    assert.equal(AccountLockout.isLocked(l, after(AT, 16)), false);
    // muitas falhas extras -> cap no ultimo step (60min), nunca permanente
    for (let i = 0; i < 20; i += 1) l = AccountLockout.registerFailure(l, AT, POLICY);
    assert.equal(AccountLockout.isLocked(l, after(AT, 59)), true);
    assert.equal(AccountLockout.isLocked(l, after(AT, 61)), false);
  });

  it('reset zera as falhas e remove o bloqueio (login bem-sucedido)', () => {
    let l = AccountLockout.initial(USER);
    for (let i = 0; i < POLICY.threshold; i += 1) l = AccountLockout.registerFailure(l, AT, POLICY);
    assert.equal(AccountLockout.isLocked(l, AT), true);
    const r = AccountLockout.reset(l);
    assert.equal(r.failedAttempts, 0);
    assert.equal(AccountLockout.isLocked(r, AT), false);
  });
});
