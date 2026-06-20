# FIN-CATEGORIZATION-REF — Dados de referência de categorização (US1 Categoria · MVP)

> Spec/Plano: `specs/020-fin-categorization-ref/` (spec.md · plan.md · tasks.md · data-model.md · contracts/). Issue #142. Branch `020-fin-categorization-ref`. Size **M**.

## Escopo desta fatia (MVP)

**Setup + Foundational + US1 (Categoria agrupada)** — desbloqueia o select central de classificação (#124 lançamento manual / #5 tratamento da diferença / #147 categorização do documento). US2 (Centro de custo) e US3 (Programa) são fatias seguintes do mesmo ticket.

**Decisão A (research D1, 2026-06-20):** Categoria e Centro de custo são **dados de referência locais do financeiro** (`fin_categories`/`fin_cost_centers`, povoados por seed idempotente). Programa = **leitura cross-módulo** via `programs/public-api` (`buildProgramsReadPort` — JÁ EXISTE). Sem 5º módulo, sem bloquear em #113 (Orçamento). Constitution PASS (plan.md:32-43).

**Decisão RBAC (T005, 2026-06-20):** slug novo **`reference:read`** (transversal). `financial:read` não existe no catálogo; `reconciliation:read`/`fiscal-document:read` acoplariam a referência a um único fluxo — mas as listas servem 3 fluxos (payable/reconciliation/fiscal-document). Adiciona `referenceRead: 'reference:read'` ao `FINANCIAL_PERMISSION` + seed RBAC.

## Critérios de aceite (US1)

- **CA1** (spec.md:25): listar categorias → cada item `{ id, name, group ∈ {despesa,receita,ajuste} }`.
- **CA2** (spec.md:26 / SC-002): `id` estável entre sessões (seed com UUID fixo).
- **FR-005 / SC-003**: vêm agrupadas por natureza (`group` por item); nenhum item sem grupo.
- **FR-006/007**: inativos omitidos da listagem; lista vazia → `[]` sem erro.
- **Borda**: `GET /api/v2/financial/categories` → 200 atrás de `reference:read`; sem permissão → 403.

## Entregáveis

- Domínio `domain/category/{category-id,category-group,category,types}.ts` — branded id + union `group` + smart constructor (`Result`).
- Port `application/ports/category-read.ts` (`CategoryReadPort.list()`) + adapters `repos/category-read.{in-memory,drizzle}.ts`.
- Schema `fin_categories` (varchar(12) + CHECK `group`) + migration `0012` (ALTER ADD, não-quebrante) + seed idempotente (UUIDs fixos — SC-002).
- HTTP: `categoryListResponseSchema` + `categoriesToDto` + rota GET + `referenceRead` no catálogo + wiring no `composition.ts`.

## Fora de escopo

- US2 (Centro de custo) e US3 (`GET /financial/programs` passthrough — opcional; o front já lista via `programs` direto) — fatias seguintes do ticket.
- CRUD/admin de referência (FR-008 — só leitura nesta feature).

## Gate

W0 RED → W1 GREEN → W2 APPROVED → W3 (`typecheck` + `format:check` + `lint` + `test` verdes; `test:integration:financial` para o read store Drizzle real).
