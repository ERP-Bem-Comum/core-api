# Quickstart: Financeiro — Fatia 2 (Listagem + Trilha por-campo)

**Feature**: `specs/010-fin-listagem-timeline/` · Worktree `.claude/worktrees/fin-module` · Branch `feat/fin-listagem-timeline`.

> Pré-requisito: fatia 1 (009) já em `dev` (agregado `Document`, use cases, schema `fin_*`, borda `/api/v2/financial`).

## Rodar a borda (driver in-memory)

```bash
# da raiz do worktree
node src/server.ts            # sobe Fastify; financial in-memory por default (sem FINANCIAL_DRIVER=mysql)
# Listagem e timeline ficam em /api/v2/financial/documents[?filtros] e /api/v2/financial/documents/:id/timeline
```

## Qualidade (W3)

```bash
pnpm run typecheck
pnpm run format:check
pnpm run lint
pnpm test                              # node:test + --experimental-strip-types
pnpm run test:integration:financial    # Docker MySQL: round-trip + timeline + findPaged + optimistic lock
```

## Smoke manual (fastify.inject ou curl com Bearer)

```bash
# listar Open, página 1
GET /api/v2/financial/documents?status=Open&page=1&pageSize=20   # 200 { items, page, pageSize, total }
# timeline de um documento
GET /api/v2/financial/documents/<id>/timeline                    # 200 { entries: [{ eventType, target, occurredAt, actor, changes }] }
# conflito de versão
PATCH /api/v2/financial/documents/<id>  body { version: 0, grossValueCents: "200000" }  # 409 se version desatualizada
```

## O que validar (mapa para os critérios)

| Verificação                                                     | Critério           |
| --------------------------------------------------------------- | ------------------ |
| Filtros (status/supplier/type/janela) retornam o conjunto exato | MF-001, SC-001     |
| Paginação: recorte + `total` corretos, sem repetição/omissão    | MF-002, SC-002     |
| Cada mutação gera entry+changes na MESMA tx (rollback → nada)   | MF-004/005, SC-004 |
| `GET /timeline` cronológico com `changes` (antes→novo)          | MF-006, SC-003     |
| Versão stale → 409 `document-version-conflict` (sem aplicar)    | MF-007, NFR-004    |
| Lista/timeline sem `fiscal-document:read` → 403                 | MF-008, NFR-005    |
| `payable:read`/`payable:undo-approval` ausentes do catálogo     | MF-009             |

## Migração de schema

```bash
pnpm run db:generate            # gera migration fin_* com as 2 tabelas de timeline (append; sem tocar tabelas da fatia 1)
```
