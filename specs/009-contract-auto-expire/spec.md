# Feature Specification: Expiração automática de contratos ao fim da vigência

**Feature Branch**: `feat/backlog-residual-sdd`

**Created**: 2026-06-11

**Status**: Draft

**Input**: Ticket `handbook/tickets/todo/CTR-CONTRACT-AUTO-EXPIRE.md` — contrato com vigência encerrada
permanece "Em Andamento" (Active) indefinidamente; a transição para "Finalizado" (Expired) existe mas só
é acionada manualmente. Caso observado: **CT 0776/2026** (`fim de vigência = 2026-06-10`), exibido como
"Em Andamento" no dia 10/06 e nos dias seguintes.

## Clarifications

### Session 2026-06-11

- Q: Escopo da borda D+1 — só na expiração automática ou também na guarda do encerramento manual? → A:
  **Só no sweep automático.** A guarda do domínio do encerramento manual (`/end {Expire}`) fica inalterada
  (continua permitindo finalizar no próprio dia da data-fim).
- Q: Qual fuso define o "hoje" do corte D+1? → A: **Persistência/instantes em UTC**, mas a **lógica do corte
  converte para o fuso de Brasília (UTC-3 fixo)** — o job calcula a data-corrente em America/Sao_Paulo
  (offset fixo `-03:00`, sem DST desde 2019) e aplica o D+1 sobre ela.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Contrato vencido aparece como Finalizado sem ação manual (Priority: P1)

Um gestor abre a lista (ou o detalhe) de um contrato cujo prazo de vigência já terminou. Hoje ele vê "Em
Andamento" para sempre, e teria de acionar manualmente o encerramento por expiração. O esperado é que o
sistema **finalize sozinho** o contrato assim que a vigência se encerra, refletindo "Finalizado" em
qualquer leitura, sem intervenção humana.

**Why this priority**: É o problema central relatado — o status nunca muda sozinho, distorcendo a visão
operacional (um contrato vencido continua contando como vigente). Entregar só isto já resolve a dor.

**Independent Test**: Criar um contrato com vigência que termina no passado (ou avançar o relógio do
sistema), rodar a operacionalização da expiração e confirmar que a lista/detalhe passam a reportar
"Finalizado" — sem nenhuma chamada manual de encerramento.

**Acceptance Scenarios**:

1. **Given** um contrato "Em Andamento" com fim de vigência já ultrapassado, **When** a expiração automática
   é executada, **Then** o contrato passa a "Finalizado" e a leitura (lista e detalhe) reflete o novo estado
   e o instante de encerramento.
2. **Given** o contrato CT 0776/2026 (fim 2026-06-10), **When** a data corrente é 2026-06-11 (ou posterior),
   **Then** ele consta como "Finalizado".
3. **Given** vários contratos vencidos ao mesmo tempo, **When** a expiração automática roda, **Then** todos
   são finalizados na mesma execução.

---

### User Story 2 - Expiração automática notifica os demais módulos (Priority: P2)

Quando um contrato é finalizado automaticamente, os consumidores que dependem desse fato (outros contextos
de negócio) precisam ser notificados — exatamente como acontece no encerramento manual. A expiração
automática **não pode** ser um "atalho silencioso" que muda o estado sem avisar ninguém.

**Why this priority**: Mantém a paridade com o encerramento manual e a consistência do sistema baseado em
eventos. Sem isto, a finalização automática divergiria do fluxo existente.

**Independent Test**: Disparar a expiração automática de um contrato e confirmar que o evento de domínio de
expiração é registrado para entrega aos consumidores, igual ao fluxo manual.

**Acceptance Scenarios**:

1. **Given** um contrato sendo finalizado automaticamente, **When** a transição ocorre, **Then** o evento de
   domínio de expiração é registrado para publicação (paridade com o encerramento manual).
2. **Given** a expiração automática rodando duas vezes seguidas, **When** o segundo ciclo executa, **Then**
   nenhum contrato já finalizado é reprocessado nem gera evento duplicado (idempotência).

---

### User Story 3 - Borda da data-fim "válido até o fim do último dia" (Priority: P3)

A regra de negócio do P.O. é que o contrato é **válido até o fim do último dia** de vigência. Logo, um
contrato cuja vigência termina hoje ainda é válido hoje; deve ser finalizado **a partir do dia seguinte**
(D+1) — e não no próprio dia da data-fim.

**Why this priority**: Refina a borda temporal para alinhar à convenção contratual. Sem isto, contratos
seriam finalizados um dia cedo demais (no próprio dia em que ainda valem).

**Independent Test**: Um contrato com fim de vigência = hoje permanece "Em Andamento" hoje e passa a
"Finalizado" amanhã.

**Acceptance Scenarios**:

1. **Given** um contrato com fim de vigência = data corrente, **When** a expiração automática roda hoje,
   **Then** ele permanece "Em Andamento".
2. **Given** o mesmo contrato, **When** a expiração roda no dia seguinte (D+1), **Then** ele passa a
   "Finalizado".

---

### Edge Cases

- **Vigência indefinida** (contrato sem data-fim): nunca expira automaticamente.
- **Estados não-elegíveis**: contratos em "Rascunho" (Pending), "Distratado" (Terminated) ou "Cancelado"
  (Cancelled) não são afetados pela expiração automática.
- **Idempotência**: executar o processo repetidamente (ou logo após o anterior) não causa erro nem efeitos
  duplicados.
- **Falha individual**: se a finalização de um contrato falhar (ex.: indisponibilidade momentânea), os
  demais contratos elegíveis ainda devem ser finalizados; a falha é registrada para nova tentativa.
- **Data de referência (fuso)**: o "hoje" que define o corte é a data-calendário no fuso de **Brasília
  (UTC-3 fixo)**, embora instantes sejam persistidos em UTC — ver Clarifications/Assumptions.
- **Contrato com aditivos**: a vigência considerada é a **vigência efetiva atual** (após aditivos
  homologados), não a original.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST finalizar automaticamente ("Em Andamento" → "Finalizado") todo contrato cuja
  vigência efetiva já se encerrou, sem exigir ação manual de um operador.
- **FR-002**: A finalização automática MUST reusar a mesma regra de negócio do encerramento por expiração
  já existente (sem duplicar lógica) e MUST registrar o evento de domínio de expiração para os consumidores
  cross-módulo, em paridade com o encerramento manual.
- **FR-003**: O sistema MUST NÃO afetar contratos em "Rascunho", "Distratado" ou "Cancelado", nem contratos
  com vigência indefinida (sem data-fim).
- **FR-004**: A borda da data-fim MUST seguir a convenção "válido até o fim do último dia": um contrato só é
  finalizado a partir do dia seguinte ao fim da vigência (D+1). A **data corrente** que define o corte MUST
  ser a data-calendário no fuso de **Brasília (UTC-3 fixo, sem DST)** — um contrato é elegível quando seu fim
  de vigência é **estritamente anterior** ao "hoje em Brasília" (instantes seguem sendo persistidos em UTC).
  Esta borda D+1 aplica-se **apenas à finalização automática**; a guarda do encerramento **manual**
  (`/end {Expire}`) permanece inalterada (permite finalizar no próprio dia da data-fim).
- **FR-005**: O processo de expiração automática MUST ser idempotente — execuções repetidas não produzem
  erros nem eventos/efeitos duplicados.
- **FR-006**: Após a finalização automática, as leituras de lista e de detalhe do contrato MUST refletir o
  estado "Finalizado" e o instante de encerramento.
- **FR-007**: O processo MUST processar em lote os contratos elegíveis e a falha na finalização de um
  contrato MUST NÃO impedir a finalização dos demais; falhas individuais são registradas para nova tentativa.
- **FR-008**: O processo MUST registrar (observabilidade) quantos contratos foram finalizados em cada
  execução, para auditoria/operação.
- **FR-009**: A finalização automática MUST considerar a **vigência efetiva atual** do contrato (resultante
  de aditivos homologados), não a vigência original.

### Key Entities _(include if feature involves data)_

- **Contrato**: já existente. Estados relevantes: "Em Andamento" (elegível), "Finalizado" (alvo),
  "Rascunho"/"Distratado"/"Cancelado" (não elegíveis). Possui **vigência efetiva** (data-início + data-fim,
  ou indefinida) e um **instante de encerramento** preenchido ao finalizar.
- **Evento de expiração**: já existente (emitido hoje no encerramento manual por expiração) — reaproveitado
  pela finalização automática.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos contratos "Em Andamento" com vigência efetiva encerrada (respeitada a borda D+1)
  constam como "Finalizado" nas leituras, sem qualquer ação manual.
- **SC-002**: O caso CT 0776/2026 (fim 2026-06-10) consta como "Finalizado" a partir de 2026-06-11.
- **SC-003**: Nenhum contrato em "Rascunho"/"Distratado"/"Cancelado" nem com vigência indefinida muda de
  estado por efeito desta feature (0 falsos positivos).
- **SC-004**: Executar o processo duas vezes seguidas não altera o resultado da segunda execução
  (idempotência) — 0 eventos duplicados.
- **SC-005**: O atraso entre o início da elegibilidade (D+1) e a finalização efetiva é de, no máximo, um
  ciclo do processo automático (ver Assumptions sobre cadência).

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Contratos (`ctr_*`) · [ ] Financeiro · [ ] Auth · [ ] Parceiros
  - Single BC — sem ofensa ao ADR-0014.
- **Novos agregados / Value Objects?**: Nenhum agregado novo. Reusa a transição `Contract.expire` (domínio
  existente) e os VOs `Period`/`PlainDate`. Provável **novo use case de aplicação** (varredura/expiração em
  lote) — orquestração, não regra nova.
- **Novos eventos de domínio (outbox)?**: Nenhum novo — reaproveita `ContractExpired` (já emitido pelo
  encerramento por expiração). Entrega via outbox (ADR-0015).
- **Novos subcomandos de CLI?**: N/A (CLI embutida removida — ADR-0037). O processo automático é hospedado
  fora da borda HTTP.
- **Borda HTTP envolvida?**: Por padrão **não** há nova rota pública (a finalização é um processo de fundo).
  Uma eventual rota operacional de disparo manual é decisão do plano (fora do escopo padrão).
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma prevista. Domínio puro (`Result<T,E>`, sem
  throw); MySQL único (ADR-0020); cross-módulo só por evento/public-api (ADR-0006).

## Assumptions

- **Cadência/gatilho** (decisão técnica, a confirmar no plano): o processo roda **periodicamente** num
  worker de fundo já existente (worker de outbox), por um tick agendado — não exige novo processo/serviço.
  SC-005 ("no máximo um ciclo de atraso") depende dessa cadência.
- **Abordagem**: **sweep agendado** (varre e finaliza, persistindo o estado e emitindo o evento), e **não**
  derivação de status por data apenas na leitura — esta última geraria estado divergente (banco continua
  "Em Andamento", evento nunca dispara) e foi descartada no ticket.
- **Data de referência (fuso) do corte D+1** _(resolvido — Clarifications 2026-06-11)_: instantes/persistência
  seguem **UTC**, mas o cálculo do corte converte o "hoje" para o **fuso de Brasília (UTC-3 fixo, `-03:00`,
  sem DST desde 2019)**. O job determina a data-corrente em America/Sao_Paulo e aplica o D+1 sobre ela.
- **Escopo da borda D+1** _(resolvido — Clarifications 2026-06-11)_: aplica-se **apenas à finalização
  automática**; a guarda do encerramento **manual** por expiração permanece como está (permite finalizar no
  próprio dia). Sem mudança no fluxo `/end {Expire}`.
- **Front**: nenhuma mudança — a UI reflete fielmente o status do backend; ao receber "Finalizado", atualiza
  sozinha.
