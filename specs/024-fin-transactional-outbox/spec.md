# Feature Specification: Outbox transacional do módulo Financeiro (atomicidade estado+evento)

**Feature Branch**: `024-fin-transactional-outbox`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Tornar atômicos estado-do-agregado + evento de domínio no financial (#127, ADR-0015). Hoje persiste estado e enfileira evento em duas operações separadas; crash entre as duas perde o evento. Achado: o financial NÃO tem outbox persistente (in-memory only, Fatia 1) — é preciso construir o outbox MySQL + gravar estado e evento na mesma transação."

## Clarifications

### Session 2026-06-22

- Q: O escopo da atomicidade estado+evento deve incluir a conciliação (confirm/undo), além dos 7 use-cases de documento? → A: **Sim — incluir a conciliação.** Decisão tomada após discussão de 3 especialistas com pesquisa nas referências/cânone: (1) **drizzle-orm-expert** — as duas `db.transaction` já existem (`document-repository.drizzle.ts:224`; `reconciliation-repository.drizzle.ts:51` em confirm/confirmManualEntry/undo); o INSERT no outbox encaixa como último passo de cada tx via helper `appendFinOutboxInTx`; custo marginal. (2) **mysql-database-expert** — trivial no DB (mesmo `FinancialMysqlHandle` ⇒ mesma transação MySQL, sem coordenação distribuída; rollback cobre estado+evento; `fin_outbox` espelha `ctr_outbox`/ADR-0015, PK `event_id` = idempotência, sem `ON DUPLICATE` por ADR-0020). (3) **DDD canônico** — a atomicidade é **propriedade do emissor, não condicionada a haver consumidor**: Vernon, _Implementing DDD_ (`ddd--vernon-livro-vermelho.md:7562`, "guaranteed to be consistent within a single, local transaction") + Newman, _Building Microservices_ (`building-microservices--sam-newman.md:2966`, dual-write problem). O escopo de princípio cobre **todas as fontes de evento** do módulo; a presença de consumidor só altera prioridade de rollout. Excluir a conciliação deixaria a janela de perda exatamente nos eventos cross-módulo (`PayableReconciled`/`ReconciliationUndone`) que motivam o ticket.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Evento de domínio é durável se e somente se o estado foi persistido (Priority: P1)

Quando uma operação de escrita do Financeiro é executada (lançar/editar/aprovar/cancelar documento, conciliar/desfazer conciliação), o **estado do agregado** e o **evento de domínio** correspondente passam a ser gravados de forma **tudo-ou-nada**: o evento existe de forma durável **se e somente se** o estado foi persistido. Hoje os dois são gravados em passos separados — uma falha entre eles deixa o estado salvo **sem** o evento, perdendo-o silenciosamente.

**Why this priority**: É a garantia central que o padrão outbox existe para dar (ADR-0015). Sem ela, qualquer consumidor que dependa desses eventos — em especial a **Conciliação cross-módulo** (eventos de título conciliado/desfeito) e projeções alimentadas pelo outbox — sofre **dessincronização garantida** no primeiro crash entre os dois passos. É latente hoje (Financeiro é majoritariamente produtor sem consumidor ativo), mas é pré-requisito de durabilidade para a próxima onda (transmissão bancária #58, conciliação #171).

**Independent Test**: executar uma operação de escrita do Financeiro com sucesso e verificar que **tanto** o estado **quanto** o evento ficaram registrados de forma durável; e, num cenário de falha na gravação do evento, verificar que **nem** o estado **nem** o evento permaneceram (contagem volta ao baseline).

**Acceptance Scenarios**:

1. **Given** uma operação de escrita do Financeiro que produz um evento de domínio, **When** ela conclui com sucesso, **Then** o estado do agregado e o evento ficam ambos registrados de forma durável (recuperáveis após reinício do sistema).
2. **Given** uma operação de escrita cuja **gravação do evento falha** (ex.: violação de restrição no registro do evento), **When** ela é executada, **Then** a operação inteira é revertida — o estado do agregado **não** permanece e o evento **não** é registrado — e o chamador recebe um erro de persistência (sem dado parcial).

---

### User Story 2 - Falha de persistência não vaza detalhe interno e preserva o estado anterior (Priority: P2)

Diante de uma falha na gravação (estado ou evento), o sistema reverte a operação inteira, **preserva o estado anterior** do agregado e devolve ao chamador um **erro de persistência padronizado** — sem expor exceções/detalhes internos.

**Why this priority**: Garante que a atomicidade não introduza estados parciais nem vaze erro interno (consistente com a política de erros do módulo). Complementa a US1 no caminho de falha.

**Independent Test**: injetar uma falha na gravação do evento e verificar que o estado anterior do agregado permanece intacto e que o chamador recebe o erro de persistência padronizado (não uma exceção crua).

**Acceptance Scenarios**:

1. **Given** um agregado já existente e uma nova escrita cujo registro de evento falha, **When** a operação é executada, **Then** o estado anterior do agregado é preservado e o chamador recebe o erro de persistência padronizado.

---

### Edge Cases

- **Operação sem evento**: uma escrita que não produz eventos de domínio deve persistir o estado normalmente (a atomicidade vale para o conjunto estado+eventos; conjunto de eventos vazio é válido).
- **Múltiplos eventos numa operação**: se uma operação produz mais de um evento, todos são gravados na mesma transação do estado (todos ou nenhum).
- **Idempotência do evento**: cada evento registrado tem identidade única (registro duplicado do mesmo evento não cria duplicata) — propriedade do outbox (ADR-0015).
- **Operações somente-leitura**: não são afetadas (não produzem eventos nem gravam estado).
- **Reversão (undo) de conciliação**: o desfazimento também emite evento e deve ser atômico com a reversão do estado.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Toda operação de escrita do Financeiro que produz evento(s) de domínio MUST gravar o estado do agregado e o(s) evento(s) de forma **atômica** — o(s) evento(s) ficam duráveis **se e somente se** o estado foi persistido (ADR-0015).
- **FR-002**: Uma falha na gravação do(s) evento(s) MUST reverter a operação inteira: o estado **não** persiste e o(s) evento(s) **não** ficam registrados; a contagem de agregados e de eventos volta ao baseline anterior à operação.
- **FR-003**: O sistema MUST passar a **registrar os eventos de domínio do Financeiro de forma durável** (hoje eles são mantidos apenas em memória efêmera, sem persistência) — pré-condição para a atomicidade ter efeito real.
- **FR-004**: Diante de falha de persistência, o chamador MUST receber um **erro de persistência padronizado** (slug interno), sem vazar exceção/`Error` ou detalhe técnico.
- **FR-005**: A atomicidade MUST valer para **todas** as operações de escrita do Financeiro que emitem evento de domínio — os 7 use-cases de documento (criar, rascunho, submeter rascunho, ajustar, aprovar, desfazer aprovação, cancelar) **E** as operações de **conciliação** (confirmar, confirmar-lançamento-manual, desfazer), que emitem os eventos cross-módulo `PayableReconciled`/`ReconciliationUndone` (resolvido — ver Clarifications 2026-06-22; atomicidade é propriedade do emissor, cobre todas as fontes de evento).
- **FR-006**: Cada evento durável MUST ter **identidade única** (idempotência — registro repetido não duplica), preservando a propriedade do outbox.
- **FR-007**: A mudança MUST permanecer no módulo Financeiro (`fin_*`) e não alterar o comportamento observável das operações no caminho de sucesso (mesmas respostas; muda apenas a garantia de durabilidade/atomicidade).
- **FR-008**: A solução MUST ser conformidade com o padrão de outbox já vigente (ADR-0015) e com o padrão já aplicado em outros módulos (estado + evento na mesma transação) — sem introduzir um novo padrão arquitetural.

### Key Entities _(include if feature involves data)_

- **Evento de domínio do Financeiro**: fato ocorrido (ex.: documento lançado/aprovado/cancelado, título conciliado/desfeito) que precisa ser registrado de forma durável para consumo futuro. Atributos-chave: identidade única, tipo, momento de ocorrência, dados do evento.
- **Registro de eventos durável (outbox)**: armazenamento persistente dos eventos emitidos, gravado na **mesma transação** do estado. Hoje inexistente no Financeiro (apenas memória efêmera); precisa ser introduzido.
- **Agregado do Financeiro**: documento fiscal / título / conciliação cujo estado é persistido. A operação de escrita combina mutação de estado + emissão de evento.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em 100% das operações de escrita do Financeiro que produzem evento, após uma execução bem-sucedida **ambos** (estado e evento) estão registrados de forma durável (recuperáveis após reinício).
- **SC-002**: Em 100% dos cenários de **falha na gravação do evento**, a operação reverte por completo: contagem de agregados e de eventos == baseline (nenhum estado parcial, nenhum evento órfão). Hoje: o estado persiste e o evento se perde.
- **SC-003**: 0 eventos de domínio do Financeiro perdidos por falha entre persistência de estado e registro de evento (eliminação da janela de perda).
- **SC-004**: Falhas de persistência retornam erro padronizado, sem vazamento de exceção/detalhe interno, em 100% dos casos.
- **SC-005**: Nenhuma regressão no caminho de sucesso das operações (respostas inalteradas); cobertura automatizada que falha se a atomicidade regredir (teste que injeta falha entre estado e evento).

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Financeiro (`fin_*`)
  - Único BC. **Introduz persistência de eventos no Financeiro** (registro durável de outbox, hoje inexistente — Fatia 1 manteve in-memory). Conformidade com **ADR-0015** (outbox MySQL: atomicidade via transação, durabilidade via tabela, idempotência via identidade única) — **sem novo ADR**.
- **Novos agregados / Value Objects?**: Nenhum agregado de negócio novo. Introduz o **registro durável de eventos** (infraestrutura), espelhando o que outros módulos já têm.
- **Novos eventos de domínio (outbox)?**: Não cria eventos novos — passa a **persistir** os já emitidos (documento e conciliação). Hoje vão para memória efêmera.
- **Mudança de schema / migration?**: **SIM** — introduz a tabela de outbox do Financeiro (`fin_*`) via migration (achado de recon: ela não existe; a issue assumia que sim). Ver plano. Aditiva, não-quebrante.
- **Borda HTTP envolvida?**: Não diretamente — a mudança é na fronteira transacional da camada de aplicação/persistência. As rotas existentes não mudam de contrato.
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma. Reforça ADR-0015. Sem 5º módulo, sem classe no domínio, sem JSON nativo MySQL. A atomicidade é exatamente o que a constituição pede para eventos cross-módulo.

## Assumptions

- **Escopo das operações** (resolvido — Clarifications 2026-06-22): **inclui a conciliação** (confirmar/confirmar-lançamento-manual/desfazer) além dos 7 use-cases de documento. Decisão fundamentada por discussão de especialistas (drizzle/mysql/DDD) — a atomicidade é propriedade do emissor e cobre todas as fontes de evento do módulo; a conciliação é a fonte dos eventos cross-módulo que motivam o ticket.
- **Threading dos eventos (HOW, para o plano)**: os use-cases do Financeiro produzem os eventos **após** chamar o repo, então a solução passa os eventos **para dentro** da operação do repo (`save`/`confirm`/`undo`), que os insere no `fin_outbox` na sua própria `db.transaction` — espelhando o `appendOutboxInTx` de contracts. Helper compartilhado `appendFinOutboxInTx` no adapter de persistência do Financeiro.
- **Construir agora** (decidido): apesar de o Financeiro ser hoje produtor-only (sem consumidor ativo), o registro durável é construído agora como **pré-requisito** da Conciliação cross-módulo e da próxima onda (#58/#171), e como conformidade com ADR-0015.
- **Sem mudança de contrato HTTP**: o caminho de sucesso das operações permanece idêntico para os chamadores; muda apenas a garantia interna de durabilidade/atomicidade.
- **Reuso do padrão existente**: a solução reusa o padrão já aplicado em outro módulo (estado + evento na mesma transação) — sem inventar abordagem nova.
- **Worker de entrega fora do escopo**: o consumo/entrega dos eventos (worker) não faz parte desta feature; o escopo é a **durabilidade atômica** na produção (a infraestrutura de worker já existe de forma genérica e é acionável depois).
