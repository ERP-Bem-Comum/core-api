# Feature Specification: Aposentadoria da pipeline W0→W3

**Feature Branch**: `038-retire-pipeline-w0w3`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Remover fisicamente do core-api toda a infraestrutura da pipeline W0→W3 — ferramenta, automação, dados e doutrina — porque ela deixou de servir ao desenvolvimento e passou a corromper o contexto das sessões de IA."

## Contexto do problema

O repositório acumulou um aparato de processo — a "pipeline W0→W3" — que hoje custa mais do que entrega. O custo não é hipotético; foi medido nesta worktree:

| Sintoma                                             | Medição                                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Estado de ticket alheio injetado em **todo** prompt | `.claude/hooks/inject-ticket-context.sh`, hook `UserPromptSubmit`                                   |
| Contexto fixo carregado em **toda** sessão          | `AGENTS.md` = 29.487 bytes (~8k tokens antes do primeiro caractere digitado)                        |
| Acervo versionado que polui busca e navegação       | 544 tickets · 3.436 arquivos · 3.429 rastreados no git · 16 MB                                      |
| Ferramenta sem consumidor em produção               | `scripts/pipeline/` (1.503 LOC) + `tests/pipeline/` (2.352 LOC), **zero** import a partir de `src/` |

A evidência mais direta do defeito: ao pedir a remoção da pipeline, o próprio pedido chegou contaminado com o estado do ticket `PIPELINE-STATE-WAVE-OVERRIDE`, que nada tinha a ver com a conversa. O aparato de processo passou a ser o principal poluidor do recurso que deveria proteger — a atenção de quem desenvolve, humano ou IA.

**Natureza da mudança:** subtrativa e reversível. Nenhuma linha de `src/` muda. O que sai é processo, automação de processo e dados de processo.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Conversar sem contaminação de contexto (Priority: P1)

Como desenvolvedor do core-api, quero abrir uma sessão de IA e falar sobre o assunto que eu escolhi, sem que estado de trabalho anterior seja colado automaticamente na minha mensagem.

**Why this priority**: É a dor aguda e a razão original do pedido. Entregue sozinha, já devolve a usabilidade do desenvolvimento assistido — mesmo que todo o resto da pipeline continue no disco. É também a fatia de menor risco: nenhum artefato é destruído, apenas a automação que os injeta é desligada.

**Independent Test**: Abrir uma sessão nova e enviar um prompt sobre qualquer assunto; verificar que nenhum bloco de estado de ticket, nome de ticket ou tabela de waves aparece anexado ao prompt nem ao boot da sessão.

**Acceptance Scenarios**:

1. **Given** o repositório com a automação de contexto de ticket removida, **When** o desenvolvedor envia um prompt qualquer, **Then** nenhum conteúdo derivado do acervo de tickets é anexado à mensagem.
2. **Given** uma sessão nova iniciando, **When** o boot da sessão executa, **Then** o resumo de abertura não menciona contagem de tickets, ticket ativo nem waves.
3. **Given** a linha de status da ferramenta, **When** ela é renderizada, **Then** ela segue exibindo modelo, branch, PR e custo, e deixa de exibir ticket ativo.
4. **Given** um subagente encerrando, **When** o encerramento é processado, **Then** nenhuma validação de fechamento de wave é executada.

---

### User Story 2 - Enxugar o contexto default (Priority: P2)

Como desenvolvedor, quero que o material carregado automaticamente em toda sessão descreva o que o projeto **é**, não um ritual que deixou de existir — para que a janela de contexto seja gasta com o código e não com procedimento.

**Why this priority**: É o segundo maior consumidor de contexto e a razão pela qual um assistente continuaria propondo abrir ticket e percorrer waves mesmo depois de a ferramenta sumir. Entregue sozinha, reduz o custo fixo de toda sessão e elimina instruções órfãs.

**Independent Test**: Medir o tamanho do material de contexto default antes e depois; verificar que nenhuma instrução remanescente manda abrir ticket ou percorrer waves.

**Acceptance Scenarios**:

1. **Given** o guia canônico do projeto, **When** ele é lido por completo, **Then** não existe seção instruindo a abrir ticket de processo nem a percorrer waves numeradas.
2. **Given** o estilo de resposta ativo, **When** ele é aplicado, **Then** ele não descreve disciplina de waves nem exige ticket para mudança de código.
3. **Given** o conjunto de skills e agentes disponíveis, **When** listado, **Then** não há skill cuja função seja orquestrar as waves.
4. **Given** a constituição do projeto, **When** lida, **Then** o princípio que institui a pipeline foi emendado e o documento não referencia comandos de estado de pipeline.
5. **Given** o gate de qualidade usado pelo fluxo de especificação, **When** acionado, **Then** ele continua funcionando e verificando tipos, formatação, lint e testes.

---

### User Story 3 - Remover a ferramenta e seus testes (Priority: P3)

Como mantenedor, quero que o código da ferramenta de pipeline e sua suíte saiam do repositório, para que ninguém precise mantê-los, tipá-los ou executá-los.

**Why this priority**: É a remoção mais visível, porém a de menor impacto sobre a dor relatada — 1.503 LOC de script não consomem contexto. Vem depois porque só faz sentido quando nada mais a invoca. Entregue sozinha, elimina custo de manutenção e encurta a suíte de testes.

**Independent Test**: Verificar que os comandos de pipeline não existem mais e que a bateria de qualidade fica verde sem eles.

**Acceptance Scenarios**:

1. **Given** o manifesto de scripts do projeto, **When** inspecionado, **Then** não há comando de estado, dashboard ou métricas de pipeline.
2. **Given** a suíte de testes, **When** executada por completo, **Then** ela passa e não inclui nenhum teste da ferramenta de pipeline.
3. **Given** a verificação de tipos, formatação e lint, **When** executada, **Then** todas ficam verdes.
4. **Given** qualquer arquivo executável do repositório (scripts, automações, configuração de editor, integração contínua), **When** buscado, **Then** não há invocação dos comandos de pipeline.

---

### User Story 4 - Evacuar o acervo para fora do repositório (Priority: P4)

Como dono do repositório, quero os 544 tickets preservados na íntegra, porém fora da árvore do projeto, para consultá-los quando eu quiser sem que apareçam em busca, navegação ou diff.

**Why this priority**: É a maior redução de ruído em volume, mas depende das anteriores para não deixar automação apontando para o vazio. Vem por último porque é a única fatia que mexe em dado histórico e exige verificação de integridade.

**Independent Test**: Comparar a contagem de arquivos na origem e no destino; confirmar ausência na árvore de trabalho e no índice de versionamento.

**Acceptance Scenarios**:

1. **Given** o acervo de 3.436 arquivos, **When** movido para o destino externo, **Then** a contagem no destino é idêntica à da origem e nenhum arquivo é perdido.
2. **Given** o repositório após a evacuação, **When** a árvore de trabalho é inspecionada, **Then** o diretório do acervo não existe.
3. **Given** o índice de versionamento, **When** consultado, **Then** nenhum dos 3.429 arquivos antes rastreados permanece rastreado.
4. **Given** a configuração de exclusão do versionamento, **When** o diretório é recriado por engano, **Then** ele não volta a ser rastreado.
5. **Given** o histórico de versionamento, **When** consultado em um commit anterior à remoção, **Then** o acervo continua recuperável.

---

### Edge Cases

- **Worktrees paralelos**: existem **11 worktrees ativos** em `.claude/worktrees/`, cada um com seu próprio checkout do acervo em branches que não recebem esta mudança. A remoção na branch corrente não os alcança — é preciso definir se são tratados agora, na integração de cada branch, ou ignorados até serem descartados.
- **ADRs são imutáveis e citam a pipeline**: `0018` e `0034` linkam caminhos dentro do acervo; `0054` afirma que código assistido por IA percorre "a mesma Pipeline W0→W3". Editar ADR aceito é proibido pela hierarquia de regras — os links passarão a apontar para conteúdo fora do repositório e o `0054` ficará referenciando um processo extinto.
- **Ticket em curso**: `PIPELINE-STATE-WAVE-OVERRIDE` está com W2 em andamento (round 2/3). A remoção o abandona no estado atual, dentro do acervo evacuado.
- **Gate de qualidade compartilhado**: a verificação de tipos/formatação/lint/testes é acionada por hook obrigatório do fluxo de especificação. Ela precisa sobreviver à remoção do vocabulário de waves, sob pena de quebrar o processo que substitui a pipeline.
- **Histórico de features entregues**: cerca de 40 arquivos em `specs/*/` registram comandos de pipeline como parte de execuções já concluídas. Reescrevê-los falsificaria o registro do que de fato foi feito.
- **Memória do assistente fora do repositório**: existe memória persistente instruindo "sempre pipeline W0→W3 completa". Ela vive fora da árvore versionada e sobreviverá à remoção se não for tratada.
- **Recriação acidental**: qualquer automação futura que crie `.claude/.pipeline/` deve encontrar o caminho bloqueado, não silenciosamente versionado de novo.
- **Repositório declarado `bare` com árvore populada** ⚠️: a configuração corrente marca `core.bare = true` embora exista árvore de trabalho completa e branch ativa. Qualquer operação de índice — inspecionar mudanças, remover do versionamento, commitar — falha com `this operation must be run in a work tree`. Isso **bloqueia FR-019, FR-021 e FR-023** enquanto não for resolvido, e precisa ser endereçado no plano antes da evacuação do acervo. Provável resíduo do arranjo de worktrees; a correção é decisão do dono do repositório, não efeito colateral desta feature.

## Requirements _(mandatory)_

### Functional Requirements

**Automação de contexto (US1)**

- **FR-001**: O sistema MUST deixar de anexar qualquer conteúdo derivado do acervo de tickets às mensagens do usuário.
- **FR-002**: O sistema MUST deixar de varrer o acervo de tickets na inicialização de sessão, preservando as demais informações úteis de boot.
- **FR-003**: O sistema MUST deixar de validar fechamento de wave ao encerrar subagentes.
- **FR-004**: A linha de status MUST preservar modelo, branch, PR e custo, e MUST deixar de resolver e exibir ticket ativo.
- **FR-005**: A configuração de automação MUST não conter registro ativo de nenhum gancho removido.

**Doutrina e contexto default (US2)**

- **FR-006**: O guia canônico do projeto MUST não instruir abertura de ticket de processo nem execução de waves numeradas.
- **FR-007**: O estilo de resposta ativo MUST não descrever a disciplina de waves.
- **FR-008**: A skill de orquestração de waves MUST ser removida.
- **FR-009**: O agente de roteamento MUST não orquestrar waves.
- **FR-010**: As skills de revisão e de gate de qualidade MUST ser preservadas em função, desvinculadas do vocabulário de waves — o gate de qualidade MUST continuar operante para o fluxo de especificação.
- **FR-011**: A constituição do projeto MUST ter emendado o princípio que institui a pipeline, preservando a exigência de teste antes de código e a política de regressão zero como disciplina, sem ritual de ticket.
- **FR-012**: Os artefatos de template e configuração do fluxo de especificação MUST não depender de comandos de pipeline.
- **FR-013**: A documentação de entrada do projeto MUST refletir o fluxo real de trabalho após a remoção.

**Ferramenta (US3)**

- **FR-014**: O código da ferramenta de pipeline e sua suíte de testes MUST ser removidos do repositório.
- **FR-015**: Os comandos de pipeline MUST ser removidos do manifesto de scripts.
- **FR-016**: Nenhum arquivo executável do repositório MUST invocar comandos de pipeline ou caminhos da ferramenta.
- **FR-017**: A remoção MUST NOT alterar nenhum arquivo sob `src/`.

**Acervo (US4)**

- **FR-018**: O acervo MUST ser movido integralmente para fora da árvore do repositório, sem perda, com verificação de integridade por contagem de arquivos.
- **FR-019**: O acervo MUST ser removido do controle de versão e da árvore de trabalho.
- **FR-020**: A configuração de exclusão MUST impedir que o acervo volte a ser versionado.
- **FR-021**: O conteúdo do acervo MUST permanecer recuperável pelo histórico de versionamento em commits anteriores à remoção.

**Rastreabilidade e reversibilidade (transversal)**

- **FR-022**: A remoção MUST ser registrada em um ADR que documente a aposentadoria da pipeline e reconcilie a leitura dos ADRs aceitos que a referenciam, sem editar nenhum ADR existente.
- **FR-023**: A mudança MUST ser entregue em commits atômicos por camada, permitindo reverter qualquer camada isoladamente.
- **FR-024**: Registros históricos de features já entregues MUST ser preservados como estão, sem reescrita retroativa.

### Key Entities

- **Ferramenta de pipeline**: o executável de processo — comandos de estado, dashboard e métricas — e sua suíte de testes. Sem consumidor em produção.
- **Acervo de tickets**: 544 diretórios de trabalho concluído, com pedido, relatórios de teste, implementação, revisão e qualidade. Valor: auditoria histórica. Custo: 16 MB de ruído versionado.
- **Automação de contexto**: os ganchos e a linha de status que leem o acervo e injetam seu estado nas sessões. Origem direta da contaminação.
- **Doutrina**: o guia canônico, o estilo de resposta, a constituição, a skill de orquestração e o agente de roteamento — o que faz um assistente insistir no ritual mesmo sem ferramenta.
- **Registro histórico**: ADRs aceitos e specs de features entregues que citam a pipeline. Imutáveis ou congelados por natureza.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Um prompt enviado em sessão nova chega ao assistente com **zero** conteúdo injetado a partir de trabalho anterior — hoje, 100% dos prompts recebem injeção.
- **SC-002**: O material de contexto carregado automaticamente em toda sessão encolhe de forma mensurável; o tamanho antes e depois é reportado em bytes na entrega.
- **SC-003**: A busca por invocações de pipeline em arquivos executáveis retorna **zero** ocorrências.
- **SC-004**: Nenhuma automação ativa lê o acervo de tickets — verificável por inspeção da configuração de ganchos e da linha de status.
- **SC-005**: A bateria completa de qualidade (tipos, formatação, lint, testes) fica **verde** ao final, sem os testes da ferramenta removida.
- **SC-006**: A árvore de trabalho perde **16 MB** e **3.429 arquivos rastreados**, com 100% do conteúdo verificado no destino externo.
- **SC-007**: Nenhum arquivo sob `src/` aparece no diff da entrega.
- **SC-008**: Qualquer camada da remoção pode ser revertida isoladamente, sem desfazer as demais.
- **SC-009**: Uma sessão nova iniciada após a entrega não propõe abrir ticket nem percorrer waves ao receber um pedido de mudança de código.

## Impacto Arquitetural (core-api)

- **Bounded Contexts afetados**: **nenhum**. A mudança é inteiramente de ferramentaria de processo, documentação e automação de sessão. Não toca Contratos (`ctr_*`), Financeiro (`fin_*`), Auth (`auth_*`) nem Parceiros (`partners_*`). O isolamento do ADR-0014 não é exercitado.
- **Novos agregados / Value Objects**: N/A — nenhuma mudança de domínio.
- **Novos eventos de domínio (outbox)**: N/A.
- **Borda HTTP envolvida**: N/A — nenhuma rota criada, alterada ou removida.
- **Possíveis violações da constituição (I–VIII)**: **sim, deliberada e central à feature.** O Princípio I ("TDD fail-first em pipeline W0→W3", marcado NÃO-NEGOCIÁVEL) institui exatamente o que esta spec remove. A feature não o contorna em silêncio: ela o **emenda explicitamente** (FR-011), preservando o núcleo defensável — teste antes de código, e a política de regressão zero do Princípio II, que permanece **intacta** — e descartando o ritual de ticket e a numeração de waves. Nenhum ADR aceito institui a pipeline (as menções em `0018`, `0034`, `0042`, `0050`, `0054` são referenciais, não normativas), portanto não há ADR a superseder; ainda assim, FR-022 exige um ADR novo que registre a decisão e reconcilie a leitura do `0054`.

## Assumptions

Decisões tomadas por default razoável na ausência de instrução explícita. Todas são revisáveis via `/speckit-clarify`.

- **Destino do acervo**: um diretório irmão, fora da árvore do repositório e fora de qualquer worktree, preservando a estrutura interna. O usuário declarou que tratará do acervo separadamente depois; a spec garante preservação e integridade, não organização final.
- **TDD sobrevive ao ritual**: o pedido foi contra o **aparato** (ticket, waves, estado, injeção de contexto), não contra testar antes de codar. O Princípio I é emendado para preservar a disciplina de teste-primeiro e perder a burocracia. A política de regressão zero (Princípio II) permanece integralmente.
- **Gate de qualidade preservado**: `ts-quality-checker` e `code-reviewer` são mantidos e desvinculados do vocabulário de waves, e não removidos — o gate de qualidade é acionado por hook obrigatório do fluxo de especificação e sua remoção quebraria o processo que substitui a pipeline.
- **Histórico congelado**: os ~40 arquivos em `specs/*/` que citam comandos de pipeline ficam como estão. São registro do que foi feito à época; reescrevê-los falsificaria o histórico. Vale o mesmo para os ADRs, imutáveis por regra.
- **Worktrees tratados na integração**: os 11 worktrees ativos recebem a remoção quando suas branches integrarem a linha principal, não por intervenção direta nesta entrega — evita conflito em trabalho em andamento.
- **Memória do assistente**: a memória persistente que instrui "sempre pipeline W0→W3 completa" vive fora do repositório e será corrigida junto à entrega, ainda que não seja artefato versionado.
- **Sem ticket de pipeline para esta feature**: a remoção não abre ticket W0→W3 — seria autorreferente. O fluxo de especificação (`/speckit-plan` → `/speckit-tasks` → `/speckit-implement`) é o veículo, com o gate de qualidade ao final.
- **Integração contínua não afetada**: verificado que nenhum workflow de CI invoca comandos de pipeline; nenhuma mudança de CI é esperada.
