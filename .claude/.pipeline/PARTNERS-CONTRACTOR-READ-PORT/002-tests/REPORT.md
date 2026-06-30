# W0 — RED — PARTNERS-CONTRACTOR-READ-PORT

**Skill:** ts-domain-modeler (modo teste) + ports-and-adapters (contrato do port).

## Decisões W0

### D1 — 3 métodos distintos, NÃO um getContractorView discriminado
getSupplierView/getFinancierView/getCollaboratorView, cada um Promise<Result<View|null, E>>.
Por quê: o consumidor (rota gorda ADR-0032) já conhece o TIPO do contratado pelo próprio
contrato; um método único discriminado forçaria switch redundante em runtime e perderia
precisão estática do retorno. As 3 Views ainda formam a união ContractorView (discriminada por type).

### D2 — Campos de cada View (projeção plana, mínimo p/ tela de detalhe — R5)
SupplierView:     type, id, name, email, document(cnpj), serviceCategory, bankAccount|null, pixKey|null, updatedAt
FinancierView:    type, id, name, document(cnpj), corporateName, legalRepresentative, telephone, address, updatedAt
CollaboratorView: type, id, name, email, document(cpf), role, occupationArea, updatedAt
Bancário/PIX read-only existem SÓ no Supplier (payment-target.ts; financier/collaborator não modelam).

### D3 — updatedAt (R5)
O agregado puro NÃO carrega updatedAt; a coluna updated_at existe no row par_*.
Mapper é PURO: supplierToView(aggregate, updatedAt) → View (alvo do unit test).
O read port (adapter) lê o updatedAt da persistência e injeta no mapper.

## Arquivos de teste criados (RED)
- tests/modules/partners/public-api/contractor-view.mapper.test.ts  (unit puro)
- tests/modules/partners/public-api/partners-read-port.integration.test.ts  (gated MYSQL_INTEGRATION=1; id inexistente→ok(null), CA1/CA5)
Integração espelha partners-etl-port.integration.test.ts. ADICIONADA ao script test:integration:partners (não-órfã).

## Saída literal do pnpm test
ℹ tests 1941 / suites 625 / pass 1923 / fail 2 / skipped 16
✖ contractor-view.mapper.test.ts        (ERR_MODULE_NOT_FOUND: contractor-view.mapper.ts)
✖ partners-read-port.integration.test.ts (ERR_MODULE_NOT_FOUND: read.ts)
RED confirmado: 2 falhas novas, ambas por API inexistente. Nenhum teste pré-existente quebrou.

## Próximo passo (W1 GREEN)
1. public-api/contractor-view.mapper.ts — Views + mappers puros (aggregate, updatedAt)→View
2. application/ports/contractor-read.ts — interface do read port
3. adapter Drizzle read (reusa findById + projeção updated_at)
4. public-api/read.ts — buildPartnersReadPort + PartnersReadPort + close()
5. re-export em public-api/index.ts
