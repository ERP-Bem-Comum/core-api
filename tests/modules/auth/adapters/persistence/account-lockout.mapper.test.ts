/**
 * CTR-AUTH-LOCKOUT-PERSISTENCE — mapper AccountLockout row<->domínio (BE-REC-001). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  accountLockoutFromRow,
  accountLockoutToInsert,
} from '#src/modules/auth/adapters/persistence/mappers/account-lockout.mapper.ts';
import * as AccountLockout from '#src/modules/auth/domain/session/account-lockout.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

describe('account-lockout mapper', () => {
  it('round-trip: toInsert -> fromRow preserva o agregado', () => {
    const userId = UserId.generate();
    const lockedUntil = new Date('2026-05-30T12:05:00.000Z');
    const lockout: AccountLockout.AccountLockout = {
      userId,
      failedAttempts: 6,
      lockedUntil,
    };

    const row = accountLockoutToInsert(lockout);
    // o row de insert vira um row de select equivalente (mode:'date' já entrega Date)
    const back = accountLockoutFromRow({
      userId: row.userId,
      failedAttempts: row.failedAttempts,
      lockedUntil: row.lockedUntil ?? null,
    });

    assert.equal(back.ok, true);
    if (back.ok) {
      assert.equal(back.value.userId, userId);
      assert.equal(back.value.failedAttempts, 6);
      assert.equal(back.value.lockedUntil?.getTime(), lockedUntil.getTime());
    }
  });

  it('fromRow com lockedUntil null -> sem bloqueio', () => {
    const userId = UserId.generate();
    const back = accountLockoutFromRow({
      userId,
      failedAttempts: 0,
      lockedUntil: null,
    });
    assert.equal(back.ok, true);
    if (back.ok) {
      assert.equal(back.value.lockedUntil, null);
      assert.equal(AccountLockout.isLocked(back.value, new Date()), false);
    }
  });

  it('fromRow com userId inválido -> erro tagged', () => {
    const back = accountLockoutFromRow({
      userId: 'nao-e-uuid',
      failedAttempts: 0,
      lockedUntil: null,
    });
    assert.equal(back.ok, false);
    if (!back.ok) assert.equal(back.error.tag, 'AccountLockoutMapperInvalidUserId');
  });
});
