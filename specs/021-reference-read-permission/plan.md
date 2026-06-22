# Implementation Plan: Permissão `reference:read` no catálogo central de autorização

**Branch**: `021-reference-read-permission` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-reference-read-permission/spec.md`

## Summary

Os endpoints de referência da feature 020 (`GET /api/v2/financial/categories`, `/cost-centers`, `/programs`) exigem a permissão `reference:read`, mas essa string nunca foi registrada no catálogo central de autorização (`CATALOG_RAW` em `auth/domain/authorization/permission-catalog.ts`). Consequência: a permissão não pode ser concedida a nenhuma role (`Role.setPermissions` valida ⊆ catálogo) e o admin de dev (que recebe `PermissionCatalog.all`) também não a tem — os três endpoints retornam **403 para todos** (#200).

**Abordagem técnica (mínima)**: adicionar a string canônica `'reference:read'` ao `CATALOG_RAW`. Como `PermissionCatalog.all` é derivado do `CATALOG_RAW` e `adminDevPermissions = PermissionCatalog.all`, o admin passa a recebê-la automaticamente — nenhum outro código de grant é necessário (FR-002). Demais roles recebem sob demanda em runtime (FR-008; decisão de clarify: menor privilégio + YAGNI). A correção é blindada por duas camadas de teste RED: (a) integridade do catálogo (`permission-catalog.test.ts`) e (b) um teste de integração HTTP que exercita o **`authorize` real** (não o fake de header) ponta-a-ponta — fechando o buraco de processo que mascarou o gap (FR-006/SC-004).

## Technical Context

**Language/Version**: TypeScript 6 (strict completo) · Node.js 24 LTS · ESM `NodeNext`.

**Primary Dependencies**: módulo `auth` (dono do `CATALOG_RAW` e do `authorize` real — `makeRequireAuth`/`makeAuthorize` em `auth/public-api/http.ts`); módulo `financial` (declara `FINANCIAL_PERMISSION.referenceRead` e exige nas 3 rotas); Fastify (borda HTTP, validação); `node:test`.

**Storage**: N/A para o defeito — o catálogo é dado **in-code** (deploy-time, imutável em runtime). Não há alteração de `schema.ts`, logo **nenhuma migration Drizzle**. O seed de `auth_permission` (quando rodado) deriva de `PermissionCatalog.all`, então absorve a nova entrada sem alteração de seed dedicada.

**Testing**: `node:test` via `--experimental-strip-types`. Unidade: `tests/modules/auth/domain/authorization/permission-catalog.test.ts`. Integração HTTP (REAL authorize + `fastify.inject`): novo arquivo em `tests/modules/financial/adapters/http/`.

**Target Platform**: backend modular-monolith (único processo), borda HTTP `/api/v2`.

**Project Type**: modular monolith backend (ADR-0006).

**Performance Goals**: N/A (uma entrada de string no catálogo; sem caminho de dados novo).

**Constraints**: ADR-0006 (cross-módulo só via `public-api`); ADR-0014 (isolamento por BC). A correção toca 2 BCs (auth + financial) **apenas na superfície sancionada**: catálogo central de auth + permissão já declarada na public-api do financial.

**Scale/Scope**: 1 string canônica + 2 suites de teste. Tamanho **S**.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                                            | Status | Nota                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3 fail-first                              | ✅     | W0 RED antes de tocar `src/`: catálogo (unidade) + authorize real (integração HTTP).                                                                                                                                                                                                                                                              |
| II. Regressão zero                                   | ✅     | Gate W3 (`typecheck`+`format:check`+`lint`+`test`) verde para fechar.                                                                                                                                                                                                                                                                             |
| III. pnpm único                                      | ✅     | Sem mudança de deps; comandos `pnpm run *`.                                                                                                                                                                                                                                                                                                       |
| IV. Modular monolith + isolamento                    | ✅     | Toca auth (catálogo) + financial (já declara a perm via public-api). **Nenhum import de `domain/`/`application/` cross-módulo**; financial continua consumindo só sua public-api. O par "perm declarada no financial × registrada no catálogo do auth" é a superfície sancionada (ADR-0006). Dois BCs é **inerente ao defeito**, não scope-creep. |
| V. Domínio puro (sem throw)                          | ✅     | `CATALOG_RAW` é array de strings puro; entradas inválidas são filtradas por `Permission.parse` (sem throw).                                                                                                                                                                                                                                       |
| VI. MySQL/Drizzle migrations geradas                 | ✅ N/A | Sem alteração de schema → sem migration. Catálogo é in-code.                                                                                                                                                                                                                                                                                      |
| VII. HTTP-first; CLI aposentada                      | ✅     | Validação via teste de integração HTTP real (`fastify.inject`) — sem subcomando CLI novo (ADR-0037).                                                                                                                                                                                                                                              |
| VIII. TS strict + ESM + idioma                       | ✅     | Código EN; `import type`; extensões `.ts`.                                                                                                                                                                                                                                                                                                        |
| IX. Decisões ancoradas no cânone (citação ≥4 linhas) | ✅     | Decisão-chave (escopo do grant) ancorada em Fowler (YAGNI) + OWASP (least privilege) — ver [research.md](./research.md).                                                                                                                                                                                                                          |

**Resultado**: PASS, sem violações. `Complexity Tracking` vazio.

## Project Structure

### Documentation (this feature)

```text
specs/021-reference-read-permission/
├── plan.md              # Este arquivo
├── spec.md              # Especificação (+ Clarifications 2026-06-22)
├── research.md          # Fase 0 — decisões + citações canônicas
├── data-model.md        # Fase 1 — entidade Permissão/Catálogo (sem schema novo)
├── contracts/
│   └── reference-read-authorization.md  # Contrato de autorização dos 3 endpoints
├── quickstart.md        # Fase 1 — como validar (200/403)
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/auth/
└── domain/authorization/
    └── permission-catalog.ts        # (W1) + 'reference:read' no CATALOG_RAW (entre program:* e reconciliation:*)

src/modules/financial/
└── public-api/permissions.ts        # (sem mudança) FINANCIAL_PERMISSION.referenceRead já existe
└── adapters/http/plugin.ts          # (sem mudança) 3 rotas já exigem referenceRead

tests/modules/auth/domain/authorization/
└── permission-catalog.test.ts       # (W0) +âncora '#200: contém reference:read' + atualizar teste de "conjunto exato"

tests/modules/financial/adapters/http/
└── reference-read-rbac.real-authorize.http.test.ts  # (W0, NOVO) authorize REAL: 200 com perm / 403 sem
```

**Structure Decision**: Modular monolith existente. A única mudança de produção é uma linha em `permission-catalog.ts` (auth). `financial` permanece intocado (já declara e exige a permissão). Testes em `tests/` (não co-locados, padrão do repo).

## Complexity Tracking

> Sem violações de constituição. Nada a justificar.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] **nenhuma**
- **Prefixo de isolamento correto?**: N/A (sem tabela nova)
- **Outbox**: não (sem evento de domínio novo)
- **Comando**: N/A (sem `db:generate`)
- **Restrições MySQL 8 (ADR-0020)**: N/A
- **Nota**: o catálogo é in-code (deploy-time). O seed `auth_permission` deriva de `PermissionCatalog.all` e absorve a nova entrada automaticamente quando executado.

## Contrato HTTP (Fase 2+)

Endpoints **já existentes** (feature 020) — **nenhuma rota nova, nenhum schema request/response alterado**. Muda apenas o comportamento de autorização (a permissão exigida passa a ser concedível/concedida):

| Método | Rota                             | preHandler                                 | Antes (#200) | Depois                 |
| ------ | -------------------------------- | ------------------------------------------ | ------------ | ---------------------- |
| GET    | `/api/v2/financial/categories`   | `requireAuth, authorize('reference:read')` | 403 p/ todos | 200 com perm · 403 sem |
| GET    | `/api/v2/financial/cost-centers` | idem                                       | 403 p/ todos | 200 com perm · 403 sem |
| GET    | `/api/v2/financial/programs`     | idem                                       | 403 p/ todos | 200 com perm · 403 sem |

Backward-compat: nenhum quebra-contrato — apenas destrava o caminho feliz para quem tem a permissão. Ver [contracts/reference-read-authorization.md](./contracts/reference-read-authorization.md).

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **S** (1 string no catálogo + 2 suites de teste; sem schema, sem migration, sem rota nova)
- **Justificativa**: a mudança de produção é uma única linha em `CATALOG_RAW`. O esforço real está no teste de integração com `authorize` real (cobertura que faltava), não na correção. Cabe num ticket único `FIN-REFERENCE-READ-CATALOG`.
- **Plano de testes W0 (RED)**:
  1. `permission-catalog.test.ts` — (a) nova âncora `#200: contém reference:read` via `PermissionCatalog.all.includes(parseOrThrow('reference:read'))`; (b) incluir `reference:read` no teste de **conjunto exato conhecido** (hoje em ~L112). **RED** antes do fix (string ausente do `CATALOG_RAW`).
  2. `reference-read-rbac.real-authorize.http.test.ts` (NOVO) — monta `requireAuth`/`authorize` **reais** (`makeRequireAuth`/`makeAuthorize` da public-api do auth) sobre um `UserReader` in-memory com dois usuários: (A) role contendo `reference:read` → espera **200** nos 3 GETs; (B) sem a permissão → espera **403**. **RED** antes do fix: conceder `reference:read` à role de (A) é rejeitado por `setPermissions` (fora do catálogo), então (A) nunca obtém 200. Vira **GREEN** após registrar no catálogo.
