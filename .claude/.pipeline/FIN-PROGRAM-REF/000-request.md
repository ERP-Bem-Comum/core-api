# FIN-PROGRAM-REF — Programa (US3 da feature 020, passthrough cross-módulo)

> Fatia **US3** de `specs/020-fin-categorization-ref/` (issue #142). Continuação de `FIN-CATEGORIZATION-REF` (US1) e `FIN-COST-CENTER-REF` (US2), ambos closed-green. Size **S**.

## Escopo

**US3 — Selecionar Programa (P2).** O operador abre o select de Programa e escolhe um. Programa **já tem fonte canônica** (módulo `programs`); esta fatia o disponibiliza ao financeiro pela **mesma natureza de contrato** das outras duas listas, via **leitura cross-módulo** (ADR-0006) — sem duplicar a fonte (FR-003 / SC-004).

## Decisões de design

- **Sem domínio/tabela/migration nova** no financeiro: Programa é referência externa (research.md D2).
- **Consumo via `programs/public-api`** (ADR-0006). O port público atual (`ProgramReadPort.getProgramViews(ids)`) é **batch por ids** — não lista todos. **Task adjacente no `programs`** (prevista em tasks T019): estender a public-api com uma **listagem** (`listAll()` no `ProgramsReadPort` retornado por `buildProgramsReadPort`), **sem** tocar o `ProgramReadPort` interno (mocks do contracts dependem dele).
- O financeiro define **seu próprio** port `ProgramReadPort.list()` com projeção `ProgramView = { id, name }` — adapta a public-api do programs (mapeia `{id,name,sigla,programNumber}` → `{id,name}`).

## Critérios de aceite (US3)

- **CA1** (spec.md:54): listar programas → `{ id, name }` estáveis, consistentes com a fonte canônica, **sem duplicar** (SC-004).
- **Borda**: `GET /api/v2/financial/programs` → 200 `[{id,name}]` atrás de `reference:read`; sem permissão → 403.

## Entregáveis

- **Programs (public-api)**: `ProgramsReadPort.listAll()` + adapter drizzle de listagem + composição em `buildProgramsReadPort`.
- **Financial**: port `application/ports/program-read.ts` (`ProgramReadPort.list()`, `ProgramView = {id,name}`) + adapters `repos/program-read.{in-memory,from-programs}.ts` + HTTP (`programListResponseSchema` + `programsToDto` + rota GET) + wiring no `composition.ts` (memory: stub seedado; mysql: `buildProgramsReadPort` adaptado, espelhando `buildContractsReadPort`).

## Fora de escopo

- Tela de admin de programa (é do módulo `programs`).
- Mudança no `ProgramReadPort` batch existente (preservado para os consumidores atuais).

## Gate

W0 RED → W1 GREEN → W2 APPROVED → W3 (`typecheck`+`format:check`+`lint`+`test` verdes; `test:integration:financial`).
