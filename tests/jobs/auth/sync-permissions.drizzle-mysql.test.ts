/**
 * AUTH-SYNC-PERMISSIONS-JOB (#462) — CA1/CA2/CA3/CA7 — `syncPermissionCatalog` contra MySQL real.
 *
 * ⚠️ Exige banco DESCARTÁVEL, via `AUTH_SYNC_TEST_DATABASE_URL` explícita — deliberadamente SEM o
 * default `127.0.0.1:3306/core` que os outros testes de integração usam. Motivo: os fixtures aqui
 * limpam `auth_role`/`auth_permission`/`auth_user_role`/`auth_role_permission` inteiras (CA7 exige
 * ausência da role `admin-sistema`, que a função resolve por nome fixo). Com o default, um
 * `MYSQL_INTEGRATION=1 pnpm test` apagaria o RBAC da infra dev — e o `admin-sistema` recriado com id
 * novo deixaria os `auth_user_role` existentes órfãos, tirando o acesso do admin local.
 * O teste de contract-count-backfill deleta só os próprios refs; este não tem esse luxo, então a
 * proteção é não existir caminho acidental até um banco com dados.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { eq } from 'drizzle-orm';

import { syncPermissionCatalog } from '#src/modules/auth/public-api/sync-permissions.ts';
import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import * as schema from '#src/modules/auth/adapters/persistence/schemas/mysql.ts';
import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';

const ADMIN_ROLE_NAME = 'admin-sistema';

// Sem `?? default`: URL ausente ⇒ os casos de banco não rodam. Ver o aviso no topo.
const VALID_CONN = process.env['AUTH_SYNC_TEST_DATABASE_URL'] ?? '';

const integrationEnabled = (): boolean =>
  process.env['MYSQL_INTEGRATION'] === '1' && VALID_CONN.length > 0;

// Estrutural — sempre roda (mesmo sem DB).
describe('syncPermissionCatalog — shape', () => {
  it('é uma função', () => {
    assert.equal(typeof syncPermissionCatalog, 'function');
  });
});

if (integrationEnabled()) {
  let handle: AuthMysqlHandle | null = null;

  const countPermissions = async (): Promise<number> => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    const rows = await handle.db
      .select({ id: schema.authPermission.id })
      .from(schema.authPermission);
    return rows.length;
  };

  const adminRoleId = async (): Promise<string | null> => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    const roles = await handle.db
      .select({ id: schema.authRole.id })
      .from(schema.authRole)
      .where(eq(schema.authRole.name, ADMIN_ROLE_NAME))
      .limit(1);
    return roles[0]?.id ?? null;
  };

  const rolePermissionCount = async (): Promise<number> => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    const roleId = await adminRoleId();
    if (roleId === null) return 0;
    const rows = await handle.db
      .select({ permissionId: schema.authRolePermission.permissionId })
      .from(schema.authRolePermission)
      .where(eq(schema.authRolePermission.roleId, roleId));
    return rows.length;
  };

  before(async () => {
    const r = await openAuthMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openAuthMysql falhou — ${r.error}`);
    handle = r.value;
    // Estado inicial: banco limpo de RBAC (o job precisa funcionar do zero — CA7).
    await handle.db.delete(schema.authRolePermission);
    await handle.db.delete(schema.authUserRole);
    await handle.db.delete(schema.authPermission);
    await handle.db.delete(schema.authRole);
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  describe('syncPermissionCatalog — Drizzle/MySQL real (#462)', () => {
    // CA7 + CA1: do zero, cria a role e TODAS as permissões do catálogo.
    it('CA7/CA1: banco sem role → cria admin-sistema com o catálogo inteiro', async () => {
      const r = await syncPermissionCatalog(VALID_CONN);
      assert.ok(r.ok, `esperado ok — ${JSON.stringify(r)}`);

      const total = await countPermissions();
      assert.equal(
        total,
        PermissionCatalog.all.length,
        'auth_permission deve espelhar o catálogo em código',
      );
      assert.equal(
        await rolePermissionCount(),
        PermissionCatalog.all.length,
        'a role admin-sistema recebe todas',
      );
    });

    // CA2: o coração do job — roda no deploy, então precisa ser seguro repetir.
    it('CA2: rodar de novo é idempotente — nada muda', async () => {
      const antes = await countPermissions();
      const antesRole = await rolePermissionCount();

      const r = await syncPermissionCatalog(VALID_CONN);
      assert.ok(r.ok);

      assert.equal(await countPermissions(), antes, 'não duplica permissão');
      assert.equal(await rolePermissionCount(), antesRole, 'não duplica atribuição');
    });

    // CA1 — o caso REAL do #462: o ambiente ficou para trás do catálogo (QA tinha 42 de 44).
    it('CA1: ambiente atrás do catálogo → job traz de volta ao total', async () => {
      if (handle === null) throw new Error('fixture');
      // Simula o drift: remove 2 permissões do ambiente (como se tivessem entrado no código depois).
      const rows = await handle.db
        .select({ id: schema.authPermission.id, name: schema.authPermission.name })
        .from(schema.authPermission)
        .limit(2);
      for (const row of rows) {
        await handle.db
          .delete(schema.authRolePermission)
          .where(eq(schema.authRolePermission.permissionId, row.id));
        await handle.db.delete(schema.authPermission).where(eq(schema.authPermission.id, row.id));
      }
      assert.equal(await countPermissions(), PermissionCatalog.all.length - 2, 'drift simulado');

      const r = await syncPermissionCatalog(VALID_CONN);
      assert.ok(r.ok);

      assert.equal(
        await countPermissions(),
        PermissionCatalog.all.length,
        'as 2 ausentes voltaram — é o conserto do 403 mudo',
      );
      assert.equal(await rolePermissionCount(), PermissionCatalog.all.length);
    });

    // CA3: ≠ do seed:admin — este job NÃO cria nem altera usuário.
    //
    // O que realmente ameaça produção não é perder a linha do usuário: é o job RECRIAR a role com
    // id novo. O `auth_user_role` aponta para o id antigo e o admin perde acesso — trocaríamos um
    // 403 por outro. Por isso aqui não basta contar usuários: o vínculo tem que continuar
    // resolvendo para a MESMA role, com o catálogo inteiro.
    it('CA3: usuário e seu vínculo com a role sobrevivem — a role é reusada, não recriada', async () => {
      if (handle === null) throw new Error('fixture');

      const roleBefore = await adminRoleId();
      assert.ok(roleBefore !== null, 'pré-condição: a role existe (criada nos casos anteriores)');

      const userId = '11111111-1111-4111-8111-111111111111';
      const now = new Date();
      await handle.db.insert(schema.authUser).values({
        id: userId,
        email: 'admin-462@example.com',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      await handle.db
        .insert(schema.authUserRole)
        .values({ userId, roleId: roleBefore, assignedAt: now });

      const r = await syncPermissionCatalog(VALID_CONN);
      assert.ok(r.ok);

      const users = await handle.db
        .select({ id: schema.authUser.id })
        .from(schema.authUser)
        .where(eq(schema.authUser.id, userId));
      assert.equal(users.length, 1, 'o job não toca auth_user');

      assert.equal(await adminRoleId(), roleBefore, 'a role foi reusada — id preservado');

      // O vínculo continua de pé e aponta para a role que existe.
      const links = await handle.db
        .select({ roleId: schema.authUserRole.roleId })
        .from(schema.authUserRole)
        .where(eq(schema.authUserRole.userId, userId));
      assert.equal(links.length, 1, 'auth_user_role intacto');
      assert.equal(links[0]?.roleId, roleBefore, 'o admin continua ligado à mesma role');
    });
  });
}
