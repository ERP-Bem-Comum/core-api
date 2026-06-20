# FIN-COST-CENTER-REF — Centro de custo (US2 da feature 020)

> Fatia **US2** de `specs/020-fin-categorization-ref/` (issue #142, branch `020-fin-categorization-ref`). Continuação de `FIN-CATEGORIZATION-REF` (US1 Categoria, closed-green). Size **S** — espelha o US1 já entregue, sem decisão nova.

## Escopo

**US2 — Selecionar Centro de custo (P1).** O operador abre o select de Centro de custo (ex.: CC-001 Administrativo, CC-002 Programa Saúde) e escolhe um, com código + nome estáveis. Independente do US1 (Categoria).

Reaproveita o padrão já estabelecido no US1: dado de referência **local do financeiro** (`fin_cost_centers`, Decisão A), slug RBAC **`reference:read`** (já existe no catálogo), borda `GET /api/v2/financial/cost-centers`.

## Critérios de aceite (US2)

- **CA1** (spec.md:40): listar centros de custo → cada item `{ id, code, name }`, `id` estável (seed UUID fixo — SC-002).
- **FR-004**: ordenação determinística por `code`.
- **FR-006/007**: inativos omitidos; lista vazia → `[]` sem erro.
- **Borda**: `GET /api/v2/financial/cost-centers` → 200 atrás de `reference:read`; sem permissão → 403.

## Entregáveis (T015-T017)

- Domínio `domain/cost-center/{cost-center-id,types,cost-center}.ts` — branded id + smart constructor (`code`/`name` não-vazios) → `Result<CostCenter, 'cost-center-code-empty' | 'cost-center-name-empty'>`. **Sem** `group` (diferença vs Category).
- Port `application/ports/cost-center-read.ts` (`CostCenterReadPort.list()`) + adapters `repos/cost-center-read.{in-memory,drizzle}.ts` (só `active`, ordenado por `code`).
- Schema `fin_cost_centers` (`id` PK, `code` varchar(20), `name` varchar(120), `active` boolean default true; índices `code`, `active`) + migration `0013` + seed idempotente (UUIDs fixos — CC-001 Administrativo, CC-002 Programa Saúde, …).
- HTTP: `costCenterListResponseSchema` + `costCentersToDto` + rota GET + wiring no `composition.ts`.

## Fora de escopo

- US3 (Programa — `GET /financial/programs` passthrough opcional) — fatia seguinte.
- CRUD/admin de referência (FR-008 — só leitura).

## Gate

W0 RED → W1 GREEN → W2 APPROVED → W3 (`typecheck`+`format:check`+`lint`+`test` verdes; `test:integration:financial` para a 0013 aplicada no MySQL real).
