/**
 * W0 (RED) - round-trip de user federado (passwordHash null) no Drizzle/MySQL.
 * Ticket: AUTH-USER-PASSWORD-OPTIONAL. Gated MYSQL_INTEGRATION=1 (Docker OFF -> skip).
 *
 * CA5: salvar um User com passwordHash=null grava password_hash=NULL no banco; findById reidrata
 *      com passwordHash: null. Hoje:
 *        - userToInsert grava `user.passwordHash as unknown as string` (null vira NULL no driver, ok),
 *          mas o save exige um User cujo passwordHash hoje e nao-null -> nao montavel sem cast;
 *        - userFromRows com password_hash=NULL faz `?? ''` -> err('password-hash-empty') -> findById falha.
 *      Logo o round-trip nao fecha em W0.
 *
 * Espelha tests/.../user-repository.drizzle.test.ts (truncate em ordem FK, VALID_CONN, after->close).
 * ASCII puro.
 *
 * NOTA SOBRE O CAST: hoje passwordHash e nao-null; montar o user federado exige cast. Apos a Opcao A
 * (W1) o `null` e de primeira classe e o cast some.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.drizzle.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import type { ActiveUser } from '#src/modules/auth/domain/identity/user/types.ts';
import type { PasswordHash } from '#src/modules/auth/domain/credential/password-hash.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const FIXED_NOW = new Date('2026-05-27T12:00:00.000Z');
const fixedClock = ClockFixed(FIXED_NOW);

const truncateAll = async (handle: AuthMysqlHandle): Promise<void> => {
  const { db, schema } = handle;
  await db.delete(schema.authUserRole);
  await db.delete(schema.authRolePermission);
  await db.delete(schema.authRefreshToken);
  await db.delete(schema.authUser);
  await db.delete(schema.authRole);
  await db.delete(schema.authPermission);
};

// ActiveUser federado (sem credencial local). Cast localizado some apos a Opcao A (W1).
const makeFederatedUser = (): ActiveUser => {
  const emailR = Email.parse('federated-roundtrip@example.com');
  if (!emailR.ok) throw new Error('fixture: email invalido');
  return {
    id: UserId.generate(),
    email: emailR.value,
    passwordHash: null as unknown as PasswordHash,
    roles: [],
    status: 'active',
  };
};

if (integrationEnabled()) {
  let handle: AuthMysqlHandle | null = null;

  before(async () => {
    const r = await openAuthMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openAuthMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  describe('AUTH-USER-PASSWORD-OPTIONAL — CA5: round-trip federado (Drizzle)', () => {
    beforeEach(async () => {
      if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');
      await truncateAll(handle);
    });

    it('CA5: save user passwordHash=null -> password_hash NULL; findById reidrata null', async () => {
      if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');
      const { repository, reader } = createDrizzleUserStore(handle, fixedClock);

      const federated = makeFederatedUser();
      const savedR = await repository.save(federated);
      assert.ok(savedR.ok, `save falhou: ${!savedR.ok ? savedR.error : ''}`);

      const foundR = await reader.findById(federated.id);
      assert.ok(foundR.ok, `findById falhou: ${!foundR.ok ? foundR.error : ''}`);
      if (!foundR.ok || foundR.value === null) {
        assert.fail('findById retornou null — user federado nao reidratou');
        return;
      }
      assert.equal(
        foundR.value.passwordHash,
        null,
        'user federado deve reidratar com passwordHash null',
      );
      assert.equal(foundR.value.id, federated.id);
    });
  });
}
