# ADR-0003 (feature 010): Listagem reusa o writer pool; split reader/writer diferido pós-métricas

**Status**: Proposed

**Data**: 2026-06-15

**Feature**: `specs/010-fin-listagem-timeline/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro

## Contexto

A fatia 1 entregou o driver financial só com **pool writer** (sem reader). A fatia 2 adiciona a listagem paginada
(`GET /documents`, read path). O projeto tem o padrão de RW split (ADR-0026) em `contracts`/`partners` (reads roteiam à
réplica). O `/speckit-clarify` decidiu **reusar o writer** agora e tratar o split como **dívida técnica** a revisitar
**após análise das métricas** com o time de back, quando o backend estiver completo.

## Decisão

A `findPaged` do `DocumentRepository` lê do **mesmo pool writer** (single-node) nesta fatia. O split reader/writer
(ADR-0026 — `FINANCIAL_READER_URL`, reads à réplica) **não** entra agora; fica registrado como dívida técnica, com
**gatilho de revisão = análise de métricas** (latência de listagem sob carga real) pós-conclusão do backend.

## Citação canônica _(princípio IX)_

> "Should the updates be performed synchronously or asynchronously? It depends on the normal load on the system... Data
> consistency constraints and performance requirements will influence the decision."
> — _(ddd--vernon-livro-vermelho.md:3255 — escolha de arquitetura de leitura guiada por carga/SLA; Vaughn Vernon, \_Implementing Domain-Driven Design_)\_

A decisão de separar leitura é guiada por **requisitos de performance medidos** — por isso diferida até haver métricas,
em vez de antecipada (YAGNI).

## Alternativas consideradas

- **Já implementar o split reader/writer (ADR-0026)** — rejeitada para esta fatia: adiciona infra (pool reader, env,
  roteamento) sem réplica de leitura provisionada nem métricas que justifiquem; otimização prematura.

## Consequências

- **Positivas**: menos infra/risco na fatia; alinhado ao estado atual do driver financial; entrega a listagem mais rápido.
- **Negativas / trade-offs**: sob carga alta de leitura, lista e escrita disputam o mesmo pool — aceitável até as métricas.
- **Dívida técnica registrada**: split reader/writer (ADR-0026) — **revisar pós-métricas** (ver `spec.md` §Assumptions e
  `metrics.md`). Não fechar a fatia do Financeiro como "completa" sem reavaliar este ponto.
