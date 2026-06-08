/**
 * listPermissions - lista as permissoes efetivas de um usuario (RBAC).
 *
 * Funcao pura (DD-USER-02): achata `user.roles` em permissoes e deduplica. Espelha a leitura que o
 * `authorize` faz por permissao, mas devolve o conjunto completo (consumido pelo GET /me e pela
 * gestao de acessos da spec 006). Recebe `UserCore` (base de ActiveUser e DisabledUser) para
 * permitir ver as permissoes de usuario active OU disabled. Sem efeito colateral. ASCII puro.
 */

import type { UserCore } from '../identity/user/types.ts';
import type { Permission } from './permission.ts';

export const listPermissions = (user: UserCore): readonly Permission[] => [
  ...new Set(user.roles.flatMap((role) => role.permissions)),
];
