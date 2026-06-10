/**
 * dev-seed — preset canônico de permissões do admin de DEV + helper de seed RBAC.
 *
 * Fonte ÚNICA do conjunto de permissões do admin de desenvolvimento: derivada do catálogo
 * (`permission-catalog.ts`), então qualquer permissão nova entra no admin automaticamente
 * (zero drift entre os AUTH_SEED_JSON espalhados — scripts E2E, quickstart).
 *
 * Consumido para montar o `AUTH_SEED_JSON` sob a guarda dupla `CORE_API_E2E` (ver e2e-seed.ts);
 * em produção é inerte (o seed por env jamais é lido sem `CORE_API_E2E=1`).
 */

import * as PermissionCatalog from '../../domain/authorization/permission-catalog.ts';

import type { AuthSeedUser } from './composition.ts';

/** Conjunto canônico de permissões do admin de dev: todo o catálogo, como strings. */
export const adminDevPermissions: readonly string[] = PermissionCatalog.all.map((p) => String(p));

/** Monta o AuthSeedUser do admin de dev com o preset completo (parseável por `parseE2eAuthSeed`). */
export const buildAdminDevSeedUser = (
  credentials: Readonly<{ email: string; password: string }>,
): AuthSeedUser => ({
  email: credentials.email,
  password: credentials.password,
  permissions: adminDevPermissions,
});
