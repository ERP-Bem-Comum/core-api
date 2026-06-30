# ADR-0003 (feature 009): Trilha por-campo (Time Travel) estendendo o read-model de timeline (ADR-0022)

**Status**: Proposed

**Data**: 2026-06-15

**Feature**: `specs/009-fin-documentos-titulos/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro

## Contexto

O `/speckit-clarify` (Q3) decidiu **timeline por-campo completa** (Time Travel: autor, instante, valor anterior → novo)
já na Fatia 1 — auditoria é transversal e obrigatória (`02-context-map.md:79`, `01-introducao.md:16`). O projeto já tem
o padrão de timeline em `contracts/domain/timeline/` como **read-model derivado do stream de eventos** (ADR-0022), porém
de **marcos** (eventos), não diff por-campo.

## Decisão

A trilha do Financeiro é um **read-model derivado do stream de eventos** (alinhado ao ADR-0022), **estendido** para que
os eventos de edição/transição carreguem `changes: FieldChange[]` (`{ field, before, after }`). A projeção
`FinancialTimelineEntry` expõe `target` (Document|Payable), `kind`, `occurredAt`, `actor` (best-effort) e `changes`.
O rótulo PT-BR é responsabilidade do formatter (não do domínio).

## Citação canônica _(obrigatória — princípio IX)_

> "To update synchronously, the query model and command model would normally share the same database (or schema), and we
> would update the two models in the same transaction. That keeps both models completely consistent. Yet, this will
> require more processing time for the multiple table updates... If the system is normally under heavy load and the query
> model update process is lengthy, use asynchronous updates instead. This may lead to challenges of eventual consistency..."
> — _(ddd--vernon-livro-vermelho.md:3257 — CQRS / query model; Vaughn Vernon, *Implementing Domain-Driven Design*)_

## Alternativas consideradas

- **Tabela de auditoria append-only dedicada** (não derivada de eventos) — **em aberto para o data-model**: pode ser a
  materialização física da projeção. Esta ADR fixa a _semântica_ (derivada de eventos); a _persistência_ (projeção on-the-fly
  vs tabela materializada) é decisão do `plan.md`/`data-model.md`.
- **Só marcos (sem diff por-campo)** — rejeitada: contraria a decisão Q3.

## Consequências

- **Positivas**: Time Travel completo reusando o padrão de `contracts`; ownership de evento no BC (ADR-0006).
- **Negativas / trade-offs**: eventos de edição ficam maiores (carregam `changes`); amplia o escopo da Fatia 1 em relação
  à proposta inicial ("só eventos").
- **Impacto em BCs / outbox / migrations**: o outbox transporta `changes`; o `data-model` decide projeção derivada vs
  tabela materializada de auditoria.
