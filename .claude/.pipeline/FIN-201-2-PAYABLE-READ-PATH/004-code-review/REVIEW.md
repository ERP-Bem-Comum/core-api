# Code Review — FIN-201-2-PAYABLE-READ-PATH (#221) — Round 1

**Veredito:** APPROVED
**Reviewer:** code-reviewer · **Data:** 2026-06-22

**Escopo:** domain `payable/query.ts`, port `payable-list-view.ts`, mapper `payable-list.mapper.ts`,
adapters Drizzle + in-memory, testes (mapper + in-memory + integração Drizzle).

## Análise

Read path payable-centric bem estruturado, espelhando o padrão do grid de documento (`DocumentListItem`):

- **Port + 2 adapters** (Drizzle + in-memory) — adesão a `.claude/rules/adapters.md` (todo port tem InMemory
  + real). Drizzle faz `INNER JOIN` (cada título é linha; filhos viram linhas próprias); in-memory deriva do
  agregado `StoredDocument` (mesma semântica de filtro/ordenação `dueDate ASC, id ASC`).
- **Mapper testável e defensivo**: valida `kind`/`status` (enums do banco) → `Result`; `retentionType`/
  `documentType` lenientes (null fora do enum — display, já com CHECK na coluna). Read-model rejeita estado
  inválido sem vazar `Error`.
- **`status` por título** exposto (CA2) — base da baixa/conciliação individual (#59/#60). Pai (líquido) +
  filhos (retenções) como itens distintos.
- **Boundary correta**: try/catch → slug `payable-list-view-failure`; nenhum `Error` cruza.
- **Sem domínio novo de regra** — só tipos de leitura. `valueCents` (number) coerente com a coluna bigint
  e o DTO futuro.

## Issues

Nenhuma 🔴/🟡. 🔵 Notas:
- Perf: `count(*)` + page em 2 queries (padrão da listagem de documento). Índice de `dueDate`/JOIN por PK —
  sem hot path com evidência. OK.
- O in-memory recebe a fonte como thunk `() => StoredDocument[]` — o wiring na composição (memory driver)
  é do #222 (HTTP). Aqui é exercitado por teste com fonte semeada.

## Próximo passo

APPROVED → W3 (gate já verde). Destrava o #222 (borda HTTP `GET /financial/payables`).
