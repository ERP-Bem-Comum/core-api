# Request — USR-SEED-PERMISSIONS

> Origem: handbook/tickets `USR-SEED-PERMISSIONS` (handoff front). Decisão de escopo tomada em sessão
> 2026-06-10: **preset canônico no módulo auth** (opção A), em vez de só editar JSONs de seed soltos.

## Título

Preset canônico de permissões de admin de dev no módulo `auth` + helper de seed (elimina drift)

## Size

S

## Problema

O seed de RBAC é 100% por env (`CORE_API_E2E=1` + `AUTH_SEED_JSON`) — não há seed hardcoded no core-api.
Os JSONs que montam o `admin` de dev estão **espalhados e divergentes**, e nenhum concede `program:*`:

- `specs/005-gestao-usuarios/quickstart.md` → `admin@bemcomum.dev` com `user:*` parcial, sem `program:*`.
- `scripts/e2e-bruno-all.sh` → `admin.e2e@bemcomum.dev` com `user:*`+`role:*`, sem `program:*`.

Resultado no front: admin leva **403** em `GET /api/v1/users` e `GET /api/v1/programs` (ticket original).
Causa-raiz: ausência de **fonte única de verdade** para o conjunto de permissões do admin de dev.

## Escopo (o que fazer)

1. Criar no `auth` uma fonte única do conjunto de permissões do admin de dev, **derivada do catálogo**
   (`permission-catalog.ts` → `all`), de modo que novas permissões entrem no admin automaticamente
   (zero drift). Novo arquivo: `src/modules/auth/adapters/http/dev-seed.ts`.
2. Expor um helper `buildAdminDevSeedUser({ email, password }): AuthSeedUser` que produz o usuário de seed
   com `permissions = preset` (parseável por `parseE2eAuthSeed`).
3. Referenciar o preset nos pontos de seed versionados (config/docs):
   - `specs/005-gestao-usuarios/quickstart.md` — exemplo do admin passa a incluir `program:*`.

## Critérios de Aceitação

- **CA1:** existe `adminDevPermissions` (readonly string[]) no `auth` cobrindo **todo o catálogo** —
  em particular as âncoras `program:read`/`program:write`/`program:deactivate` e o conjunto `user:*`.
- **CA2:** `adminDevPermissions` não tem drift: seu conjunto é **igual** a `PermissionCatalog.all`
  (como strings) — um teste reprova se o catálogo crescer e o preset não acompanhar.
- **CA3:** `buildAdminDevSeedUser({ email, password })` retorna `AuthSeedUser` cujo objeto, embrulhado em
  `{ users: [it] }`, é aceito por `parseE2eAuthSeed` sob `CORE_API_E2E=1`.
- **CA4:** quickstart 005 atualizado: admin de dev concede `program:*` (sem 403 em `/programs`).

## Fora de Escopo

- Provisionar o ambiente `core-api@dev` real (vive fora deste repo — handoff de infra).
- Mudar o mecanismo de seed (segue env-driven com guarda dupla `CORE_API_E2E`).
- Mexer no catálogo de permissões (`permission-catalog.ts` é a fonte; o preset apenas o consome).

## Notas

- `Permission` é `Brand<string, 'Permission'>` → conversível para `string` direto.
- `AuthSeedUser` (`{ email, password, permissions: readonly string[] }`) vem de
  `src/modules/auth/adapters/http/composition.ts`.
