# Feature Specification: Financial Supplier Read-Model (fornecedor no grid de Contas a Pagar)

**Feature Branch**: `014-financial-supplier-readmodel`

**Created**: 2026-06-16

**Status**: Draft

**Input**: GitHub issue [#47](https://github.com/ERP-Bem-Comum/core-api/issues/47) — **US2** (a US1, campos locais do item, já foi entregue na feature 012). O grid de Contas a Pagar (`GET /api/v2/financial/documents`) precisa exibir, por linha, **nome** e **CNPJ** do fornecedor, hoje ausentes — o cliente é forçado a resolver fornecedores por conta própria (N chamadas) ou deixar a coluna vazia.

Pré-requisito (já resolvido): o `partners` publica `SupplierRegistered`/`SupplierEdited` via outbox `par_outbox` com payload de integração `{ supplierRef, name, document, occurredAt }` (ADR-0043, feature 013 / PR #94 mergeado). O CNPJ é alfanumérico (ADR-0044) — `document` pode conter letras.

---

## Clarifications

### Session 2026-06-16

- Q: Fornecedores cadastrados antes do outbox não emitiram eventos — sem backfill, aparecem com nome/CNPJ nulos no grid até serem editados. Como tratar nesta feature? → A: **Incluir backfill nesta feature** — job/script one-shot (padrão ADR-0041) que lê os fornecedores existentes via public-api do `partners` e popula o `fin_supplier_view` de uma vez, pelo mesmo caminho idempotente do consumer.

---

## User Scenarios & Testing _(mandatory)_

O usuário-alvo é o operador de Contas a Pagar que abre o grid no front, e o integrador que consome `GET /documents`. As histórias são independentes e priorizadas por dependência: primeiro o backend **mantém** a cópia local de fornecedor (alimentada por eventos), depois a listagem **lê** essa cópia.

### User Story 1 - Read-model de fornecedor mantido por eventos (Priority: P1)

O `financial` mantém uma cópia local denormalizada de fornecedor (referência → nome + CNPJ), atualizada automaticamente quando o `partners` cadastra ou edita um fornecedor — sem que o `financial` consulte o `partners` em tempo de execução.

**Why this priority**: É a fundação da US2. Sem a cópia local populada e mantida, o grid não tem fonte para nome/CNPJ. Entrega valor isolado: a cópia local fica correta e auditável mesmo antes de ser exibida.

**Independent Test**: Publicar `SupplierRegistered` e depois `SupplierEdited` no outbox do `partners`; verificar que a cópia local do `financial` reflete o último estado (nome/CNPJ) por referência de fornecedor, de forma idempotente (reprocessar o mesmo evento não duplica nem corrompe) e sem aplicar um evento mais antigo sobre um mais novo.

**Acceptance Scenarios**:

1. **Given** um `SupplierRegistered` publicado pelo `partners`, **When** o evento é processado, **Then** a cópia local passa a ter `{ supplierRef → name, document }` daquele fornecedor.
2. **Given** um `SupplierEdited` posterior para o mesmo `supplierRef`, **When** processado, **Then** a cópia local reflete o novo nome/CNPJ (snapshot pós-edição).
3. **Given** o mesmo evento entregue duas vezes (at-least-once), **When** reprocessado, **Then** o estado final é o mesmo de uma única aplicação (idempotência).
4. **Given** um evento com `occurredAt` mais antigo que o estado já gravado, **When** processado, **Then** a cópia local **não** regride para o valor antigo.
5. **Given** o `financial` mantendo a cópia, **When** observado, **Then** ele **não** lê tabelas do `partners` nem chama o `partners` de forma síncrona — a atualização vem só dos eventos do outbox.

---

### User Story 2 - Fornecedor (nome + CNPJ) resolvido no grid (Priority: P2)

Quem abre o grid vê o **nome** e o **CNPJ** do fornecedor em cada linha, resolvidos pelo backend a partir do `supplierRef` — sem o cliente fazer N chamadas.

**Why this priority**: É o valor visível para o usuário (coluna Fornecedor é central no grid). Depende da cópia local da US1 estar sendo mantida.

**Independent Test**: Com a cópia local populada, listar documentos e verificar que cada item traz `supplierName` + `supplierDocument` corretos, lidos da cópia local — sem nenhuma chamada ao `partners` em runtime.

**Acceptance Scenarios**:

1. **Given** documentos cujo `supplierRef` está na cópia local, **When** o grid lista, **Then** cada item traz `supplierName` e `supplierDocument` (CNPJ) coerentes.
2. **Given** uma página da listagem, **When** servida, **Then** os dados de fornecedor vêm da cópia local — **nenhuma** chamada cross-módulo ao `partners` em runtime.
3. **Given** um `supplierRef` nulo ou ainda ausente na cópia local (evento não processado), **When** listado, **Then** `supplierName`/`supplierDocument` vêm `null` — a listagem não falha (consistência eventual).
4. **Given** a resposta da listagem, **When** comparada à atual, **Then** os campos pré-existentes do item permanecem inalterados — só há adição de `supplierName`/`supplierDocument`.

---

### Edge Cases

- **`supplierRef` nulo** no documento → `supplierName`/`supplierDocument` nulos, sem erro.
- **`supplierRef` ausente na cópia local** (evento ainda não processado) → campos nulos; refletem assim que o evento for processado (consistência eventual).
- **CNPJ alfanumérico** (letras maiúsculas) → exibido como veio no evento, sem reformatar.
- **Evento fora de ordem / duplicado** → idempotência + guard de recência (não regride).
- **Fornecedor editado várias vezes** → a cópia local converge para o último snapshot (por `occurredAt`).
- **Página vazia / além do total** → `{ items: [], page, pageSize, total }` (comportamento atual preservado).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O `financial` MUST manter uma cópia local denormalizada de fornecedor (`supplierRef → name, document`), em tabela própria `fin_*`.
- **FR-002**: A cópia local MUST ser mantida exclusivamente por **eventos do `partners`** consumidos via outbox (`SupplierRegistered`, `SupplierEdited`) — sem leitura cruzada de tabelas do `partners` (ADR-0014) e sem chamada síncrona cross-módulo em runtime.
- **FR-003**: O processamento de eventos MUST ser **idempotente** (reentrega at-least-once não duplica/corrompe) e **resistente a fora-de-ordem** (um evento mais antigo não sobrescreve um estado mais novo).
- **FR-004**: O item da listagem (`GET /api/v2/financial/documents`) MUST incluir `supplierName` e `supplierDocument` (CNPJ), lidos da cópia local a partir do `supplierRef`.
- **FR-005**: A listagem MUST resolver fornecedor **apenas** pela cópia local — sem padrão N+1 e sem chamada ao `partners` em runtime.
- **FR-006**: `supplierName`/`supplierDocument` MUST ser `null` quando o `supplierRef` for nulo ou ainda não estiver na cópia local — sem erro de listagem.
- **FR-007**: `supplierDocument` MUST aceitar CNPJ **alfanumérico** (ADR-0044), preservando o valor recebido no evento.
- **FR-008**: Os campos pré-existentes do item MUST permanecer inalterados (apenas adição de campos).
- **FR-009**: A paginação MUST permanecer flat (`{ items, page, pageSize, total }`) e os filtros existentes MUST continuar funcionando.
- **FR-010**: A feature MUST NOT tocar o módulo `contracts`, e MUST manter o isolamento de módulos: o produtor (`partners`) e o consumidor (`financial`) comunicam-se só por eventos/outbox (ADR-0015) e por suas public-apis (ADR-0006).
- **FR-011**: A feature MUST fornecer um **backfill one-shot** (job/script — padrão ADR-0041) que popula a cópia local a partir dos fornecedores **já existentes** no `partners` (lidos pela public-api do `partners`), de forma idempotente (re-execução não duplica/corrompe; usa o mesmo caminho de aplicação do consumer). Assim o grid resolve fornecedores legados desde o primeiro deploy, não só os cadastrados/editados após o consumer entrar no ar.

### Key Entities _(include if feature involves data)_

- **Cópia local de fornecedor (`financial`)**: projeção de leitura denormalizada `supplierRef → { name, document, occurredAt }` em tabela `fin_*`, mantida por eventos do `partners`. Fonte de `supplierName`/`supplierDocument` na listagem.
- **Item da listagem (DocumentSummary)**: já existente; ganha `supplierName` e `supplierDocument`.
- **Evento de integração de fornecedor** (consumido, não produzido aqui): `{ supplierRef, name, document, occurredAt }` (contrato ADR-0043).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O grid renderiza nome + CNPJ do fornecedor em cada linha **sem nenhuma** chamada adicional do cliente para resolver fornecedor.
- **SC-002**: 100% das listagens resolvem fornecedor pela cópia local — **zero** chamadas cross-módulo ao `partners` em runtime.
- **SC-003**: Após o `partners` cadastrar/editar um fornecedor, a cópia local reflete o novo estado em até um ciclo de processamento do outbox (consistência eventual), sem intervenção manual.
- **SC-004**: Documento sem fornecedor resolvível retorna `supplierName`/`supplierDocument` como `null` em 100% dos casos, sem erro de listagem.
- **SC-005**: 100% dos campos pré-existentes do item permanecem idênticos (somente adição).

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [ ] Contratos (`ctr_*`) · [x] Financeiro (`fin_*`, **consumidor + read-model**) · [ ] Auth (`auth_*`) · [x] Parceiros (`partners_*`, **produtor — já pronto, não alterado aqui**)
  - Justificativa do toque em 2 BCs: o `financial` apenas **consome** os eventos já publicados pelo `partners`; não escreve em tabelas do `partners` (ADR-0014). A ligação fica num **composition root** fora dos módulos (nenhum módulo importa o outro — ADR-0006).
- **Novos agregados / Value Objects?**: Nenhum agregado. Nova projeção de leitura (read-model, não-agregado) de fornecedor no `financial`.
- **Novos eventos de domínio (outbox)?**: Nenhum novo evento. **Consome** `SupplierRegistered`/`SupplierEdited` (contrato ADR-0043).
- **Novos subcomandos de CLI?**: N/A (ADR-0037).
- **Borda HTTP envolvida?**: Sim — enriquece o response schema do item de `GET /api/v2/financial/documents` (sem nova rota).
- **Migração de banco?**: Sim — nova tabela `fin_*` (cópia local de fornecedor).
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma — comunicação cross-BC por eventos/outbox (ADR-0015); read-model no prefixo `fin_*`; sem 5º módulo; sem features SQL proibidas (ADR-0020).

## Assumptions

- **Topologia de consumo (decisão registrada no clarify)**: um **worker dedicado** em composition root (`src/`, fora dos módulos) lê o `par_outbox` via public-api do `partners` e atualiza a cópia local via public-api do `financial` — 2 pools, nenhum módulo importa o outro. Replica o padrão de consumer `timeline-projection.delivery.ts` do `contracts`. (Detalhe técnico no plano.)
- **Idempotência + ordem**: garantidas por upsert com guard de `occurredAt` (ou tabela de eventos processados) — o estado converge para o snapshot mais recente. (Detalhe no plano.)
- **`document` alfanumérico**: o CNPJ pode conter letras (ADR-0044); o read-model e o DTO tratam como texto.
- **Pré-requisito pronto**: o `partners` já publica os eventos via `par_outbox` (ADR-0043) — esta feature é só o lado consumidor + exibição.
- **Backfill incluído** (clarify 2026-06-16): job one-shot popula a cópia local a partir dos fornecedores existentes no `partners` (via public-api), pelo mesmo caminho idempotente do consumer (FR-011). Grid resolve fornecedores legados desde o primeiro deploy.
- **Fora de escopo**: número/rótulo legível do contrato; `dataEmissao` (#48); filtros/paginação (já existem).
