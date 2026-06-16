# Feature Specification: Partners — outbox de eventos de fornecedor

**Feature Branch**: `013-partners-supplier-outbox`

**Created**: 2026-06-16

**Status**: Draft

**Input**: GitHub issue [#92](https://github.com/ERP-Bem-Comum/core-api/issues/92) — pré-requisito da **US2** da [#47](https://github.com/ERP-Bem-Comum/core-api/issues/47) (read-model de fornecedor no `financial`). Hoje o `partners` **não tem outbox** (diferente do `contracts`); os eventos de fornecedor são emitidos no domínio mas **não publicados** cross-módulo, então nenhum outro módulo consegue reagir a cadastros/edições de fornecedor.

---

## Clarifications

### Session 2026-06-16

- Q: Quando publicar o evento de "fornecedor atualizado" (`SupplierEdited`)? → A: **Em toda edição**, carregando o **snapshot atual** de nome/CNPJ (independente de quais campos mudaram). O consumidor faz **upsert idempotente**; pode haver eventos "redundantes" (edição que não tocou nome/CNPJ), absorvidos sem inconsistência. Mais simples e robusto (YAGNI).
- Q: Quais eventos de fornecedor entram no contrato `partners → financial`? → A: **Só cadastrado + atualizado** (`SupplierRegistered` + `SupplierEdited`) — o mínimo do read-model de nome/CNPJ. `SupplierDeactivated`/`SupplierReactivated` ficam **fora** do contrato (a infra de outbox os comporta no futuro, mas não são publicados como contrato agora).

---

## User Scenarios & Testing _(mandatory)_

O "usuário" desta feature é **outro módulo** (a começar pelo `financial`) que precisa reagir a mudanças de fornecedor sem acoplar-se ao `partners`. As histórias são incrementais: a infra de entrega confiável primeiro, depois os eventos de fornecedor sobre ela.

### User Story 1 - Entrega confiável de eventos do partners (Priority: P1)

O módulo `partners` passa a registrar seus eventos de mudança num **log transacional (outbox)**, gravado na **mesma transação** da escrita do agregado, e entregue a consumidores de forma **at-least-once** com **idempotência** (cada evento tem id único). Assim, nenhuma mudança confirmada no `partners` se perde, e o `partners` não precisa conhecer quem consome.

**Why this priority**: é a fundação — sem entrega confiável, qualquer evento de fornecedor (US2) seria perdível em falha. Espelha o padrão já consolidado no `contracts` (ADR-0015).

**Independent Test**: gravar um agregado que emite evento e confirmar que (a) o evento fica registrado no outbox na mesma transação (some junto se a transação falha) e (b) o mecanismo de entrega o processa exatamente-uma-vez-efetiva (reprocessar não duplica efeito no consumidor).

**Acceptance Scenarios**:

1. **Given** uma escrita de agregado do `partners` que emite evento, **When** a transação confirma, **Then** o evento está no outbox com id único e marca de tempo.
2. **Given** que a transação de escrita falha/rola back, **When** verificado, **Then** nenhum evento correspondente fica no outbox (atomicidade).
3. **Given** um evento no outbox, **When** o mecanismo de entrega processa e depois reprocessa o mesmo evento, **Then** o consumidor aplica o efeito uma única vez (idempotência por id).
4. **Given** uma falha temporária na entrega, **When** o mecanismo tenta de novo, **Then** o evento é entregue (at-least-once), sem perda.

---

### User Story 2 - Eventos de fornecedor publicados com dados essenciais (Priority: P2)

Quando um fornecedor é **cadastrado** ou tem **nome/CNPJ editado**, um evento é publicado carregando os **dados essenciais do fornecedor** (referência, nome, CNPJ, instante). Outro módulo (ex.: `financial`) consegue, a partir desses eventos, manter uma cópia local atualizada de fornecedores — sem consultar o `partners` em tempo de uso.

**Why this priority**: é o objetivo de negócio (destravar o read-model de fornecedor do `financial` — US2 da #47). Depende da US1 (a infra).

**Independent Test**: cadastrar um fornecedor e depois editar seu nome/CNPJ; confirmar que cada operação publica um evento com `supplierRef`, `name` e `document` (CNPJ) coerentes com o estado pós-operação.

**Acceptance Scenarios**:

1. **Given** um cadastro de fornecedor, **When** confirmado, **Then** um evento de "fornecedor cadastrado" é publicado com `supplierRef`, `name`, `document` (CNPJ) e `occurredAt`.
2. **Given** uma edição que muda o nome e/ou o CNPJ de um fornecedor, **When** confirmada, **Then** um evento de "fornecedor atualizado" é publicado com os valores **pós-edição** de `name`/`document`.
3. **Given** um consumidor que recebe os eventos em ordem, **When** aplica cadastro seguido de edição, **Then** a cópia local reflete o estado mais recente do fornecedor (nome/CNPJ atuais).

---

### Edge Cases

- Edição que **não** altera nome nem CNPJ (ex.: muda só dados bancários) — **publica mesmo assim** com snapshot atual (decisão do clarify); o consumidor faz upsert idempotente, sem inconsistência.
- Reprocessamento do worker após crash — não duplica efeito (idempotência, US1 cenário 3).
- Outbox crescendo indefinidamente — política de retenção/limpeza dos eventos já entregues (Assumptions).
- Fornecedor desativado/reativado — fora do payload de nome/CNPJ; ver Out of Scope.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O `partners` MUST registrar eventos num outbox transacional, gravado na **mesma transação** da escrita do agregado (atomicidade: evento e estado confirmam/rolam back juntos).
- **FR-002**: Cada evento no outbox MUST ter **id único** e **instante**; a entrega MUST ser **at-least-once** com **idempotência** por id (reprocessar não duplica efeito).
- **FR-003**: O sistema MUST prover um mecanismo de **entrega/publicação** dos eventos do outbox a consumidores (espelhando o `contracts`).
- **FR-004**: Ao **cadastrar** um fornecedor, o sistema MUST publicar um evento de "fornecedor cadastrado" com payload `{ supplierRef, name, document (CNPJ), occurredAt }`.
- **FR-005**: Ao **editar** um fornecedor (qualquer `SupplierEdited`), o sistema MUST publicar um evento de "fornecedor atualizado" com o **snapshot pós-edição** de `name`/`document` (CNPJ) — independentemente de quais campos mudaram. O consumidor aplica via upsert idempotente (FR-002).
- **FR-006**: Os eventos publicados MUST ser **autocontidos** (carregam os dados que o consumidor precisa) — o consumidor não consulta o `partners` para obter nome/CNPJ.
- **FR-007**: O contrato dos eventos (nomes em EN-passado e payload) MUST ser registrado em **ADR + handbook** como contrato `partners → financial` (e futuros consumidores).
- **FR-008** (limite): a feature MUST se restringir ao módulo `partners` (`partners_*`); **não** implementar o consumer nem o read-model do `financial` (feature seguinte).

### Out of Scope

- **Consumer e read-model no `financial`** (a US2 da #47 propriamente): tabela `fin_supplier_view`, processamento dos eventos, leitura no DTO da listagem. Feature seguinte.
- **Eventos de desativação/reativação** de fornecedor para o read-model de nome/CNPJ: o grid usa nome+CNPJ; status de ativação não muda esses campos. Os eventos `SupplierDeactivated`/`SupplierReactivated` podem ser publicados pela infra, mas não são requisito desta feature para o consumidor conhecido.
- **Outros agregados de `partners`** (Financier, Collaborator, Act): a infra de outbox é geral, mas só os eventos de **Supplier** são requisito aqui.

### Key Entities _(include if data involved)_

- **Evento de outbox (partners)**: registro append-only com id único, tipo do evento (EN-passado), payload (dados do evento), instante, e estado de entrega. Gravado na transação da escrita do agregado.
- **Evento de fornecedor (integração)**: "fornecedor cadastrado" / "fornecedor atualizado", payload `{ supplierRef, name, document (CNPJ), occurredAt }`. Derivado do agregado **Supplier** no momento da publicação (os eventos de domínio existentes `SupplierRegistered`/`SupplierEdited` não carregam `name` — o payload de integração é enriquecido do agregado).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das escritas de agregado do `partners` que emitem evento resultam em exatamente um registro de outbox por evento — e **zero** registros quando a transação falha.
- **SC-002**: Reprocessar qualquer evento entregue **não** produz efeito duplicado no consumidor (idempotência verificável).
- **SC-003**: Para cada cadastro/edição de fornecedor (com mudança de nome/CNPJ), um evento autocontido com `supplierRef`/`name`/`document` é publicado — verificável sem consultar o `partners`.
- **SC-004**: O contrato dos eventos está documentado (ADR + handbook) de forma que um novo módulo consiga consumi-lo sem ler o código do `partners`.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [ ] Contratos (`ctr_*`) · [ ] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [x] Parceiros (`partners_*`)
  - Só `partners`. A comunicação com o `financial` se dá por **eventos via outbox** (ADR-0006/0015) — sem leitura cruzada de tabelas.
- **Novos agregados / Value Objects?**: Nenhum agregado novo. Eventos de domínio de Supplier já existem (`SupplierRegistered`/`SupplierEdited`).
- **Novos eventos de domínio (outbox)?**: **Sim** — passa a **publicar** os eventos de fornecedor via outbox (contrato de integração `partners → financial`). Registrar em `handbook/architecture/`.
- **Novos subcomandos de CLI?**: N/A (ADR-0037).
- **Borda HTTP envolvida?**: Não diretamente — os eventos são gerados pelos use cases de escrita de fornecedor já existentes. Pode haver um worker de publicação (processo), como no `contracts`.
- **Migração de banco?**: **Sim** — nova tabela de outbox `partners_*` (ex.: `partners_outbox`), gerada por migration (ADR-0020).
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma — outbox é o padrão prescrito (ADR-0015); prefixo `partners_*`; sem features SQL proibidas.

## Assumptions

- **Espelhar o `contracts`**: a infra de outbox (schema, append transacional, worker de publicação, idempotência) segue o padrão já consolidado do `contracts` (`ctr_outbox`, ADR-0015) — sem reinventar.
- **Reuso dos eventos de domínio existentes**: usa `SupplierRegistered` (cadastro) e `SupplierEdited` (edição) já existentes; **não** cria um `SupplierUpdated`. O payload de integração (com `name`/`document`) é montado do agregado no momento do append, pois os eventos de domínio atuais não carregam `name`.
- **Edição sem mudança de nome/CNPJ** _(resolvido no clarify)_: publica o evento "atualizado" com snapshot atual de nome/CNPJ em **qualquer** `SupplierEdited` (idempotente no consumidor).
- **Quais eventos publicar** _(resolvido no clarify)_: contrato = **cadastrado + atualizado** (`SupplierRegistered` + `SupplierEdited`). Desativação/reativação ficam fora do contrato (a infra os comporta, mas não são requisito).
- **Retenção do outbox**: eventos entregues são limpos/retidos conforme a política já usada no `contracts` (não inventar nova).
- **Não tocar `financial`**: o consumer/read-model é a feature seguinte (US2 da #47).
