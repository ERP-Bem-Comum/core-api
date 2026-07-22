import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { authorize } from '../domain/authorization/authorize.ts';
import { parse as parsePermission } from '../domain/authorization/permission.ts';
import type { ActiveUser } from '../domain/identity/user/types.ts';
import type { RbacMode } from '../domain/authorization/rbac-mode.ts';

// ADR-0052 — autorização do ator nos use cases de auto-gestão de RBAC (assign/revoke role, alçada de
// aprovação), que fazem authorize embutido (DD-USER-07) e por isso NÃO passam pelo bypass da borda.
// Em `bypass`, libera (todo autenticado é super-usuário — inclusive para gerir papéis, o que permite
// se auto-recuperar do #462). Em `enforced`, mantém o RBAC fail-closed. Nome de permissão inválido é
// bug de código → `forbidden` (fail-closed), como antes.
export const authorizeActor = (
  rbacMode: RbacMode,
  actor: ActiveUser,
  permissionName: string,
): Result<void, 'forbidden'> => {
  if (rbacMode === 'bypass') return ok(undefined);
  const required = parsePermission(permissionName);
  if (!required.ok) return err('forbidden');
  return authorize(actor, required.value).ok ? ok(undefined) : err('forbidden');
};
