# Feature Specification: Conciliação Bancária (módulo Financeiro)

**Feature Branch**: `017-fin-conciliacao-bancaria`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Implementar o Submódulo Conciliação Bancária do módulo financial (BC Core ⭐): importação de extrato (OFX/PDF/CSV/XLSX) com anti-duplicidade via FITID, sugestão de match por score de confiança (nunca automático — confirmação humana), conciliação 1:N / parcial / em lote, lançamentos manuais, fechamento de período, Unreconcile, e publicação de evento TituloConciliado (cross-módulo Contratos + Orçamento via outbox)."

**Fonte de domínio canônica**: `handbook/domain_questions/financeiro/bounded-contexts/conciliacao.md` e `handbook/domain_questions/financeiro/especificacao-mestre.md §6`. Em conflito, o handbook vence.

---

## Clarifications

### Session 2026-06-17

- **Q: Escopo do plano — todo o BC (US1–US6) ou só a fatia P1 (MVP)?**
  → **A: BC completo (US1–US6).** O plano cobre o submódulo inteiro: importar, conciliar
  Individual/Múltiplo/Parcial, Unreconcile, lançamento manual, lote, fechamento de período e
  exportação. (Implica `--size L` e fatiamento interno em múltiplos tickets W0→W3.)
- **Q: Formatos de importação no escopo?**
  → **A: Todos os formatos que NÃO exigem biblioteca de terceiros.** Na prática: **OFX** e **CSV**
  (texto puro, parser escrito à mão em Node, zero dependência nova — alinhado ao ADR-0011
  supply-chain e à diretriz "sem libs pesadas"). **XLSX** (container ZIP + XML) e **PDF** (OCR)
  exigem dependência externa e ficam **fora desta feature** (fatia futura, sob ADR de adoção da lib).
- **Q: Borda de entrada nesta fatia?**
  → **A: Incluir a borda HTTP** (`/api/v1`, Fastify + Zod/OpenAPI — constituição VII, ADR-0027/0033)
  já nesta feature, além de domínio/aplicação/persistência.
- **Q: Escopo do evento cross-módulo?**
  → **A: Só o lado produtor.** A conciliação publica `TituloConciliado`/`ConciliacaoDesfeita` etc.
  no outbox (ADR-0015). Contratos/Orçamento consomem em features próprias (Orçamento ainda não
  existe em `src/modules/`).

---

## User Scenarios & Testing _(mandatory)_

> Cada história é uma fatia independentemente testável. A ordem reflete dependência de dados
> (não há match sem extrato importado) **e** valor de negócio. P1 = MVP mínimo viável do BC.

### User Story 1 - Importar extrato bancário com anti-duplicidade (Priority: P1)

O Operador da Conciliação importa um arquivo de extrato de uma conta-cedente. O sistema lê cada
transação, extrai o `FITID` (identificador único do banco) e persiste as transações como
`Pending`. Reimportações do mesmo arquivo (ou de transações já vistas, mesmo `FITID`) são
**descartadas silenciosamente**, sem duplicar lançamentos. O Operador passa a enxergar o extrato
do período (entradas, saídas, saldos).

**Why this priority**: É o alicerce. Sem transações de extrato no sistema, nenhuma outra
capacidade da conciliação existe. Já entrega valor isolado: visibilidade do extrato e garantia
anti-duplicidade (R5 / FITID), que é uma invariante de integridade financeira.

**Independent Test**: Importar um arquivo de extrato de exemplo; verificar que N transações
nascem `Pending` com `FITID` único; reimportar o mesmo arquivo e confirmar que **nenhuma**
transação nova é criada (descarte silencioso) e que o resultado reporta o número de duplicatas
ignoradas.

**Acceptance Scenarios**:

1. **Given** uma conta-cedente cadastrada e um arquivo de extrato com 10 transações distintas,
   **When** o Operador importa o arquivo, **Then** 10 `TransacaoExtrato` são criadas com status
   `Pending`, cada uma com `FITID`, valor, data, tipo de movimento (`Debit`/`Credit`) e saldo
   após a transação.
2. **Given** um extrato já importado, **When** o Operador reimporta o mesmo arquivo, **Then**
   0 transações novas são criadas e o sistema reporta as duplicatas descartadas por `FITID`.
3. **Given** um arquivo com transações parcialmente novas (algumas com `FITID` já visto, outras
   inéditas), **When** importado, **Then** apenas as inéditas são persistidas.
4. **Given** um arquivo malformado ou de formato não suportado, **When** o Operador tenta
   importar, **Then** o sistema rejeita a importação com erro claro e **não** persiste nada
   (atomicidade da importação).

---

### User Story 2 - Conciliar título com transação (confirmação manual) (Priority: P1)

Para uma transação de extrato `Pending`, o Operador associa um título financeiro em status
`Paid` (Pago). A associação é **sempre manual**: o sistema pode **sugerir** um casamento com
score de confiança, mas **nunca concilia sozinho**. Ao confirmar, o sistema cria um registro de
`Conciliacao` vinculando transação ↔ título, transiciona o título de `Paid` → `Reconciled`,
registra trilha de auditoria imutável e publica o evento `TituloConciliado` (via outbox) para os
consumidores cross-módulo.

**Why this priority**: É o coração do BC — o "fechamento do ciclo financeiro". Sem ele, a feature
não cumpre seu propósito. Junto da US1, forma o MVP demonstrável (importar → conciliar).

**Independent Test**: Dado um título `Paid` e uma transação `Pending` de mesmo valor, o Operador
confirma a conciliação; verificar que o título vira `Reconciled`, que existe um `Conciliacao`
`Active` com auditoria, e que um evento `TituloConciliado` foi enfileirado no outbox.

**Acceptance Scenarios**:

1. **Given** uma transação `Pending` (R$ 8.000,00) e um título `Paid` (R$ 8.000,00) do mesmo
   favorecido, **When** o Operador confirma o match, **Then** o título passa a `Reconciled`, a
   transação passa a `Reconciled`, um `Conciliacao` tipo `Individual`/`Active` é criado e o evento
   `TituloConciliado` é gravado no outbox.
2. **Given** um título que **não** está em `Paid` (ex.: `Approved`, `Transmitted`), **When** o
   Operador tenta conciliar, **Then** o sistema rejeita com erro `title-not-paid` (R2).
3. **Given** uma transação já `Reconciled`, **When** o Operador tenta conciliá-la de novo,
   **Then** o sistema rejeita com `transaction-already-reconciled`.
4. **Given** o sistema calcula sugestões, **When** um título e uma transação têm valor exato +
   favorecido idêntico + data D0, **Then** uma sugestão de score "alto" (≥75%) é apresentada —
   **mas a conciliação só ocorre após confirmação explícita** (R1).

---

### User Story 3 - Desfazer conciliação / Unreconcile (Priority: P2)

O Operador desfaz uma conciliação ativa. O título retorna de `Reconciled` para `Paid`, o registro
de `Conciliacao` **não é deletado** — passa a `Undone`, preservando o histórico —, a auditoria
registra quem desfez e quando (motivo opcional), e o evento `ConciliacaoDesfeita` é publicado.

**Why this priority**: Reversibilidade é requisito de governança (correção de erro sem perda de
histórico). Não é o caminho feliz, mas é cedo o suficiente para ser P2 — uma conciliação errada
sem desfazimento é um beco sem saída operacional.

**Independent Test**: A partir de um título `Reconciled` com `Conciliacao` `Active`, o Operador
desfaz; verificar que o título volta a `Paid`, o `Conciliacao` fica `Undone` (não deletado), e
um evento `ConciliacaoDesfeita` é enfileirado.

**Acceptance Scenarios**:

1. **Given** um título `Reconciled` com `Conciliacao` `Active`, **When** o Operador desfaz, **Then**
   o título volta a `Paid`, a transação volta a `Pending`, o `Conciliacao` fica `Undone` com
   `desfeitoEm`/`desfeitoPor` preenchidos, e `ConciliacaoDesfeita` é publicado.
2. **Given** um `Conciliacao` já `Undone`, **When** o Operador tenta desfazer de novo, **Then**
   o sistema rejeita com `reconciliation-already-undone`.
3. **Given** um período de conciliação fechado, **When** o Operador tenta desfazer uma conciliação
   daquele período, **Then** o sistema rejeita com `period-closed` (R18).

---

### User Story 4 - Conciliação múltipla (1:N) e parcial com tratamento de diferença (Priority: P2)

Uma única transação bancária pode conciliar **vários** títulos (ex.: duas parcelas do mesmo
documento). Quando a soma dos títulos selecionados **não** iguala o valor da transação, o Operador
classifica a diferença (Juros, Multa, Desconto, Tarifa) ou a deixa como saldo parcial. A
conciliação só é considerada **100% completa** quando soma dos títulos + tratamento da diferença =
valor da transação (R3).

**Why this priority**: Cobre o mundo real (parcelas, juros, multas). Depende da mecânica de
conciliação (US2) já existir. Não bloqueia o MVP, mas é necessário para uso pleno.

**Independent Test**: Conciliar uma transação de R$ 8.450,00 com um título de R$ 8.000,00 +
diferença de R$ 450,00 classificada como `Interest`; verificar `Conciliacao` tipo `Partial`,
títulos `Reconciled` e que a soma fecha 100%.

**Acceptance Scenarios**:

1. **Given** uma transação (R$ 10.000,00) e dois títulos `Paid` (R$ 6.000,00 e R$ 4.000,00) do
   mesmo fornecedor, **When** o Operador concilia ambos, **Then** um `Conciliacao` tipo `Multiple`
   vincula os dois títulos, ambos viram `Reconciled` e `TituloConciliado` é publicado **por
   título**.
2. **Given** uma transação (R$ 8.450,00) e um título `Paid` (R$ 8.000,00), **When** o Operador
   classifica a diferença de R$ 450,00 como `Interest`, **Then** um `Conciliacao` tipo `Partial` é
   criado com a diferença tratada e o fechamento atinge 100%.
3. **Given** soma dos títulos < valor da transação **sem** tratamento da diferença, **When** o
   Operador tenta finalizar, **Then** o sistema mantém a transação pendente e rejeita o
   fechamento com `reconciliation-not-balanced` (R3/R4).

---

### User Story 5 - Lançamento manual e conciliação em lote (Priority: P3)

Transações sem título correspondente (ex.: **tarifas bancárias**) são lançadas manualmente: o
Operador escolhe o tipo (`Payment`, `Receipt`, `Transfer`, `FeePenaltyInterest`, `Investment`,
`Redemption`), preenche categoria/centro de custo/descrição, e o sistema cria um `ManualEntry` +
`Conciliacao`. Quando o sistema identifica um **padrão recorrente** (ex.: 5 tarifas de R$ 4,90),
sugere **conciliação em lote**, que o Operador revisa e confirma numa única ação.

**Why this priority**: Resolve a "cauda longa" de transações sem fato gerador. Importante para
fechar 100% do período, mas não é o fluxo principal de pagamento a fornecedor.

**Independent Test**: Lançar manualmente uma tarifa de R$ 4,90 sem título; verificar criação de
`ManualEntry` + `Conciliacao` tipo `ManualEntry` e transação `Reconciled`.

**Acceptance Scenarios**:

1. **Given** uma transação "TARIFA PIX QR CODE — R$ 4,90" sem título correspondente, **When** o
   Operador lança como `FeePenaltyInterest` com categoria, **Then** um `ManualEntry` é criado,
   vinculado a um `Conciliacao` tipo `ManualEntry`, e a transação vira `Reconciled`.
2. **Given** 5 transações idênticas de tarifa no período, **When** o sistema identifica o padrão,
   **Then** sugere um lote (`LoteSugerido`); ao confirmar, cria N conciliações numa operação.

---

### User Story 6 - Fechamento de período e exportação (Priority: P3)

Após conciliar (ou justificar) todas as transações de um período, o Operador **fecha o período**.
Período fechado não aceita novas importações nem alterações de conciliação (exige reabertura com
justificativa). O Operador pode exportar a conciliação do período em **OFX/CSV** (XLSX/PDF ficam
para fatia futura — exigem lib; ver FR-016).

**Why this priority**: É o "selo" contábil do ciclo. Depende de tudo acima. Exportação é
conveniência de relatório.

**Independent Test**: Fechar um período totalmente conciliado; verificar que novas importações no
período são rejeitadas (`period-closed`) e que o evento `PeriodoConciliacaoFechado` é publicado.

**Acceptance Scenarios**:

1. **Given** um período com todas as transações `Reconciled`, **When** o Operador fecha o período,
   **Then** `PeriodoConciliacaoFechado` é publicado e novas importações/alterações no período são
   rejeitadas com `period-closed`.
2. **Given** um período com transações `Pending` não justificadas, **When** o Operador tenta
   fechar, **Then** o sistema rejeita com `period-has-pending-transactions`.

---

### Edge Cases

- **Reimportação parcial**: arquivo com mix de `FITID` novos e já vistos → só os novos entram (US1).
- **Título pago em outra conta**: título `Paid` sem transação correspondente fica em "sem match";
  Operador investiga (pode reverter pagamento — fora do escopo deste BC, pertence a Títulos).
- **Conciliação que não fecha 100%**: transação permanece pendente até soma = valor (R3/R4).
- **Desfazer em período fechado**: rejeitado até reabertura justificada (R18).
- **Conta-cedente encerrada**: exibida separadamente; **não** aceita novas conciliações (R10).
- **Evento sem consumidor pronto**: `TituloConciliado` é publicado no outbox mesmo que os módulos
  consumidores (Contratos/Orçamento) ainda não consumam — produtor e consumidor são desacoplados
  (ADR-0015).
- **Arquivo de extrato sem `FITID` nativo** (caso do **CSV**): a chave anti-duplicidade é uma
  `Fitid` **sintética determinística** derivada de `(contaCedente + data + valor + memo + sequência
no arquivo)` via hash estável — garante o mesmo descarte silencioso da reimportação (R5). OFX
  usa o `FITID` nativo do arquivo.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST importar extratos de uma conta-cedente e criar `TransacaoExtrato`
  com `FITID`, data, tipo de movimento (`Debit`/`Credit`), tipo de lançamento, favorecido,
  descrição (memo), valor e saldo após a transação.
- **FR-002**: O sistema MUST descartar silenciosamente transações cujo `FITID` já foi importado
  (anti-duplicidade — R5), reportando a contagem de duplicatas ignoradas.
- **FR-003**: A importação MUST ser atômica: arquivo inválido não persiste transação alguma.
- **FR-004**: O sistema MUST permitir conciliar **apenas** títulos em status `Paid` (R2);
  qualquer outro status é rejeitado com `title-not-paid`.
- **FR-005**: O sistema MUST exigir **confirmação manual** do Operador para toda conciliação;
  sugestões de match NUNCA conciliam automaticamente (R1).
- **FR-006**: Ao confirmar uma conciliação, o sistema MUST criar `Conciliacao` `Active`,
  transicionar o(s) título(s) para `Reconciled`, marcar a transação como `Reconciled`, registrar
  auditoria imutável (quem/quando) e publicar `TituloConciliado` no outbox **por título** (R6).
- **FR-007**: O sistema MUST suportar conciliação `Individual` (1:1), `Multiple` (1:N) e
  `Partial` (com tratamento de diferença: Juros/Multa/Desconto/Tarifa).
- **FR-008**: Uma conciliação só é **100% completa** quando soma dos títulos vinculados +
  tratamento da diferença = valor da transação (R3); caso contrário permanece pendente (R4).
- **FR-009**: O sistema MUST permitir desfazer uma conciliação ativa (`Unreconcile`): título
  volta a `Paid`, transação volta a `Pending`, `Conciliacao` fica `Undone` (NUNCA deletado —
  R7), auditoria registra desfazimento, e `ConciliacaoDesfeita` é publicado.
- **FR-010**: O sistema MUST permitir `ManualEntry` para transações sem título (ex.:
  tarifas), criando `Conciliacao` tipo `ManualEntry` e publicando `LancamentoManualCriado`.
- **FR-011**: O sistema MUST calcular um **score de confiança (0–100%)** por sugestão a partir de
  critérios ponderados: favorecido idêntico (alto), valor exato (alto), data D0 (alto),
  referência no memo (médio), títulos abertos do fornecedor (baixo). Faixas: alta ≥75%, média
  50–74%, baixa <50% (não sugerida).
- **FR-012**: O sistema MUST permitir busca manual de títulos `Paid` por filtros (fornecedor,
  número do documento, descrição, período, tipo, faixa de valor) para conciliação sem sugestão.
- **FR-013**: O sistema MUST permitir fechar um período (`FecharPeriodo`) somente quando todas as
  transações estiverem `Reconciled` ou justificadas; período fechado rejeita importação/alteração
  com `period-closed` e publica `PeriodoConciliacaoFechado` (R18).
- **FR-014**: O sistema MUST identificar padrões recorrentes e sugerir conciliação em lote
  (`LoteSugerido`); confirmação cria N conciliações numa operação.
- **FR-015**: O sistema MUST suportar múltiplas contas-cedentes; contas encerradas são exibidas
  separadamente e não aceitam novas conciliações (R10).
- **FR-016**: O sistema MUST exportar a conciliação de um período. Nesta feature os formatos de
  exportação são **OFX** e **CSV** (geração de texto sem dependência); XLSX/PDF ficam para fatia
  futura (exigem lib).
- **FR-017**: Os formatos de importação suportados nesta feature são **OFX** e **CSV** — ambos
  parseados por leitor escrito à mão em Node, **sem dependência de terceiros** (ADR-0011). **XLSX**
  (container ZIP+XML) e **PDF** (OCR) exigem biblioteca externa e ficam **fora do escopo** (fatia
  futura, sob ADR de adoção da lib). Para CSV sem `FITID` nativo, aplica-se a `Fitid` sintética
  determinística (ver Edge Cases).
- **FR-018**: A feature MUST expor a capacidade pela **borda HTTP** (`/api/v1`, Fastify + Zod/
  OpenAPI — constituição VII, ADR-0027/0033), além do domínio/aplicação/persistência. Os endpoints
  cobrem importar extrato, listar transações, sugerir/confirmar/rejeitar match, conciliar
  múltiplo/parcial, lançar manualmente, desfazer, fechar período e exportar.
- **FR-019**: O escopo cross-módulo desta feature é **somente o lado produtor**: a conciliação
  publica os eventos no outbox (ADR-0015). Os consumidores em **Contratos** e **Orçamento** são
  entregues em features próprias (o módulo Orçamento ainda não existe em `src/modules/`).

### Key Entities

- **ExtratoBancario**: agregado raiz da importação. Pertence a uma conta-cedente, tem período
  (início/fim), metadados do arquivo (nome, formato, hash, data de importação), saldo inicial/final
  e a coleção de `TransacaoExtrato`.
- **TransacaoExtrato**: linha do extrato. Chave anti-duplicidade `FITID`. Carrega tipo de
  movimento/lançamento, favorecido, memo, valor, saldo após, e `statusConciliacao`
  (`Pending`/`Reconciled`/`ManualEntry`). Guarda critérios normalizados para o match.
- **Conciliacao**: vínculo entre uma `TransacaoExtrato` e 1..N títulos (`TituloConciliado`). Tem
  `tipo` (`Individual`/`Multiple`/`Partial`/`Batch`/`ManualEntry`), `status`
  (`Active`/`Undone`), trilha de auditoria e, quando há diferença, o tratamento aplicado.
- **MatchSuggestion**: sugestão calculada (transação ↔ título) com `score` e os critérios que o
  compõem. Status `Pending`/`Rejected`/`Accepted`. Nunca concilia por si.
- **ManualEntry**: registro financeiro criado na conciliação sem documento de origem (ex.:
  tarifa). Carrega tipo, categoria, centro de custo, descrição e o vínculo de conciliação.
- **Título financeiro** (referência — pertence ao BC Títulos/`fin_payables`): só participa da
  conciliação em status `Paid`; transiciona para `Reconciled` e volta a `Paid` no desfazimento.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das importações descartam duplicatas por `FITID` — zero transações duplicadas
  no banco após reimportação do mesmo arquivo.
- **SC-002**: 100% das conciliações exigem confirmação humana — zero títulos transicionados para
  `Reconciled` sem ação explícita do Operador.
- **SC-003**: Toda conciliação e desfazimento produz exatamente um evento no outbox
  (`TituloConciliado` por título / `ConciliacaoDesfeita`), verificável na tabela `core.outbox`.
- **SC-004**: 100% das conciliações e desfazimentos têm trilha de auditoria com autor e timestamp
  recuperáveis.
- **SC-005**: Nenhuma conciliação fecha um período com soma de títulos ≠ valor da transação
  (invariante R3 nunca violada).
- **SC-006**: Desfazer uma conciliação nunca deleta o registro original — 100% preservados como
  `Undone` (R7).

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Financeiro (`fin_*`). Contratos/Orçamento entram apenas como
  **consumidores de evento** em features próprias (não nesta) — sem leitura cruzada de tabelas
  (ADR-0006/0014/0015).
- **Novos agregados / Value Objects?**: agregados `ExtratoBancario`, `Conciliacao`; entidades
  `TransacaoExtrato`, `MatchSuggestion`, `ManualEntry`. VOs: `Fitid` (branded), `MatchScore`
  (0–100), `ContaCedenteRef`, reuso de `Money` (bigint cents). Cada um com smart constructor +
  branded type + `Result<T,E>` (constituição V).
- **Novos eventos de domínio (outbox)?**: `TituloConciliado` (EN provável `PayableReconciled`),
  `ConciliacaoDesfeita` (`ReconciliationUndone`), `ExtratoImportado` (`BankStatementImported`),
  `LancamentoManualCriado` (`ManualEntryRecorded`), `PeriodoConciliacaoFechado`
  (`ReconciliationPeriodClosed`). Nomes EN-passado finais a travar no domain.md/ADR.
- **Novos subcomandos de CLI?**: N/A — CLI embutida aposentada (ADR-0037, constituição VII).
- **Borda HTTP envolvida?**: **Sim** (FR-018) — endpoints `/api/v1` Fastify + Zod/OpenAPI
  (constituição VII, ADR-0027/0033) para todos os comandos da conciliação.
- **Possíveis violações da constituição (I–IX)?**: o módulo **Orçamento** citado no domínio ainda
  não existe em `src/modules/` — não criar 5º módulo nesta feature (escopo = produtor do evento).
  Parsing OFX/CSV é escrito à mão (sem dependência); XLSX/PDF (fora do escopo) exigiriam lib —
  avaliar supply-chain (ADR-0011) quando entrarem.

## Assumptions

- A conta-cedente (debit account) já existe como conceito no financeiro (introduzida na fatia da
  remessa CNAB — `fin_cedente_accounts`, migration `0004`); a conciliação a referencia.
- Títulos (`fin_payables`) já possuem o status `Reconciled` no enum persistido (confirmado:
  `schemas/mysql.ts` e migrations `0000`+ já listam `Reconciled`), hoje **reservado sem
  transição** — esta feature passa a usá-lo.
- O outbox cross-módulo (`core.outbox`, ADR-0015) e o worker genérico já existem (PR #97) e serão
  reutilizados como mecanismo de publicação.
- A camada de UI/wireframe descrita no handbook (abas Extrato/Conciliação, toggles, modais) é
  responsabilidade do **frontend** e está **fora** do escopo do core-api; aqui modelamos domínio,
  persistência, regras e a borda de serviço.
- "Nunca automático" (R1) é invariante de produto: o score é insumo de decisão, não gatilho.
- O caminho que leva um título a `Paid` (remessa CNAB + retorno + extrato D+1, ou pagamento
  manual) é **pré-requisito** e pertence a fatias anteriores/paralelas (016 remessa + retorno);
  esta feature começa do título já `Paid`.
