# Phase 0 — Research: Financial List DTO

## Verificação decisiva — US2 está bloqueada (eventos de fornecedor no `partners`)

**Decision**: US2 (fornecedor nome+CNPJ via read-model) **não é implementável agora**. A feature entrega **apenas US1** (campos locais).

**Rationale (evidências, read-only)**:

- `src/modules/partners/domain/supplier/repository.ts:8`: _"Sem outbox nesta fase — Supplier não publica eventos cross-módulo ainda (YAGNI)."_
- `src/modules/partners/domain/supplier/events.ts:7`: existe apenas `SupplierRegistered` (emitido, **não publicado** via outbox); **não existe `SupplierUpdated`** (sem evento para mudança de nome/CNPJ).
- `src/modules/partners/domain/supplier/supplier.ts:101`: emite `SupplierRegistered` como evento de domínio, sem publicação cross-módulo.
- O `partners` **não tem infraestrutura de outbox** (`partners_outbox` ausente) — diferente do `contracts` (`ctr_outbox` + worker).

A decisão do clarify (read-model via outbox — `data-model.md` da spec) pressupõe que o `financial` consome eventos de fornecedor. Como esses eventos **não são publicados**, o read-model não tem fonte. Implementá-lo exigiria, primeiro, no módulo `partners`:

1. Infra de outbox (`partners_outbox` + worker de publicação).
2. Publicar `SupplierRegistered` **e** criar/publicar `SupplierUpdated`.
3. Contrato de evento `partners → financial` (ADR — comunicação cross-BC, ADR-0015).

Isso é trabalho substancial **no módulo `partners`**, fora do escopo do `financial` (e ofende "não misturar módulos numa sessão" se feito junto). Logo, **pré-requisito** de US2.

**Alternatives considered**:

- Port síncrono via `PartnersReadPort` (resolveria US2 agora, reusando o existente) — **rejeitado no clarify** em favor do read-model.
- Implementar o outbox do `partners` nesta feature — rejeitado: cross-módulo grande, fora do BC `financial`.

**Recomendação**: abrir issue para o pré-requisito (`partners`: outbox + eventos de fornecedor publicados) + issue de US2 (read-model + consumer no `financial`), referenciando #47. Atacar quando o `partners` expuser os eventos.

---

## US1 — decisões (executável agora)

**Estado atual**: a listagem real já existe (`findPaged` em `document-repository.drizzle.ts:344+` faz SELECT de `fin_documents` com mapper inline; filtros `status`/`supplierRef`/`type`/`dueFrom`/`dueTo` já aplicados). O `DocumentListItem` (`query.ts:21-30`) e o `documentSummarySchema` (`schemas.ts`) hoje expõem: id, status, documentNumber, type, supplierRef, netValueCents, dueDate, version.

**Decision**: adicionar `series`, `grossValueCents`, `paymentMethod`, `contractRef` ao read-model e ao DTO.

- `DocumentListItem` (`query.ts`): + `series: string | null`, `grossValue: Money`, `paymentMethod: PaymentMethod`, `contractRef: string | null`.
- `findPaged` (`document-repository.drizzle.ts`): incluir `finDocuments.series`, `gross_value`, `payment_method`, `contract_ref` no SELECT e no mapper inline.
- `document-repository.in-memory.ts`: espelhar no fake.
- `dto.ts` `listItemToSummaryDto`: mapear os 4 campos (Money → string de centavos via `moneyToCentsString`).
- `schemas.ts` `documentSummarySchema`: + `series` (nullable), `grossValueCents` (centsString), `paymentMethod` (string), `contractRef` (nullable).

**Rationale**: todos os campos já estão em `fin_documents`/agregado (confirmado pela investigação). Zero migration, zero cross-módulo. Backward-compat: adição apenas.

**Alternatives considered**: nenhuma relevante — é exposição direta de dados já persistidos.

**W0 RED**:

- `fastify.inject` (`list-documents.http.test.ts` ou novo): o item da listagem inclui `series`, `grossValueCents`, `paymentMethod`, `contractRef` com valores coerentes; documento sem série/contrato → campos null.
- Contrato de repo (`document-repository.suite.ts`) + integração MySQL: `findPaged` retorna os 4 campos.

## Princípio IX — citação

US1 é exposição de read-model (baixo risco); citação leve no W2 (clean-code: completude de DTO / contract-first ADR-0027). A decisão arquitetural de fundo (read-model vs síncrono) já foi registrada no clarify; o pré-requisito de US2 exigirá ADR de evento `partners`→`financial` quando atacado.
