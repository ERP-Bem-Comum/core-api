# Research (Fase 0): Financeiro — Fatia 2: Listagem + Trilha por-campo

**Feature**: `specs/010-fin-listagem-timeline/`. Decisões já fixadas nos ADRs 0001–0004 (feature) + clarify; aqui
consolidadas no formato Decisão/Razão/Alternativas. Roteamento: `ts-domain-modeler`, `drizzle-orm-expert`,
`mysql-database-expert`, `fastify-server-expert`. Citações via fallback `acdg/skills_base/shared-references/`.

## R1 — Persistência da trilha: materializada síncrona

- **Decisão**: tabelas `fin_document_timeline` + `fin_timeline_field_changes` (já desenhadas em data-model 009),
  gravadas na **mesma transação** do `DocumentRepository.save`. ADR-0001 (feature).
- **Razão**: consistência total read-model↔agregado (Vernon:3257 — query/command model na mesma tx); materializar evita
  recomputar a cada `GET /timeline` (MP-004). Sem JSON (ADR-0020) → diff em tabela filha 1FN.
- **Alternativas**: projeção on-the-fly via worker do outbox (rejeitada — 009 R2: custo de leitura, outbox é fila);
  coluna JSON (proibida — ADR-0020).

## R2 — Origem do diff: função pura sobre snapshots (não eventos)

- **Decisão**: `diffDocument(before, after)` + `projectEntry(...)` puras em `domain/timeline/projection.ts`; os eventos da
  fatia 1 permanecem **marker-only**. ADR-0001 (supersedes mecanismo "eventos carregam changes" de 009 ADR-0003).
- **Razão**: não quebra o contrato de evento já em produção (`public-api/events.ts`); diff testável isoladamente; o
  read-model é derivado do estado do agregado, não do payload do evento.
- **Alternativas**: adicionar `changes[]` aos eventos (rejeitada — mudança incompatível no outbox; acoplamento).

## R3 — Transação compartilhada entre repos (agregado + trilha)

- **Decisão**: o adapter Drizzle expõe um caminho onde `DocumentRepository.save` e `FinancialTimelineRepository.append`
  participam da **mesma `tx`** (`db.transaction`). O use case orquestra: computa diff → save agregado → append trilha →
  publish outbox, tudo no mesmo limite. Em rollback, nada de trilha órfã (MF-005/NFR-001).
- **Razão**: ADR-0001; atomicidade (SC-004). Padrão de transação multi-tabela já usado no repo da fatia 1.
- **Alternativas**: dois saves independentes (rejeitada — janela de inconsistência).

## R4 — Listagem paginada: `findPaged` reusando o writer pool

- **Decisão**: `DocumentRepository.findPaged(filter, page, pageSize) → Page<Document>` lendo do **pool writer**
  (single-node). Filtros via `WHERE` composto + `LIMIT/OFFSET`; `total` via `COUNT(*)` com o mesmo `WHERE`. ADR-0003.
- **Razão**: estado atual do driver financial (só writer); YAGNI; Vernon:3255 — separar leitura é guiado por carga/SLA
  medidos. Split reader/writer (ADR-0026) **diferido** → dívida com gatilho MP-003/MP-005.
- **Alternativas**: reader/writer split já agora (rejeitada — otimização prematura sem réplica nem métricas).
- **Índice**: a fatia 1 já criou `idx_fin_doc_status`, `idx_fin_doc_supplier`, `idx_fin_doc_due`. Para o filtro composto
  mais comum (status + due), avaliar índice composto em data-model (EXPLAIN). `COUNT(*)` + `LIMIT/OFFSET` aceitável na
  escala da carteira (~10³); keyset pagination é evolução futura se OFFSET doer.

## R5 — Optimistic lock enforçado

- **Decisão**: `expectedVersion` nos commands de ajuste/aprovação/undo; `UPDATE ... WHERE id=? AND version=?`;
  `affectedRows=0` → `document-version-conflict` → 409. ADR-0002.
- **Razão**: cumpre o contrato da fatia 1; Evans:1435 — agregado é o escopo de consistência sob concorrência.
- **Alternativas**: remover `version` do contrato (rejeitada no clarify).

## R6 — Remoção de permissões inertes

- **Decisão**: remover `payable:read` e `payable:undo-approval` do catálogo do auth + `FINANCIAL_PERMISSION`. ADR-0004.
- **Razão**: menor privilégio; W2 da fatia 1 marcou inertes; undo permanece sob `payable:approve`.
- **Alternativas**: wire granular do undo (rejeitada no clarify — sem demanda).

## R7 — Reúso máximo da fatia 1

- **Decisão**: não reescrever `Document`, use cases, schema base nem borda; **estender**. `documentToSummaryDto` (já existe
  na borda da fatia 1) passa a ser usado pela listagem real; o handler stub de `GET /documents` é substituído.
- **Razão**: menor superfície, menor risco de regressão (a fatia 1 está em produção na `dev`).
