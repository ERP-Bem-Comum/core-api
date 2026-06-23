# W1 — Implementação · FIN-201-2-PAYABLE-READ-PATH (#221)

**Outcome:** GREEN · **Data:** 2026-06-22

Read path payable-centric (decisão #220 = opção A). Sem HTTP, sem migration.

**Novos arquivos:**
1. `domain/payable/query.ts`: `PayableListItem`, `PayableListFilter` (status/documentType/supplierRef/
   dueFrom/dueTo), reuso de `Page<T>`.
2. `application/ports/payable-list-view.ts`: port `PayableListView.findPaged`.
3. `adapters/persistence/mappers/payable-list.mapper.ts`: `PayableListRow` + `rowToPayableListItem`
   (valida `kind`/`status`; `retentionType`/`documentType` lenientes → null). **Unidade testada.**
4. `adapters/persistence/repos/payable-list-view.drizzle.ts`: `SELECT … FROM fin_payables INNER JOIN
   fin_documents` (dueDate ASC, id ASC), filtros + paginação + count; mapeia via o mapper.
5. `adapters/persistence/repos/payable-list-view.in-memory.ts`: deriva itens (pai + filhos) dos
   `StoredDocument` da fonte injetada (thunk), mesma semântica de filtro/ordenação.

**Testes:**
- Mapper (4): pai/filho/kind-inválido/status-inválido.
- In-memory (2): CA2 (pai + filhos distintos, status próprio, retentionType nos filhos) + CA3 (filtro por
  status + paginação).
- Integração Drizzle (1, no runner): JOIN real — semeia NFS-e com retenção ISS via saveDocument → pai +
  filho com campos do documento; filtro por fornecedor.

**Verificação:** typecheck/format/lint ✅; `pnpm test` fail 0; `test:integration:financial` **52/52**.
