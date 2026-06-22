# Feature Specification: CONCILIADO reflete no grid de Contas a Pagar

**Feature Branch**: `023-fin-reconciled-grid`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Ao conciliar, o payable vai Paid→Reconciled, mas o documento não — o grid de Contas a Pagar (GET /financial/documents) lê fin_documents.status e segue mostrando 'Pago', nunca 'Conciliado'. Refletir Conciliado no grid (status ou indicador) + estender o filtro para Paid/Reconciled; o undo reverte. Issue #204, P1, bloqueia teste de tesouraria."

## Clarifications

### Session 2026-06-22

- Q: Como o estado CONCILIADO deve chegar ao grid de Contas a Pagar (propagar status × indicador derivado × projeção)? → A: **Indicador derivado no DTO, em tempo de leitura.** O grid calcula o estado de conciliação por documento ao ler (derivando do estado de conciliação dos seus títulos pagáveis: **todos** Reconciled → documento Conciliado; parcial → não) e estende o filtro para Pago/Conciliado. **Não** escreve em `fin_documents.status` nem cria tabela de projeção/consumidor. Alinhado ao ADR-0022 (read-model é derivado/reconstruível) e à emenda #130 (sem escrita síncrona cross-agregado); evita dependência do #127. Rejeitadas: propagação síncrona de `fin_documents.status` (escrita cross-agregado desencorajada por ADR-0022:37/#130) e projeção event-driven (mais pesada — consumidor + #127 — sem ganho para o escopo atual).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Tesouraria vê o título como CONCILIADO após conciliar (Priority: P1)

Um operador de tesouraria concilia um título pago contra uma transação do extrato. Em seguida, abre (ou atualiza) o grid de Contas a Pagar. Hoje o título **continua aparecendo como "Pago"**, embora a conciliação tenha ocorrido — o estado de conciliação não chega ao grid. O operador precisa ver o título refletido como **"Conciliado"** para confiar que a conciliação surtiu efeito.

**Why this priority**: É o defeito que **bloqueia o teste do cliente** (fluxo de tesouraria, fonte: validação da P.O.). O front já está pronto (o estado "Conciliado" e o chip existem); falta o backend refletir o resultado da conciliação no grid.

**Independent Test**: conciliar um título pago e, em seguida, ler o grid de Contas a Pagar — o título correspondente deve aparecer como "Conciliado" (e não "Pago").

**Acceptance Scenarios**:

1. **Given** um documento cujo título está "Pago" e uma transação de extrato compatível, **When** o operador concilia o título contra a transação, **Then** ao reler o grid de Contas a Pagar o documento correspondente é apresentado como **Conciliado**.
2. **Given** um documento já refletido como Conciliado no grid, **When** o operador **desfaz** a conciliação, **Then** ao reler o grid o documento volta a ser apresentado como **Pago** (reversão simétrica).

---

### User Story 2 - Filtrar o grid por Pago e Conciliado (Priority: P2)

Um operador quer filtrar a listagem de Contas a Pagar pelos estados **Pago** e **Conciliado** para acompanhar o trabalho de conciliação. Hoje o filtro de status do grid só aceita os estados iniciais (rascunho/aberto/aprovado) e **não permite** filtrar por Pago nem Conciliado.

**Why this priority**: sem o filtro, mesmo refletindo o estado correto (US1), o operador não consegue isolar a fila de conciliação. Complementa a US1 e é necessário para o uso real da tela, mas a US1 já entrega o valor central (ver o estado correto).

**Independent Test**: com documentos em estados Pago e Conciliado, aplicar o filtro por cada um desses estados e verificar que a listagem retorna apenas os documentos no estado pedido.

**Acceptance Scenarios**:

1. **Given** documentos nos estados Pago e Conciliado, **When** o operador filtra o grid por "Conciliado", **Then** a listagem retorna apenas os documentos conciliados.
2. **Given** os mesmos documentos, **When** o operador filtra por "Pago", **Then** a listagem retorna apenas os pagos (não-conciliados).

---

### Edge Cases

- **Documento com múltiplos títulos (pai + filhos)**: um documento pode ter mais de um título pagável. É preciso uma regra clara de quando o **documento** conta como Conciliado no grid — p.ex. quando **todos** os seus títulos pagáveis estão conciliados (conciliação parcial → ainda não Conciliado). [Resolver na clarificação.]
- **Reversão (undo)**: desfazer a conciliação reverte o reflexo no grid (Conciliado → Pago), de forma simétrica à conciliação.
- **Conciliação parcial / com diferença**: se apenas parte dos títulos do documento foi conciliada, o grid não deve apresentar o documento inteiro como Conciliado.
- **Sem regressão de outros estados**: documentos em Rascunho/Aberto/Aprovado/Pago seguem sendo apresentados e filtráveis como hoje.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Após uma conciliação bem-sucedida de um título pago, o grid de Contas a Pagar MUST apresentar o documento correspondente como **Conciliado** (e não mais como Pago).
- **FR-002**: Ao **desfazer** a conciliação, o grid MUST reverter a apresentação do documento de Conciliado para **Pago** (reversão simétrica).
- **FR-003**: O grid MUST permitir **filtrar** por **Pago** e por **Conciliado**, além dos estados já suportados.
- **FR-004**: Um documento conta como **Conciliado** no grid **se e somente se TODOS os seus títulos pagáveis estiverem conciliados**; conciliação **parcial** MUST NOT apresentar o documento como Conciliado (resolvido — ver Clarifications 2026-06-22).
- **FR-005**: A funcionalidade MUST permanecer no módulo Financeiro e respeitar o isolamento de Bounded Context (sem leitura/escrita cruzada de tabelas de outros módulos).
- **FR-006**: A correção MUST ser coberta por testes que exercitem o caminho real (conciliar → grid reflete Conciliado; desfazer → grid reverte; filtrar por Pago/Conciliado), de modo que o reflexo no grid não possa regredir despercebido.
- **FR-007**: O estado Conciliado no grid MUST ser **derivado em tempo de leitura** a partir do estado de conciliação dos títulos pagáveis (decisão de clarify). A funcionalidade MUST NOT escrever/propagar o estado de conciliação em `fin_documents` nem depender de uma tabela de projeção/consumidor dedicado — é uma leitura derivada, reconstruível (ADR-0022), sem escrita síncrona cross-agregado (#130).

### Key Entities _(include if feature involves data)_

- **Documento (Contas a Pagar)**: item apresentado no grid; possui um estado (Rascunho/Aberto/Aprovado/Pago/Conciliado/…). É a linha que a tesouraria acompanha.
- **Título pagável (payable)**: unidade pagável vinculada a um documento (um documento pode ter um título "pai" e títulos "filhos"). Tem seu próprio estado de conciliação (Pago ↔ Conciliado).
- **Conciliação**: associação entre título(s) pagável(eis) e uma transação de extrato; pode ser desfeita. É a operação que dispara a mudança de estado de conciliação dos títulos.
- **Grid de Contas a Pagar**: listagem que a tesouraria consulta; lê o estado do documento e oferece filtro por estado.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos documentos cujos títulos foram conciliados aparecem como **Conciliado** no grid na releitura seguinte (hoje: 0% — sempre "Pago").
- **SC-002**: Desfazer a conciliação reverte 100% desses documentos para **Pago** no grid.
- **SC-003**: O operador consegue filtrar o grid por **Pago** e por **Conciliado**, obtendo apenas os documentos no estado pedido.
- **SC-004**: Documentos com conciliação **parcial** (nem todos os títulos conciliados) **não** aparecem como Conciliado.
- **SC-005**: O teste de tesouraria (validação do cliente) que hoje está bloqueado passa a poder ser executado fim-a-fim.
- **SC-006**: Existe cobertura automatizada que falha se o reflexo no grid (ou o filtro) regredir.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Financeiro (`fin_*`)
  - Único BC. **Decidido (clarify 2026-06-22)**: o estado de conciliação dos títulos chega ao grid por **indicador derivado em tempo de leitura** (o grid deriva do estado dos títulos pagáveis do documento), **não** por escrita em `fin_documents` nem por projeção dedicada. Alinhado ao ADR-0022:37/40 (read-model derivado/reconstruível) e à emenda #130 (sem escrita síncrona cross-agregado). Evita a dependência do #127 (outbox atômico).
- **Novos agregados / Value Objects?**: Nenhum. Nenhuma escrita de estado nova; apenas derivação de leitura no grid.
- **Novos eventos de domínio (outbox)?**: Nenhum novo. A conciliação já emite `PayableReconciled`/`ReconciliationUndone`; esta feature **não** adiciona consumidor/projeção (leitura derivada).
- **Novos subcomandos de CLI?**: Nenhum (ADR-0037).
- **Borda HTTP envolvida?**: Sim — `GET /api/v2/financial/documents` (grid): reflexo do estado + extensão do filtro de status para aceitar Pago/Conciliado. Sem rota nova.
- **Possíveis violações da constituição (I–VIII)?**: Atenção ao ADR-0022/#130 (read-model cross-agregado deve ser projeção async, não escrita síncrona cross-agregado) — a clarificação deve escolher a abordagem alinhada ao cânone. Sem 5º módulo, sem classe no domínio, sem JSON nativo.

## Assumptions

- **Mecanismo decidido (clarify 2026-06-22): indicador derivado em tempo de leitura** — o grid deriva o estado de conciliação por documento a partir dos seus títulos pagáveis (todos Reconciled → Conciliado), sem escrever em `fin_documents` nem criar projeção/consumidor. Alinhado a ADR-0022:37/40 e #130; sem dependência do #127. O comportamento observável (grid mostra Conciliado, undo reverte, filtro aceita Pago/Conciliado) é fixo.
- **Enum já suporta Conciliado**: o estado "Conciliado" já existe no modelo de dados do documento — não é necessário criar um novo estado, apenas refleti-lo no grid (seja por propagação, seja por indicador).
- **Reversão existe**: a operação de desfazer conciliação já existe; o reflexo no grid deve acompanhar tanto a conciliação quanto o desfazimento.
- **Escopo de leitura**: o grid de Contas a Pagar é `GET /api/v2/financial/documents`; a extensão de filtro é só de leitura (sem alterar o contrato dos demais campos).
