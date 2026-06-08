/**
 * listPermissionCatalog - use case do modulo auth (spec 006, US2): expoe o catalogo fixo de
 * permissoes do sistema (resource:action), read-only, para a gestao administrativa de acessos.
 *
 * Sem deps externas: o catalogo e do codigo (PermissionCatalog.all, FR-011 - imutavel em runtime),
 * nao de infra. Sempre ok(...) - nao ha caminho de erro. Cada permission (string) e decomposta em
 * { id, resource, action }; o split e seguro por desestruturacao com default (o catalogo ja garante
 * o formato resource:action via Permission.parse). ASCII puro.
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';

export type PermissionCatalogItem = Readonly<{ id: string; resource: string; action: string }>;

export const listPermissionCatalog =
  () => async (): Promise<Result<readonly PermissionCatalogItem[], never>> => {
    // Catalogo e do codigo (sincrono); o await mantem a assinatura Promise do port sem I/O real.
    await Promise.resolve();
    const items = PermissionCatalog.all.map((permission) => {
      const [resource = '', action = ''] = String(permission).split(':');
      return { id: String(permission), resource, action };
    });
    return ok(items);
  };
