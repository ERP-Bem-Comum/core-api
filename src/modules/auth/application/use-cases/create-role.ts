/**
 * createRole - use case do modulo auth (spec 006, US5): cria um papel novo (Role) com nome unico
 * e um conjunto de permissions validas, para a gestao administrativa de acessos (permission
 * role:create na borda).
 *
 * Sequencia canonica (rule application.md): validar -> fetch -> domain -> persist. Sem EventBus
 * (eventos de dominio diferidos, T009 YAGNI). Unicidade de nome via repo.list() + filtro
 * (NAO estende o port - YAGNI, ADR-0020 sem UNIQUE). A comparacao usa o RoleName ja normalizado
 * (trim + colapso de espacos; case-sensitive - ver role-name.ts) de ambos os lados.
 *
 * Fluxo: (a) parse cada permission string (Permission.parse) - qualquer invalida -> 422
 * (role-permission-not-in-catalog); (b) gera RoleId; (c) Role.create valida nome + dedupe
 * (propaga name-invalid; o catalogo e validado abaixo); (d) valida cada permission ⊆ catalogo
 * (Role.setPermissions); (e) list() existentes -> propaga erro do repo; (f) nome ja existe
 * normalizado -> role-name-duplicate; (g) save -> propaga; (h) ok({ id }). ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Permission from '../../domain/authorization/permission.ts';
import * as RoleId from '../../domain/authorization/role-id.ts';
import * as Role from '../../domain/authorization/role.ts';
import type { RoleRepository } from '../../domain/authorization/role-repository.ts';

export type CreateRoleCommand = Readonly<{
  name: string;
  permissions: readonly string[];
  approvalLimitCents?: number | null;
}>;

export type CreateRoleError =
  | 'role-name-invalid'
  | 'role-permission-not-in-catalog'
  | 'role-name-duplicate'
  | 'role-approval-limit-invalid'
  | 'role-repo-unavailable';

export type CreateRoleOutput = Readonly<{ id: string }>;

type Deps = Readonly<{ roleRepository: RoleRepository }>;

export const createRole =
  (deps: Deps) =>
  async (cmd: CreateRoleCommand): Promise<Result<CreateRoleOutput, CreateRoleError>> => {
    // (a) Parse das strings de permission. Formato invalido tambem cai aqui: o cliente pediu uma
    // permission que nao existe no catalogo (kebab resource:action) -> 422.
    const permissions: Permission.Permission[] = [];
    for (const raw of cmd.permissions) {
      const parsed = Permission.parse(raw);
      if (!parsed.ok) return err('role-permission-not-in-catalog');
      permissions.push(parsed.value);
    }

    // (b)(c) Cria o agregado: valida o nome (RoleName), a alcada (Money >= 0) e deduplica. NAO
    // valida o catalogo aqui. Propaga role-name-invalid OU role-approval-limit-invalid.
    const created = Role.create({
      id: RoleId.generate(),
      name: cmd.name,
      permissions,
      ...(cmd.approvalLimitCents !== undefined
        ? { approvalLimitCents: cmd.approvalLimitCents }
        : {}),
    });
    if (!created.ok) {
      return err(
        created.error === 'role-approval-limit-invalid' ? created.error : 'role-name-invalid',
      );
    }

    // (d) Valida cada permission ⊆ catalogo (Role.setPermissions). Fora do catalogo -> 422.
    const checked = Role.setPermissions(created.value, created.value.permissions);
    if (!checked.ok) return err('role-permission-not-in-catalog');

    // (e) Carrega os papeis existentes para a checagem de unicidade (sem estender o port).
    const existing = await deps.roleRepository.list();
    if (!existing.ok) return existing;

    // (f) Unicidade por nome ja normalizado (RoleName de ambos os lados, comparacao case-sensitive).
    const duplicate = existing.value.some((role) => role.name === checked.value.name);
    if (duplicate) return err('role-name-duplicate');

    // (g) Persiste.
    const saved = await deps.roleRepository.save(checked.value);
    if (!saved.ok) return saved;

    // (h) Sucesso: devolve o id como string (a borda nao conhece o branded RoleId).
    return ok({ id: String(checked.value.id) });
  };
