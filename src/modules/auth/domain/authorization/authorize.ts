/**
 * authorize - servico de autorizacao do modulo auth (RBAC).
 *
 * DD-USER-02: funcao pura, fora do agregado. Fail-closed (default deny). Aceita apenas
 * `ActiveUser` (usuario desabilitado nem chega aqui - barrado por `parseActive` na borda).
 * Reusa `Role.hasPermission` varrendo `user.roles`. ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Role from './role.ts';
import type { Permission } from './permission.ts';
import type { ActiveUser } from '../identity/user/types.ts';

export type AuthorizeError = 'forbidden';

export const authorize = (user: ActiveUser, required: Permission): Result<void, AuthorizeError> =>
  user.roles.some((role) => Role.hasPermission(role, required)) ? ok(undefined) : err('forbidden');
