# FIN-201-2-PAYABLE-READ-PATH — Request (#221)

**Size:** S (2 pts) · **Card:** FIN-201-2 (parent #201) · **Sprint:** 1 · **Módulo:** financial

## Escopo

Read path da listagem de Contas a Pagar **orientada a título** (decisão #220 = opção A:
`GET /financial/payables`, filhos em linhas separadas). **Sem HTTP, sem migration** — a borda é o #222.

Expor a query de payables (pai + filhos) com os campos do grid, por linha de título:
`payableId`, `documentId` (+ `documentNumber`/`series`/`documentType`), `kind` (Parent|Child),
`retentionType` (Child), `valueCents`, `dueDate`, `status` (própria do título), `supplierRef`, `contractRef`.

## Entregáveis

1. **Domínio** `domain/payable/query.ts`: `PayableListItem`, `PayableListFilter` (status/dueFrom/dueTo/
   documentType/supplierRef), reuso de `Page<T>`.
2. **Port** `application/ports/payable-list-view.ts`: `PayableListView = { findPaged(filter, page, pageSize) }`.
3. **Mapper** `adapters/persistence/mappers/payable-list.mapper.ts`: `rowToPayableListItem(row)` →
   `Result<PayableListItem, …>` validando `kind`/`status` (enums do banco). **Unidade testada (W0→W1).**
4. **Adapter Drizzle** `payable-list-view.drizzle.ts`: `SELECT … FROM fin_payables INNER JOIN fin_documents`
   (dueDate ASC), filtros + paginação; mapeia via o mapper.
5. **Adapter in-memory** `payable-list-view.in-memory.ts`: deriva itens dos `StoredDocument` (pai + filhos).

## Critérios de aceite

- **CA1**: `rowToPayableListItem` mapeia linha do PAI (kind Parent, retentionType null) e do FILHO
  (kind Child + retentionType) corretamente; `kind`/`status` inválidos do banco → `Result` de erro.
- **CA2**: o read path retorna pai E filhos como itens distintos, com `status` próprio por título.
- **CA3**: filtros (status, vencimento, documentType, fornecedor) + paginação funcionam.
- **CA4**: gate W3 verde + integração Drizzle (JOIN) no Docker.

## Não-objetivos

Borda HTTP `GET /financial/payables` + wiring na composição (= #222). Resolução de nome do fornecedor
(read-model `fin_supplier_view`) — segue como no grid de documento (#47/US2), fora desta task.
