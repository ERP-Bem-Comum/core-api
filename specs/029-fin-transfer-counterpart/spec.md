# Feature Specification: Transferência entre contas com contrapartida pendente

**Feature Branch**: `feat/269-transfer-counterpart`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: transferência/aplicação/resgate A→B em 1 lançamento — cria contrapartida pendente na conta de destino e casa as duas pernas na conciliação (issue #269, evolução da #143).

## Clarifications

### Session 2026-07-01 (defaults recomendados — Gabriel delegou a decisão)

- **Q1 — Ciclo de vida da contrapartida não casada (FR-011):** MVP = **pendente indefinidamente**, sem job de expiração (YAGNI). É limpa apenas por casamento (US2) ou por desfazer a conciliação de origem (US3). Auto-expiração e descarte manual ficam como follow-up. ⚠️ **A confirmar com a P.O.** se o acúmulo de pendências antigas vira problema operacional — se sim, abre-se follow-up para expiração/descarte.
- **Q2 — Tolerância de casamento (FR-008):** **valor exato + proximidade de data** (janela default ~5 dias corridos), reusando a lógica de score já existente (`match-score.ts`). Sem tolerância de valor (tarifa/IOF) neste MVP.
- **Q3 — Escopo de tipos (FR-009):** **só Transferência conta↔conta** nesta feature. Aplicação/Resgate (corrente↔aplicação) fica para follow-up (mesmo mecanismo, sinal oposto).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Contrapartida esperada surge na conta de destino (Priority: P1)

Ao conciliar uma transferência A→B (saída da conta A com conta de destino informada), o operador quer que a **contrapartida esperada** apareça sozinha na conta de destino B — mesmo valor, sinal oposto, mesma data aproximada, identificada como "outra perna da transferência de [Conta A] em [data]". Assim, ao olhar a conta B, ele já vê que há uma entrada esperada, sem precisar lançar nada manualmente.

**Why this priority**: É a base do fluxo de 1 lançamento e a fonte do vínculo A↔B. Sem a contrapartida esperada não há o que casar depois. Entrega valor imediato de visibilidade ("sei que vem uma entrada em B").

**Independent Test**: Registrar uma transferência A→B com conta de destino; verificar que a conta B passa a exibir uma contrapartida esperada pendente com valor igual, sinal oposto e vínculo à perna de origem.

**Acceptance Scenarios**:

1. **Given** uma transferência de R$ 1.000 da conta A com destino conta B, **When** o operador registra a conciliação da saída em A, **Then** a conta B passa a ter uma contrapartida esperada de +R$ 1.000 (sinal oposto), na mesma data, vinculada à transferência de A.
2. **Given** uma transferência sem conta de destino informada, **When** o operador registra, **Then** nenhuma contrapartida esperada é criada (comportamento atual preservado).
3. **Given** conta de destino igual à de origem, **When** registra, **Then** rejeita (`destination-same-as-source`) — sem criar contrapartida.

---

### User Story 2 - Casar a contrapartida com o extrato real em 1 clique (Priority: P1)

Quando o extrato da conta B é importado e traz o crédito/débito real da transferência, o operador quer que o sistema **sugira sozinho** o casamento entre a transação real e a contrapartida esperada ("outra perna da transferência de [Conta A]"), e que ao **confirmar em 1 clique** as duas pernas fiquem conciliadas e **vinculadas** — sem criar lançamento duplicado.

**Why this priority**: É o valor central da feature (fluxo de 1 lançamento, sem 2 conciliações desconexas). Sem isso, a contrapartida esperada da US1 ficaria pendente para sempre e o import geraria duplicidade.

**Independent Test**: Com uma contrapartida esperada em B (da US1), importar o extrato de B contendo a transação real correspondente; verificar que surge uma sugestão de casamento transação×contrapartida e que confirmá-la deixa as duas pernas conciliadas e vinculadas, sem duplicar.

**Acceptance Scenarios**:

1. **Given** uma contrapartida esperada de +R$ 1.000 em B, **When** o extrato de B é importado com um crédito real de R$ 1.000 na janela de data compatível, **Then** o sistema sugere o casamento transação×contrapartida rotulado como "outra perna da transferência de [Conta A]".
2. **Given** a sugestão de casamento das duas pernas, **When** o operador confirma, **Then** as duas pernas ficam conciliadas e vinculadas (trilha de auditoria liga A↔B) e **não** há lançamento duplicado.
3. **Given** o crédito real importado que casa com a contrapartida esperada, **When** o casamento é confirmado, **Then** a contrapartida esperada é consumida (deixa de estar pendente) — dedup: vincula, não cria uma segunda.

---

### User Story 3 - Desfazer a conciliação de origem trata a contrapartida (Priority: P2)

Se o operador **desfizer** a conciliação da perna de origem (A), o sistema deve tratar a contrapartida esperada correspondente em B de forma consistente — removendo-a se ainda pendente, ou reabrindo o vínculo se já casada — para não deixar dado órfão nem contagem dobrada.

**Why this priority**: Correção/segurança do dado. Não é o caminho feliz, mas evita inconsistência quando o operador erra e desfaz.

**Independent Test**: Criar a contrapartida (US1), desfazer a conciliação de origem, e verificar que a contrapartida pendente em B é removida (ou o vínculo reaberto se já casada).

**Acceptance Scenarios**:

1. **Given** uma contrapartida esperada ainda pendente em B, **When** a conciliação de origem em A é desfeita, **Then** a contrapartida esperada é removida de B.
2. **Given** as duas pernas já casadas e vinculadas, **When** a conciliação de origem é desfeita, **Then** o vínculo é reaberto de forma consistente (a perna de B volta a pendente ou o par é desfeito sem duplicar).

---

### Edge Cases

- **Extrato de B nunca chega:** a contrapartida esperada fica pendente indefinidamente (FR-011, Q1); limpa só por casamento ou por desfazer a origem. Sem job de expiração no MVP.
- **Import antes do registro manual:** o crédito real de B é importado **antes** de o operador registrar a transferência em A — não há contrapartida esperada ainda; o casamento das pernas não acende (comportamento atual: casa transação×título normalmente). Fora do escopo desta feature.
- **Valor divergente por tarifa:** a entrada real em B vem com valor levemente diferente (tarifa/IOF) — no MVP o casamento exige valor exato (FR-008, Q2), então não sugere; o operador concilia manualmente. Tolerância de valor = follow-up.
- **Múltiplas transferências de mesmo valor/data:** duas transferências A→B de R$ 1.000 no mesmo dia geram duas contrapartidas esperadas — o casamento deve evitar ambiguidade (empate estável / sugerir a mais antiga não consumida).
- **Conta de destino encerrada:** registrar transferência para conta `Closed` — comportamento atual já valida existência; encerrada não deve receber contrapartida (fail-closed).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Ao registrar a conciliação de uma transferência/aplicação/resgate com conta de destino informada, o sistema MUST criar na **conta de destino** uma **contrapartida esperada** pendente, com o **mesmo valor** e **sinal oposto** ao da perna de origem.
- **FR-002**: A contrapartida esperada MUST referenciar a mesma **data aproximada** da perna de origem e MUST ficar **vinculada** à transferência de origem (rastreabilidade A↔B).
- **FR-003**: O sistema MUST NÃO criar contrapartida quando a transferência não informa conta de destino (comportamento atual preservado) nem quando destino = origem.
- **FR-004**: A contrapartida esperada MUST aparecer na fila/visão de conciliação da conta de destino como item pendente, identificada como "outra perna da transferência de [Conta A] em [data]".
- **FR-005**: Ao importar o extrato da conta de destino, o motor de sugestão MUST considerar o casamento **transação real × contrapartida esperada** (além do atual transação × título).
- **FR-006**: A sugestão de casamento das duas pernas MUST ser rotulada de forma que o operador entenda tratar-se da outra perna da transferência de origem.
- **FR-007**: Ao confirmar o casamento, o sistema MUST deixar as **duas pernas conciliadas e vinculadas** e MUST NÃO criar lançamento duplicado (dedup: a transação real **consome** a contrapartida esperada em vez de gerar uma segunda).
- **FR-008**: O casamento transação×contrapartida MUST usar **valor exato + proximidade de data** (janela default ~5 dias corridos), reusando a lógica de score existente (`match-score.ts`); sem tolerância de valor por tarifa/IOF neste MVP (Q2).
- **FR-009**: O escopo MUST cobrir **apenas Transferência conta↔conta** nesta feature; Aplicação/Resgate (corrente↔aplicação) fica para follow-up com o mesmo mecanismo (Q3).
- **FR-010**: Ao **desfazer** a conciliação da perna de origem, o sistema MUST tratar a contrapartida esperada correspondente — removê-la se pendente, ou reabrir/desfazer o par de forma consistente se já casada — sem deixar dado órfão nem contagem dobrada.
- **FR-011**: A contrapartida esperada não casada MUST permanecer **pendente indefinidamente** (sem expiração automática neste MVP); é limpa apenas por casamento (US2) ou por desfazer a conciliação de origem (US3). Auto-expiração/descarte manual = follow-up, a confirmar com a P.O. (Q1).
- **FR-012**: A criação, o casamento e o desfazer da contrapartida MUST emitir eventos de domínio para a trilha de auditoria/outbox, mantendo o módulo como **produtor** de eventos (não altera o padrão de mensageria).

### Key Entities _(include if feature involves data)_

- **Contrapartida esperada (Expected Counterpart)**: representa a perna esperada de uma transferência na conta de destino. Atributos essenciais: conta de destino, valor, sinal (oposto ao da origem), data aproximada, vínculo à perna/transferência de origem, estado (pendente / casada / descartada). Relaciona-se 1:1 com a perna de origem e, quando casada, com a transação real importada.
- **Vínculo entre pernas (Transfer Link)**: a relação de auditoria que liga a perna de origem (conta A) à perna de destino (conta B) após o casamento — permite navegar A↔B.
- **Transação de extrato (existente)**: a transação real importada na conta de destino que, ao casar, consome a contrapartida esperada.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O operador registra uma transferência entre contas com **1 único lançamento** (em vez dos 2 atuais), e a outra perna aparece automaticamente na conta de destino.
- **SC-002**: Em ≥ 95% das transferências com extrato de destino compatível importado, o sistema sugere o casamento das duas pernas sem intervenção manual de busca.
- **SC-003**: Nenhuma transferência conciliada por este fluxo gera lançamento duplicado na conta de destino (0 duplicatas).
- **SC-004**: Após confirmar o casamento, o operador consegue navegar da perna de origem (A) para a de destino (B) e vice-versa pela trilha de auditoria.
- **SC-005**: Desfazer a conciliação de origem deixa o estado consistente (sem contrapartida órfã) em 100% dos casos.

## Impacto Arquitetural (core-api)

- **Bounded Contexts afetados**: [x] Financeiro (`fin_*`) — apenas. Não toca outros BCs.
- **Novos agregados / Value Objects?**: provável agregado/VO **Contrapartida esperada** (smart constructor + branded id + `Result<T,E>`); decisão de modelagem (entidade própria vs. transação marcada) fica no plano.
- **Novos eventos de domínio (outbox)?**: prováveis `TransferCounterpartCreated`, `TransferCounterpartMatched`, `TransferCounterpartDiscarded` (EN-passado) — contrato a registrar no plano/handbook. Módulo permanece **produtor**.
- **Novos subcomandos de CLI?**: N/A (CLI embutida aposentada — ADR-0037).
- **Borda HTTP envolvida?**: sim — evolução das rotas de conciliação existentes (`record-manual-entry`, sugestões, desfazer). Sem novo padrão; segue Fastify+Zod (ADR-0025/0027).
- **Possíveis violações da constituição (I–VIII)?**: nenhuma prevista. Sem migration proibida (ADR-0020); reusa reconciliation/bank-statement/cedente-account.

## Assumptions

- **Modelagem (HOW, decisão de plano):** a contrapartida esperada será modelada como um conceito de domínio do `financial` reusando reconciliation/bank-statement; a escolha entre "entidade própria" e "transação de extrato marcada como esperada/pendente" fica para o `/speckit-plan`.
- **Dedup por consumo:** o default é a transação real **consumir/vincular** a contrapartida esperada (não criar segunda); confirmado em FR-007.
- **Sinal determinado pelo tipo:** a perna de destino tem sinal oposto ao da origem (crédito em B quando débito em A), derivado do tipo (Transfer/Investment/Redemption).
- **Produtor de eventos apenas:** mantém a estratégia outbox-MySQL vigente; sem broker (YAGNI).
- **Depende de:** conciliação bancária (feature 017), extrato D+1/import (#59/#60), conta cedente (019) — todos já entregues na `dev`.
- **Pós-go-live:** não bloqueia o Lançar Documento (P.O. confirmou na issue #269).
