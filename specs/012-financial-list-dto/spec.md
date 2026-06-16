# Feature Specification: Financial List DTO — enriquecimento do grid de Contas a Pagar

**Feature Branch**: `012-financial-list-dto`

**Created**: 2026-06-16

**Status**: Draft

**Input**: GitHub issue [#47](https://github.com/ERP-Bem-Comum/core-api/issues/47) (FIN-LIST-DTO). Handoff do front (web-app v2): o grid de Contas a Pagar (`GET /api/v2/financial/documents`) precisa exibir, por linha, dados que hoje **não** chegam no item da listagem, forçando o cliente a resolver fornecedor/contrato por conta própria (ou a deixar colunas vazias). A listagem real (paginação + filtros) **já existe** (Fatia 2); o gap é o **conteúdo do item** (`DocumentSummary`).

---

## Clarifications

### Session 2026-06-16

- Q: US2 (#47) — como o backend resolve o fornecedor (nome + CNPJ) para o grid a partir do `supplierRef`? → A: **Read-model via outbox** — o `financial` mantém uma cópia local denormalizada (nome + CNPJ por `supplierRef`) atualizada por eventos do `partners` (consistência eventual). A listagem **não** faz chamada cross-módulo em runtime; lê o read-model local. Implica: nova tabela read-model `fin_*` (migration), consumer de eventos `partners → financial`, e dependência do `partners` emitir eventos de fornecedor via outbox (ADR-0015). Escopo sobe para **L**.

---

## User Scenarios & Testing _(mandatory)_

O usuário-alvo é o operador de Contas a Pagar usando o grid no front, e o integrador que consome `GET /documents`. As histórias são independentes e priorizadas por valor/risco: dados locais do documento (já no backend) antes de dados resolvidos de outro módulo.

### User Story 1 - Colunas do documento no grid sem chamadas extras (Priority: P1)

Quem abre o grid de Contas a Pagar vê, em cada linha, **série**, **valor bruto**, **forma de pagamento** e a **referência do contrato vinculado** — campos que já pertencem ao documento — direto no item da listagem, sem nenhuma requisição adicional.

**Why this priority**: É o maior valor com o menor risco — todos esses campos já existem no documento/armazenamento; basta expô-los no item. Desbloqueia 4 das colunas hoje vazias do grid sem tocar outros módulos.

**Independent Test**: Listar documentos e verificar que cada item traz `series`, `grossValueCents`, `paymentMethod` e `contractRef` coerentes com o documento; um documento sem série/contrato traz esses campos nulos sem erro.

**Acceptance Scenarios**:

1. **Given** documentos cadastrados, **When** o grid lista (`GET /documents`), **Then** cada item inclui `series`, `grossValueCents`, `paymentMethod` e `contractRef`, além dos campos já existentes.
2. **Given** um documento Open/Approved, **When** listado, **Then** `grossValueCents` reflete o valor bruto e `paymentMethod` a forma de pagamento do documento.
3. **Given** um documento sem série ou sem contrato vinculado, **When** listado, **Then** `series`/`contractRef` vêm `null` — sem erro.
4. **Given** a resposta da listagem, **When** comparada à atual, **Then** os campos pré-existentes (id, status, documentNumber, type, supplierRef, netValueCents, dueDate, version) permanecem inalterados — só há adição de campos.

---

### User Story 2 - Fornecedor resolvido (nome + CNPJ) no grid (Priority: P2)

Quem abre o grid vê o **nome** e o **CNPJ** do fornecedor em cada linha, resolvidos pelo backend a partir do `supplierRef` — o cliente não precisa fazer N chamadas para resolver fornecedores.

**Why this priority**: Alto valor para o grid (coluna Fornecedor é central), mas envolve um **read-model denormalizado** mantido por eventos do `partners` — risco e custo maiores que US1 (migration, consumer de eventos, consistência eventual). Depende de o `partners` emitir eventos de fornecedor via outbox.

**Independent Test**: Com o read-model populado (por eventos do `partners`), listar documentos e verificar que cada item traz `supplierName` + `supplierDocument` (CNPJ) corretos lidos do read-model local — sem nenhuma chamada ao `partners` em runtime.

**Acceptance Scenarios**:

1. **Given** documentos com `supplierRef` presente no read-model, **When** o grid lista, **Then** cada item traz `supplierName` e `supplierDocument` (CNPJ) — lidos do read-model local, sem o cliente resolver.
2. **Given** a listagem de uma página, **When** servida, **Then** os dados de fornecedor vêm do read-model local — **nenhuma** chamada cross-módulo ao `partners` em runtime.
3. **Given** um `supplierRef` ainda não presente no read-model (evento não processado) ou nulo, **When** listado, **Then** `supplierName`/`supplierDocument` vêm `null` — a listagem não falha (consistência eventual).

---

### Edge Cases

- Documento **Draft** (sem líquido) — `netValueCents` já é nulo; `grossValueCents` reflete o bruto informado.
- `supplierRef` nulo, ou ainda ausente no read-model (evento não processado) → `supplierName`/`supplierDocument` nulos, sem erro (US2).
- **Consistência eventual**: fornecedor recém-cadastrado/atualizado no `partners` pode levar um curto intervalo (até o evento ser processado) para refletir no grid — aceito por design.
- Página vazia / além do total → `{ items: [], page, pageSize, total }` (comportamento atual preservado).
- Página no tamanho máximo (100) → fornecedor lido do read-model local (sem chamada cross-módulo).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O item da listagem MUST incluir `series` do documento (nulo quando ausente).
- **FR-002**: O item da listagem MUST incluir `grossValueCents` (valor bruto) do documento.
- **FR-003**: O item da listagem MUST incluir `paymentMethod` (forma de pagamento) do documento.
- **FR-004**: O item da listagem MUST incluir `contractRef` (referência do contrato vinculado; nulo quando ausente).
- **FR-005**: O item da listagem MUST incluir `supplierName` e `supplierDocument` (CNPJ), lidos pelo backend a partir do `supplierRef` — o cliente não resolve fornecedores.
- **FR-006**: O `supplierName`/`supplierDocument` MUST vir de um **read-model local denormalizado** no `financial` (tabela `fin_*`) — a listagem **não** consulta o `partners` em runtime (sem chamada cross-módulo síncrona, sem padrão N+1).
- **FR-006a**: O read-model de fornecedor MUST ser mantido por **eventos do `partners`** (via outbox — ADR-0015), com **consistência eventual** aceita; o `financial` não escreve em tabelas do `partners` (ADR-0014).
- **FR-007**: A paginação MUST permanecer flat (`{ items, page, pageSize, total }`) e os filtros existentes (`status`, `supplierRef`, `type`, `dueFrom`, `dueTo`, `page`, `pageSize`) MUST continuar funcionando.
- **FR-008**: Campos não disponíveis (sem série, sem contrato, fornecedor não resolvível) MUST ser retornados como `null`, sem erro na listagem.
- **FR-009**: Os campos pré-existentes do item MUST permanecer inalterados (apenas adição).
- **FR-010** (limite): A sincronização do read-model de fornecedor MUST usar exclusivamente eventos via outbox do `partners` (ADR-0015) — sem leitura cruzada de tabelas em runtime (ADR-0014). Não tocar o módulo `contracts`.

### Out of Scope (bloqueado/adiado)

- **`dataEmissao` (data de emissão)**: a coluna **não existe** no documento hoje; depende da issue **#48** (FIN-CREATE-DTO) para ser aceita/persistida. Fica fora desta feature.
- **Número/rótulo do contrato** (resolver `contractRef` → número legível): o módulo `contracts` **não expõe** leitura síncrona para isso; exigiria nova porta + dependência com `CTR-NUMBER-PROGRAM`. Esta feature expõe apenas o `contractRef` (a referência), não o rótulo.
- **Filtros/paginação**: já implementados (Fatia 2) — não fazem parte do gap.

### Key Entities _(include if data involved)_

- **Item da listagem (DocumentSummary)**: já existente; ganha `series`, `grossValueCents`, `paymentMethod`, `contractRef`, `supplierName`, `supplierDocument`.
- **Read-model da listagem (DocumentListItem)**: projeção de leitura do documento; ganha os campos locais (`series`, valor bruto, forma de pagamento, `contractRef`).
- **Read-model de fornecedor (`financial`)**: cópia local denormalizada (`supplierRef` → nome + CNPJ) em tabela `fin_*`, mantida por eventos do `partners` (consistência eventual). É a fonte de `supplierName`/`supplierDocument` na listagem.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O grid renderiza série, valor bruto, forma de pagamento, contrato (referência) e fornecedor (nome+CNPJ) **sem nenhuma** chamada adicional do cliente para resolver fornecedor ou contrato.
- **SC-002**: A listagem **não** faz nenhuma chamada cross-módulo ao `partners` em runtime — o fornecedor (nome+CNPJ) vem do read-model local em 100% das listagens.
- **SC-003**: 100% dos campos pré-existentes do item permanecem idênticos (somente adição de campos novos).
- **SC-004**: Documento sem fornecedor/contrato/série vinculado retorna os campos correspondentes como `null` em 100% dos casos, sem erro de listagem.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [ ] Contratos (`ctr_*`) · [x] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [x] Parceiros (`partners_*`, **produtor de eventos de fornecedor**)
  - O financial mantém um read-model local de fornecedor alimentado por eventos do `partners` via outbox (ADR-0015) — não há leitura cruzada de tabelas em runtime (ADR-0014). Não toca `contracts`.
- **Novos agregados / Value Objects?**: Nenhum agregado novo. Novo **read-model** (não-agregado) de fornecedor no `financial`.
- **Novos eventos de domínio (outbox)?**: **Sim** — o `financial` consome eventos de fornecedor do `partners` (ex.: `SupplierRegistered`/`SupplierUpdated`) para manter o read-model. **Dependência**: o `partners` precisa emitir esses eventos via outbox; se ainda não emite, é pré-requisito a destravar (possível ADR/contrato de evento `partners → financial`).
- **Novos subcomandos de CLI?**: N/A (ADR-0037).
- **Borda HTTP envolvida?**: **Sim** — enriquece o response schema do item de `GET /api/v2/financial/documents`. Sem nova rota.
- **Migração de banco?**: **Sim** — nova tabela de read-model `fin_*` (ex.: `fin_supplier_view`: `supplier_ref`, `name`, `document`). US1 não exige migration (campos já existem); US2 sim.
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma — comunicação cross-BC por eventos/outbox (ADR-0015); read-model no próprio prefixo `fin_*`; sem 5º módulo; sem features SQL proibidas.

## Assumptions

- **Resolução do fornecedor (decisão resolvida no clarify — ver Clarifications)**: **read-model denormalizado** no `financial`, mantido por eventos do `partners` via outbox. A listagem lê o read-model local (sem chamada cross-módulo em runtime), ao custo de consistência eventual + migration + consumer de eventos. **Dependência a verificar no plano**: o `partners` já emite eventos de fornecedor (`SupplierRegistered`/`SupplierUpdated`) via outbox? Se não, isso vira pré-requisito (contrato de evento + emissão no `partners`).
- **`contractRef` é a referência (uuid), não o número legível** — o rótulo do contrato fica fora de escopo (ver Out of Scope).
- **Campos locais já persistidos**: `series`, valor bruto, forma de pagamento e `contractRef` já existem no documento — apenas precisam ser expostos no read-model e no DTO.
- **Filtros e paginação** já existem e não são alterados.
- **Independência de outras features**: a `011-financial-hardening` (em PR para `dev`) toca `dto.ts`/`schemas.ts` em regiões distintas (trilha/erros); o merge das duas é compatível, com sobreposição mínima a resolver.
