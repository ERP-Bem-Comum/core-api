# FIN-REFERENCE-READ-CATALOG — Request (#200)

**Size:** S · **Épico:** #64 · **Feature SDD:** `specs/021-reference-read-permission/` · **Prioridade:** P1

## Problema

`GET /api/v2/financial/{categories,cost-centers,programs}` (feature 020) retornam **403 para todos os usuários, inclusive admin**. As rotas exigem `reference:read` (`financial/public-api/permissions.ts#referenceRead`), mas essa permissão **não está no catálogo central** `auth/domain/authorization/permission-catalog.ts#CATALOG_RAW`. Consequências:
- `Role.setPermissions` valida ⊆ catálogo → nenhuma role pode receber `reference:read`;
- o dev-seed do admin recebe `PermissionCatalog.all`, que não a inclui → nem o admin a tem.

Bloqueia o front da categorização editável do documento (#147).

## Escopo (mínimo)

- Adicionar `'reference:read'` ao `CATALOG_RAW` (ordem alfabética por resource: entre `program:*` e `reconciliation:*`).
- Admin recebe via `PermissionCatalog.all` automaticamente (sem código de grant adicional).
- **Fora de escopo** (decisão clarify 2026-06-22, FR-008): pré-criar/pré-conceder a permissão a qualquer role de negócio — menor privilégio + YAGNI; demais roles recebem em runtime.

## Critérios de aceite

- **CA1**: `reference:read ∈ PermissionCatalog.all` (catálogo).
- **CA2**: admin (perfil com `PermissionCatalog.all`) recebe **200** nos 3 endpoints de referência (antes 403).
- **CA3**: usuário sem `reference:read` recebe **403** nos 3; sem token, **401**.
- **CA4**: cobertura exercita o `authorize` **REAL** (ligado ao catálogo), não o fake de header — falha se `reference:read` sair do catálogo (anti-regressão, FR-006/SC-004).
- **CA5**: gate W3 verde (`typecheck` + `format:check` + `lint` + `test`).

## Não-objetivos

Sem migration (catálogo é in-code), sem evento de outbox, sem rota nova. Sem alteração do módulo financial (já declara/exige a permissão).

## Referências

- Issue: #200 · Plano: `specs/021-reference-read-permission/plan.md` · Citações canônicas: `research.md` (Fowler YAGNI + OWASP least-privilege).
