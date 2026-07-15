/**
 * Porta pública de sincronização do catálogo de permissões (#462 / ADR-0006).
 *
 * Reconcilia `PermissionCatalog.all` (fonte da verdade, em código) com o banco e garante que o papel
 * `admin-sistema` carrega o catálogo inteiro. Único ponto público — chamado por DOIS entrypoints:
 * o job `src/jobs/auth/sync-permissions` (deploy) e o `scripts/seed/admin-user.ts` (dev).
 *
 * NÃO cria nem altera usuário (≠ `seed:admin`).
 *
 * Delega ao `RoleRepository` em vez de emitir SQL próprio: o `save` já faz as 3 fases (upsert do
 * papel, upsert serial das permissões com ignore-then-reselect, replace do vínculo) e é testado.
 * O `seed:admin` reimplementava isso à mão, contornando o agregado — era a segunda cópia da mesma
 * regra, e duas cópias divergindo é a mecânica que produziu esta issue.
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { ClockReal } from '../../../shared/adapters/clock-real.ts';
import {
  openAuthMysql,
  type AuthMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleRoleStore } from '../adapters/persistence/repos/role-repository.drizzle.ts';
import * as Role from '../domain/authorization/role.ts';
import * as RoleId from '../domain/authorization/role-id.ts';
import * as PermissionCatalog from '../domain/authorization/permission-catalog.ts';
import type { RoleRepositoryError } from '../domain/authorization/role-repository.ts';

/** Papel que recebe o catálogo completo. Mesmo nome usado pelo `seed:admin` desde o #245. */
export const ADMIN_ROLE_NAME = 'admin-sistema';

export type SyncPermissionCatalogOutcome = Readonly<{
  roleId: string;
  permissionsTotal: number;
  /** Distingue provisionamento inicial de reconciliação — o operador precisa ver isso no log. */
  roleCreated: boolean;
}>;

export type SyncPermissionCatalogError =
  | AuthMysqlDriverError
  | RoleRepositoryError
  | Role.RoleError;

export const syncPermissionCatalog = async (
  connectionString: string,
): Promise<Result<SyncPermissionCatalogOutcome, SyncPermissionCatalogError>> => {
  // applyMigrations: false — o job `migrate` provisiona o schema antes. Sincronizar catálogo não é
  // migrar: se a tabela não existe, o erro deve aparecer, não ser mascarado por uma migration.
  const handleR = await openAuthMysql({ connectionString, applyMigrations: false });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  try {
    const { repository } = createDrizzleRoleStore(handle, ClockReal());

    const rolesR = await repository.list();
    if (!rolesR.ok) return err(rolesR.error);
    const existing = rolesR.value.find((r) => r.name === ADMIN_ROLE_NAME);

    // Papel ausente => provisiona. Presente => substitui o conjunto de permissões, preservando
    // id, status e alçada (o `save` replaceia o vínculo, então permissão removida do catálogo sai).
    //
    // O `list()` roda fora da transação do `save`: dois jobs concorrentes que vejam o papel ausente
    // geram ids diferentes e o segundo colide no `auth_role_name_idx` => 'role-repo-unavailable',
    // exit 1. Não corrompe nada (o vencedor gravou o catálogo íntegro) e re-rodar resolve — este é
    // um job one-shot de deploy, não um caminho concorrente. O ignore-then-reselect do repositório
    // cobre a permissão, não o papel.
    const roleR =
      existing === undefined
        ? Role.create({
            id: RoleId.generate(),
            name: ADMIN_ROLE_NAME,
            permissions: PermissionCatalog.all,
          })
        : Role.setPermissions(existing, PermissionCatalog.all);
    if (!roleR.ok) return err(roleR.error);
    const role = roleR.value;

    const saveR = await repository.save(role);
    if (!saveR.ok) return err(saveR.error);

    return ok({
      roleId: role.id as unknown as string,
      permissionsTotal: role.permissions.length,
      roleCreated: existing === undefined,
    });
  } finally {
    // `.catch` obrigatório: sem ele, uma rejeição do `pool.end()` (conexão morta num failover)
    // SUBSTITUI o return e descarta o Result — o erro nomeado vira stack do mysql2, justamente
    // na falha em que o operador precisa lê-lo. Mesmo tratamento do driver (mysql-driver.ts:137).
    await handle.close().catch(() => undefined);
  }
};
