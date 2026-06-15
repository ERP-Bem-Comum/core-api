# ADR-0001 (feature 010): Trilha materializada síncrona + diff por função pura sobre snapshots

**Status**: Proposed

**Data**: 2026-06-15

**Feature**: `specs/010-fin-listagem-timeline/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro

## Contexto

A fatia 1 (009) decidiu Time Travel por-campo (ADR-0003/009) e a `research.md` (009 R2) fixou **tabela materializada
append-only** (`fin_document_timeline` + `fin_timeline_field_changes`). Porém o ADR-0003/009 propôs que **os eventos de
domínio carregassem `changes: FieldChange[]`**. Os eventos da fatia 1 já estão em produção (`dev`) como **marker events**
(sem `changes`) — alterar seu payload seria mudança incompatível no contrato de evento/outbox (`public-api/events.ts`).

## Decisão

A trilha é **read-model materializado**, gravado **na mesma transação** do agregado. O diff por-campo é computado por uma
**função pura de projeção** (`domain/timeline/projection.ts`) que recebe `before`/`after` do agregado e produz
`FieldChange[]` — **os eventos permanecem marker-only** (intactos). Isto **supersedes o mecanismo "eventos carregam o
diff" proposto no ADR-0003/009**, preservando a semântica "trilha derivada de eventos" mas sem acoplar o diff ao payload
do evento.

## Citação canônica _(princípio IX)_

> "To update synchronously, the query model and command model would normally share the same database (or schema), and we
> would update the two models in the same transaction. That keeps both models completely consistent."
> — _(ddd--vernon-livro-vermelho.md:3257 — CQRS / query model síncrono; Vaughn Vernon, _Implementing Domain-Driven Design_)_

## Alternativas consideradas

- **Eventos carregam `changes[]`** (ADR-0003/009 original) — rejeitada: muda payload de evento já publicado; acopla
  read-model ao contrato de evento; sem ganho sobre computar o diff a partir do estado.
- **Projeção on-the-fly via worker do outbox** — rejeitada na 009 R2 (custo de leitura; outbox é fila, não histórico).
- **Event Sourcing pleno** — fora de escopo (MySQL sem event store; ADR-0020).

## Consequências

- **Positivas**: contrato de evento da fatia 1 intacto; trilha 100% consistente com o agregado (mesma tx — SC-004);
  diff testável isoladamente (função pura).
- **Negativas / trade-offs**: a escrita do agregado passa a tocar 2 tabelas a mais por marco (entry + changes) na mesma
  transação — mais processing por mutação (aceitável; ver `metrics.md`).
- **Impacto**: `DocumentRepository.save` e o adapter Drizzle expõem caminho que compartilha a `tx` com o
  `FinancialTimelineRepository.append`. Migration `fin_*` materializa as 2 tabelas (já desenhadas em data-model 009).
