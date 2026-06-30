# FIN-LISTAGEM-TIMELINE — Request (escopo + CAs)

**Size**: M · **Feature SDD**: `specs/010-fin-listagem-timeline/` · **Branch**: `feat/fin-listagem-timeline`

> Estende o módulo `financial` (fatia 1, em `dev`). **Não reescreve** — adiciona listagem real, trilha por-campo
> (Time Travel), optimistic lock enforçado e remoção de permissões inertes. Ver `spec.md`/`plan.md`/`tasks.md` (010).

## Escopo

1. **US1 — Listagem real** `GET /api/v2/financial/documents`: filtros (status, supplierRef, type, dueFrom/dueTo) +
   paginação (page/pageSize); `findPaged` no `DocumentRepository` (reusa pool writer — ADR-0003). Substitui o stub.
2. **US2 — Trilha por-campo (Time Travel)**: read-model materializado `fin_document_timeline` + `fin_timeline_field_changes`,
   gravado na mesma transação do agregado; diff por função pura (ADR-0001); `GET /documents/:id/timeline`.
3. **Optimistic lock enforçado** (ADR-0002): `expectedVersion` em ajuste/aprovação/undo → `409 document-version-conflict`.
4. **Remoção das permissões inertes** `payable:read`/`payable:undo-approval` (ADR-0004).

## Critérios de aceite (mapeados aos CT do BDD)

- [ ] CT-001..004 — filtros e paginação retornam o conjunto/total exatos (US1)
- [ ] CT-005..007 — vazio (200), janela invertida (vazio), ref inválida (400) (US1)
- [ ] CT-008 — leitura sem `fiscal-document:read` → 403 (US1)
- [ ] CT-009..012 — trilha registra criação/ajuste/aprovação/undo com `changes` (US2)
- [ ] CT-013 — atomicidade: rollback não deixa trilha órfã (US2/NFR-001)
- [ ] CT-014 — `GET /timeline` cronológico com `changes` (US2)
- [ ] CT-015/016 — timeline de inexistente → 404; sem permissão → 403 (US2)
- [ ] CT-017 — cancelamento (hard delete) remove trilha em cascata (US2/SC-006)
- [ ] CT-018..021 — conflito de versão → 409; aprovação concorrente dupla (optimistic lock)
- [ ] Permissões inertes ausentes do catálogo RBAC (FR-010)

## Gate W3

`pnpm run typecheck` + `format:check` + `lint` + `pnpm test` + `pnpm run test:integration:financial` — todos verdes;
sem regressão na suíte global.
