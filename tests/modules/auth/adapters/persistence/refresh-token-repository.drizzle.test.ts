/**
 * AUTH-DB-REPO-SESSION (P3) — Drizzle/MySQL — gated MYSQL_INTEGRATION=1.
 *
 * Roda a contract-suite (CA1-CA5 + A6a/CA5-7 findRevocableByUserId) contra o adapter Drizzle.
 * seedUser insere o auth_user pai (FK auth_rt_user_fk) — idempotente. DEVE FALHAR em W0
 * (createDrizzleRefreshTokenStore inexistente). Truncate em ordem FK no beforeEach. ASCII puro.
 */

import { before, after, beforeEach } from 'node:test';

import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleRefreshTokenStore } from '#src/modules/auth/adapters/persistence/repos/refresh-token-repository.drizzle.ts';
import type { UserId } from '#src/modules/auth/domain/identity/user-id.ts';

import { runRefreshTokenRepositoryContract } from './refresh-token-repository.contract.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const SEED_AT = new Date('2026-05-27T10:00:00.000Z');

const truncateAll = async (handle: AuthMysqlHandle): Promise<void> => {
  const { db, schema } = handle;
  await db.delete(schema.authUserRole);
  await db.delete(schema.authRolePermission);
  await db.delete(schema.authRefreshToken);
  await db.delete(schema.authUser);
  await db.delete(schema.authRole);
  await db.delete(schema.authPermission);
};

if (integrationEnabled()) {
  let handle: AuthMysqlHandle | null = null;

  before(async () => {
    const r = await openAuthMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openAuthMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) await handle.close();
  });

  beforeEach(async () => {
    if (handle !== null) await truncateAll(handle);
  });

  // seedUser insere um auth_user minimo (idempotente via INSERT IGNORE-equivalente:
  // checa existencia antes). email unico por userId.
  const seedUser = async (userId: UserId): Promise<void> => {
    if (handle === null) throw new Error('handle');
    const { db, schema } = handle;
    const id = userId as unknown as string;
    const existing = await db.select({ id: schema.authUser.id }).from(schema.authUser);
    if (existing.some((u) => u.id === id)) return;
    await db.insert(schema.authUser).values({
      id,
      email: `${id}@seed.local`,
      passwordHash: null,
      status: 'active',
      disabledAt: null,
      createdAt: SEED_AT,
      updatedAt: SEED_AT,
    });
  };

  runRefreshTokenRepositoryContract('Drizzle/MySQL', {
    make: () => {
      if (handle === null) throw new Error('handle nao inicializado');
      const store = createDrizzleRefreshTokenStore(handle);
      return { repository: store.repository, seedUser };
    },
  });
}
