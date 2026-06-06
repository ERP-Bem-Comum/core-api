/**
 * listPermissions - lista as permissões efetivas de um ActiveUser (RBAC).
 *
 * Função pura (DD-USER-02): achata `user.roles` em permissões e deduplica. Espelha a leitura que o
 * `authorize` faz por permissão, mas devolve o conjunto completo (consumido pelo GET /me — o front
 * usa para `can()`). Sem efeito colateral. ASCII puro.
 */

import type { ActiveUser } from '../identity/user/types.ts';
import type { Permission } from './permission.ts';

export const listPermissions = (user: ActiveUser): readonly Permission[] => [
  ...new Set(user.roles.flatMap((role) => role.permissions)),
];
