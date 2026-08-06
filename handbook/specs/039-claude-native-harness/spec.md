# Feature Specification: Consolidação do harness nas primitivas nativas do Claude Code

**Feature Branch**: `039-claude-native-harness`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Consolidar o harness de engenharia do core-api exclusivamente nas primitivas nativas do Claude Code, avaliando a remoção do spec-kit (`.specify/` + workflow próprio `core-api-sdd`)."

---

## Contexto medido _(evidência coletada antes de especificar)_

Esta seção registra **fatos verificados em 2026-07-30**, para que a decisão seja tomada por evidência
e não por preferência estética. Cada linha é reproduzível pelo comando indicado.

### O que o spec-kit promete

Fonte: <https://github.github.io/spec-kit/index.html>.

| Afirmação da fonte                                                         | Consequência para este repo                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| _"Switch freely between agents with a single command. No lock-in"_         | É a **proposta de valor central** do produto          |
| 35 integrações (Copilot, Gemini, Claude…) + integração `generic`           | Portabilidade é o eixo do design                      |
| Instalação por `uv tool install specify-cli`                               | Toolchain **Python**, fora da stack Node/pnpm do repo |
| Artefatos em `.specify/` e `specs/`; fluxo Spec → Plan → Tasks → Implement | Camada de processo paralela à do agente               |

### O que este repo realmente usa

| Fato                                                                | Valor               | Como verificar                                                             |
| ------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| Integrações do spec-kit instaladas                                  | **1** (claude)      | `.specify/init-options.json` → `"integration": "claude"`, `"ai": "claude"` |
| Tamanho de `.specify/`                                              | 336 KB, 50 arquivos | `du -sh .specify && find .specify -type f \| wc -l`                        |
| Skills `speckit-*` no inventário                                    | **15 de 42** (36%)  | `ls -1d .claude/skills/speckit-*/ \| wc -l`                                |
| Front-matter das `speckit-*` (entra na listagem de **toda** sessão) | **5.578 bytes**     | soma do front-matter de `.claude/skills/speckit-*/SKILL.md`                |
| Corpo das `speckit-*` (entra sob demanda, ao invocar)               | **121.279 bytes**   | `cat .claude/skills/speckit-*/SKILL.md \| wc -c`                           |
| Workflow próprio `core-api-sdd`                                     | 232 linhas          | `wc -l .specify/workflows/core-api-sdd/workflow.yml`                       |
| Scripts PowerShell versionados                                      | **4**               | `find .specify -name '*.ps1'` — o repo é macOS/Linux                       |

> **Honestidade de escala:** 336 KB **não** é o caso da spec 038. Lá o argumento era volume e injeção
> compulsória (16 MB, 3.436 arquivos, hook em 100% dos prompts). Aqui o volume é modesto e o
> carregamento das skills é **sob demanda**. O caso desta spec **não é tamanho** — é _(a)_ valor
> central não exercido, _(b)_ doutrina que afirma falsidades e _(c)_ duplicação de fonte de verdade.
> Qualquer argumento baseado só em bytes deve ser **rejeitado** na revisão.

### Doutrina que já afirma o falso _(o achado mais grave)_

| Onde                                                      | O que afirma                                                                                        | Realidade                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `.specify/memory/constitution.md:11-17` (Princípio **I**) | "TDD fail-first em **pipeline W0→W3** (NÃO-NEGOCIÁVEL)", manda rodar `pnpm run pipeline:state init` | A CLI foi **removida** (commit `6362709d`); o comando falha    |
| `.specify/memory/constitution.md:86`                      | "CLI (Fastify **reservado**)"                                                                       | Fastify está **ativo** (ADR-0025) e é a UX primária (ADR-0037) |
| `.specify/memory/constitution.md:95`                      | "`pnpm run pipeline:status` para o dashboard"                                                       | Script inexistente                                             |
| `.specify/templates/spec-template.md:132`                 | "Novos subcomandos de CLI? — CLI é a **UX primária da Fase 1**"                                     | CLI embutida **aposentada** (ADR-0037)                         |
| `.specify/templates/spec-template.md:133`                 | "Borda HTTP envolvida? — normalmente **NÃO**; Fastify é Fase 2+ e exige ADR"                        | Contradiz o **Princípio VII da própria constituição**          |

O Princípio I é o problema estrutural: a constituição do spec-kit **institui** a pipeline que a spec
038 está aposentando, e o `/speckit-plan` roda um "Constitution Check" contra os princípios I–IX.
Enquanto o Princípio I existir como está, **todo plano futuro é checado contra um aparato morto**.

### Primitivas nativas equivalentes

Fonte: <https://code.claude.com/docs/en/overview>, `llms.txt` e `docs/en/workflows`.

| Capacidade usada via spec-kit            | Primitiva nativa equivalente                 | Equivalência                                                                                   |
| ---------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Slash commands (`/speckit-*`)            | Skills (`.claude/skills/`)                   | Direta — as `speckit-*` **já são** skills                                                      |
| Orquestração multi-fase (`core-api-sdd`) | **Dynamic workflows** (`.claude/workflows/`) | Direta — _"A workflow moves the plan into code"_; `agent()`/`pipeline()`, `args`, resume, caps |
| Doutrina/princípios (`constitution.md`)  | `AGENTS.md` + `.claude/rules/`               | Direta — e o repo **já** tem os dois                                                           |
| Gate de qualidade (`speckit.verify`)     | Skill + hooks (`Stop`, `PostToolUse`)        | Direta                                                                                         |
| Auto-commit por fase (extensão `git`)    | Hooks nativos                                | Direta                                                                                         |
| Planejamento profundo                    | Plan mode, `/ultraplan`                      | Direta                                                                                         |
| Revisão                                  | `/ultrareview`, `/code-review`, subagents    | Direta                                                                                         |
| Templates de artefato                    | Skills com `references/`                     | Direta                                                                                         |
| **Portabilidade entre 35 agentes**       | _(nenhuma — por design)_                     | **Sem equivalente**                                                                            |

A última linha é a única capacidade que só o spec-kit entrega. A decisão inteira depende de essa
capacidade ter ou não valor para este repositório.

> **Drift na referência offline:** `handbook/reference/claude-code/` tem 102 arquivos mas **não tem
> `workflows.md`**. A referência local está defasada exatamente na primitiva que compete com o SDD —
> ou seja, o repo vinha decidindo sem conhecer a alternativa nativa.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Decidir com evidência, não por gosto (Priority: P1)

Como responsável pelo repositório, quero um parecer que responda _"o spec-kit entrega algo que as
primitivas nativas não entregam?"_ com inventário, mapeamento e números verificáveis, para decidir
manter ou remover sem depender de intuição.

**Why this priority**: É o único item que entrega valor mesmo se a decisão final for **não remover
nada**. Todas as outras histórias dependem desta ter concluído.

**Independent Test**: Existe um documento que, para cada capacidade do spec-kit em uso, aponta a
primitiva nativa equivalente ou registra explicitamente que não há equivalente — e um leitor sem
contexto prévio consegue reproduzir cada número citado pelo comando indicado.

**Acceptance Scenarios**:

1. **Given** o parecer pronto, **When** um revisor escolhe qualquer afirmação quantitativa, **Then** o comando indicado reproduz o valor.
2. **Given** o parecer pronto, **When** o revisor procura a opção "não remover", **Then** ela está avaliada com as condições que a tornariam correta, não descartada de saída.
3. **Given** o mapeamento, **When** alguma capacidade não tiver equivalente nativo, **Then** isso está registrado como tal, e não omitido.

---

### User Story 2 - Parar de instruir agentes com doutrina falsa (Priority: P2)

Como operador do repositório, quero que nenhum documento de processo mande rodar comando inexistente
nem afirme estado contrário aos ADRs, para que um agente novo não seja induzido ao erro logo no boot.

**Why this priority**: Entrega valor **independentemente** da decisão sobre remover o spec-kit — se a
decisão for mantê-lo, a doutrina precisa ser corrigida do mesmo jeito. É a fatia com melhor razão
valor/risco.

**Independent Test**: Nenhum arquivo de processo cita `pnpm run pipeline:*`, "Fastify reservado" ou
"CLI é a UX primária" como estado presente; e o `Constitution Check` não valida contra um princípio
que institui aparato removido.

**Acceptance Scenarios**:

1. **Given** o repo após a correção, **When** se busca por comandos de pipeline em documentos de processo, **Then** não há ocorrência que os apresente como executáveis.
2. **Given** o Princípio I, **When** se compara com o estado real do repo, **Then** não há contradição.
3. **Given** o `spec-template.md`, **When** se compara sua seção de impacto arquitetural com ADR-0025/0037, **Then** não há contradição.

---

### User Story 3 - Um único lugar para o processo (Priority: P3)

Como agente operando o repo, quero que exista **uma** fonte de verdade para o fluxo de trabalho, para
não ter de reconciliar a doutrina do `AGENTS.md` com a de `.specify/memory/constitution.md`.

**Why this priority**: É o ganho estrutural, mas depende das decisões da US1 e só é seguro depois que
a US2 eliminou as afirmações falsas.

**Independent Test**: Para qualquer regra de processo, existe exatamente um arquivo canônico; os
demais referenciam em vez de repetir.

**Acceptance Scenarios**:

1. **Given** um princípio de processo, **When** se procura sua definição, **Then** ela existe num único arquivo e os outros apontam para ele.
2. **Given** o fluxo que sobreviver, **When** ele for invocado, **Then** funciona pelas primitivas nativas, sem depender de toolchain externa.

---

### User Story 4 - Reverter sem perda (Priority: P4)

Como responsável, quero que tudo que sair do repo esteja preservado e que a remoção seja revertível
por camada, para poder desfazer se a decisão se mostrar errada.

**Why this priority**: Rede de segurança. Não entrega valor sozinha, mas sem ela as outras não podem
ser executadas com confiança.

**Independent Test**: O material removido é recuperável integralmente, e existe procedimento
documentado de reversão que foi executado ao menos uma vez em ensaio.

**Acceptance Scenarios**:

1. **Given** a remoção concluída, **When** se compara o arquivado com o estado anterior, **Then** nenhum arquivo foi perdido.
2. **Given** o procedimento de reversão, **When** ele é executado, **Then** o repo volta ao estado funcional anterior.

---

### User Story 5 - Entregar o aprendizado dos ADRs no ponto de edição (Priority: P2)

Como agente editando um arquivo, quero receber o aprendizado dos ADRs que se aplica **àquele path**,
no momento em que edito, para não repetir um erro que o repositório já decidiu como evitar — sem
precisar ter lido 55 ADRs antes.

**Why this priority**: Empata com a US2 em prioridade e é o item de **maior valor duradouro** desta
spec. As demais histórias removem passivo; esta cria ativo. Hoje os ADRs são normativos e imutáveis,
mas passivos: só agem se alguém souber abrir o arquivo certo na hora certa.

**Caso que motiva** (verificado em 2026-07-30): o ADR-0044 decide que o valor brandado de `Cnpj` é
`^[0-9A-Z]{12}[0-9]{2}$` — **pode conter letras** — e lista como consequência que "camadas que
assumiam só dígitos precisam revisão". Nenhuma rule carrega esse aprendizado e não há enforcement
mecânico (`grep -rin cnpj .claude/rules/ eslint.config.js`). Quem escrever hoje um export, uma
máscara ou um regex sobre CNPJ não é avisado de nada.

**Independent Test**: Para uma amostra de ADRs que geram regra, editar um arquivo do path alvo faz o
aprendizado ser carregado; e para cada um dos 55 ADRs existe veredito registrado (gera / não gera /
já coberto).

**Acceptance Scenarios**:

1. **Given** os 55 ADRs, **When** a destilação termina, **Then** cada ADR tem veredito explícito e justificado.
2. **Given** uma regra derivada de ADR, **When** ela é lida, **Then** cita o ADR de origem e não reproduz seu corpo.
3. **Given** um aprendizado já garantido por `eslint`/`tsc`/hook, **When** avaliado, **Then** é registrado como coberto e **não** vira texto de rule.
4. **Given** o conjunto final de rules, **When** se compara com o inicial, **Then** cada linha acrescentada tem justificativa individual, e o crescimento não decorre de completude.
5. **Given** um ADR superseded no futuro, **When** se procura o que precisa mudar, **Then** a citação na rule permite localizar o ponto sem varrer o repo.

---

### Edge Cases

- **A spec 038 está em curso e não commitada.** Esta feature toca `.specify/memory/constitution.md`, que a 038 também precisa emendar (Princípio I). O que acontece se as duas editarem o mesmo arquivo?
- **`.specify/feature.json` é ponteiro único de feature corrente.** Criar esta spec o reaponta de `038` para `039`. Como a 038 retoma seu lugar?
- **`speckit.verify` é `optional: false`** em `after_implement`. Removê-lo sem substituto deixa o fluxo sem gate obrigatório de qualidade.
- **O Princípio IX depende do MCP `acdg-skills`.** Se a constituição sair, onde vive a exigência de citação canônica?
- O que acontece se, no futuro, o repo precisar de outro agente além do Claude Code?
- E se o spec-kit upstream lançar recurso sem equivalente nativo depois da remoção?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A investigação MUST inventariar cada componente de `.specify/` e declarar sua função.
- **FR-002**: A investigação MUST mapear cada capacidade em uso para a primitiva nativa equivalente, ou registrar explicitamente a ausência de equivalente.
- **FR-003**: A investigação MUST avaliar a opção de **não remover**, declarando as condições que a tornariam a escolha correta.
- **FR-004**: Toda afirmação quantitativa MUST vir acompanhada do comando que a reproduz.
- **FR-005**: Nenhum documento de processo MUST apresentar como executável um comando que não existe.
- **FR-006**: Nenhum documento de processo MUST afirmar estado que contradiga ADR aceito.
- **FR-007**: O Princípio I da constituição MUST deixar de instituir a pipeline W0→W3, sem que TDD como disciplina e a Política de Regressão Zero sejam enfraquecidos.
- **FR-008**: Todo material removido do repo MUST ser preservado fora dele, sem perda.
- **FR-009**: A remoção MUST ser revertível por camada, com procedimento documentado.
- **FR-010**: Nenhuma mudança MUST ocorrer em `src/`.
- **FR-011**: A entrega MUST ser sequenciada de modo a não conflitar com a spec 038 em curso.
- **FR-012**: Se a decisão exigir emenda de princípio, ela MUST ser instituída por ADR novo, não por edição direta.
- **FR-013**: O gate de qualidade (`typecheck` + `format:check` + `lint` + `test`) MUST continuar obrigatório qualquer que seja a decisão.
- **FR-014**: A referência offline `handbook/reference/claude-code/` MUST ser atualizada com a documentação da primitiva `workflows`.
- **FR-015**: O `.specify/` MUST ser removido por inteiro, e toda capacidade que sobreviva MUST estar reimplementada em primitiva nativa **antes** de o original sair. _(decidido em 2026-07-30)_
- **FR-016**: Os princípios da constituição MUST ser absorvidos por `AGENTS.md` e `.claude/rules/`, com verificação, princípio a princípio, de que a norma foi preservada — nenhum princípio pode desaparecer sem destino explícito. _(decidido em 2026-07-30)_
- **FR-017**: O fluxo Spec→Plan→Tasks→Implement MUST ser reimplementado como skills próprias encadeadas, preservando o **gate humano entre fases**. Dynamic workflows MUST NOT ser o substituto do fluxo, porque não admitem input mid-run — a doc oficial manda rodar cada fase como workflow separado para obter sign-off. _(decidido em 2026-07-30)_

#### Destilação dos ADRs em regras path-scoped

- **FR-018**: Os 55 ADRs aceitos MUST ser lidos integralmente e cada um MUST receber um veredito explícito: gera regra, não gera, ou já está coberto.
- **FR-019**: Um aprendizado de ADR MUST virar linha de `.claude/rules/<camada>.md` **somente** se passar nos três testes: _(a)_ é acionável no momento em que se edita o path alvo; _(b)_ não é já enforced mecanicamente por `eslint`/`tsc`/hook; _(c)_ cabe em referência ao ADR, sem reproduzir seu conteúdo.
- **FR-020**: Nenhuma rule MUST reproduzir o corpo de um ADR. Regra duplicada passa a mentir quando o ADR é superseded — é o mecanismo que produziu o Princípio I obsoleto.
- **FR-021**: Toda linha de rule derivada de ADR MUST citar o ADR de origem, para que a rule seja auditável contra a fonte.
- **FR-022**: Aprendizado que **já é** enforced mecanicamente MUST NOT virar rule; MUST ser registrado como coberto, indicando o mecanismo que o garante.
- **FR-023**: Aprendizado acionável que **não** é enforced e **poderia** ser MUST ser registrado como candidato a enforcement mecânico, em vez de virar só texto.
- **FR-024**: O conjunto final de rules MUST permanecer proporcional ao seu custo de contexto: rules carregam ao tocar o path, então crescimento MUST ser justificado item a item, não por completude.
- ~~**FR-025**: O symlink `.agents/skills` MUST ser preservado.~~ **REVOGADO em 2026-07-31** — o dono decidiu que **Claude Code é o único agente suportado**. O symlink foi removido; não há mais mecanismo de descoberta para outros agentes.
- ~~**FR-026**: A entrega MUST NOT reduzir a portabilidade efetiva entre agentes.~~ **REVOGADO em 2026-07-31** — portabilidade multi-agente deixou de ser objetivo. O repo passa a otimizar para um consumidor só.

### Key Entities

- **Aparato de processo**: conjunto de arquivos que instrui como se trabalha no repo, sem ser código de produção. Hoje: `.specify/`, `.claude/`, `handbook/process/` e o resíduo da pipeline.
- **Capacidade**: função que o aparato entrega (orquestrar fases, guardar doutrina, aplicar gate, versionar artefato).
- **Primitiva nativa**: mecanismo do Claude Code que entrega uma capacidade sem camada intermediária.
- **Doutrina**: afirmação normativa sobre como trabalhar. Tem exatamente um dono canônico.
- **Acervo**: material preservado fora do repo, recuperável, não versionado aqui.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das afirmações quantitativas do parecer são reproduzíveis pelo comando citado.
- **SC-002**: Zero documentos de processo apresentam comando inexistente como executável (hoje: **4** ocorrências identificadas).
- **SC-003**: Zero contradições entre documento de processo e ADR aceito (hoje: **3** identificadas).
- **SC-004**: Para cada regra de processo existe **exatamente um** arquivo canônico; nenhuma regra é definida em dois lugares.
- **SC-005**: 100% do material removido é recuperável a partir do acervo.
- **SC-006**: O procedimento de reversão é executado com sucesso em ensaio antes de a remoção ser considerada concluída.
- **SC-007**: `src/` permanece byte-idêntico do início ao fim da entrega.
- **SC-008**: O gate de qualidade permanece verde ao fim de cada camada entregue.
- **SC-009**: Uma pessoa ou agente sem contexto prévio consegue descobrir como se trabalha no repo lendo **um** ponto de entrada.
- **SC-010**: 100% dos 55 ADRs têm veredito registrado (gera regra / não gera / já coberto) — cobertura, não amostragem.
- **SC-011**: Zero regras reproduzem o corpo de um ADR; 100% das regras derivadas citam o ADR de origem.
- **SC-012**: Editar um arquivo cujo path tem ADR aplicável entrega o aprendizado sem que seja preciso abrir o ADR.
- **SC-013**: Cada linha acrescentada às rules tem justificativa individual registrada; nenhuma entra por completude.
- **SC-014**: Todo aprendizado acionável que poderia ser mecanizado está registrado como candidato a enforcement, em vez de permanecer só como texto.

## Impacto Arquitetural (core-api)

- **Bounded Contexts afetados**: **nenhum**. Esta feature é aparato de processo.
- **Novos agregados / Value Objects**: nenhum.
- **Novos eventos de domínio (outbox)**: nenhum.
- **Borda HTTP envolvida**: não.
- **Mudanças em `src/`**: **zero** — é invariante (FR-010) e critério de aceite (SC-007), não uma expectativa.
- **Possíveis violações da constituição**: esta feature **altera** a constituição (Princípio I e, conforme FR-016, o destino do documento inteiro). Por isso exige ADR novo (FR-012) em vez de edição direta — mesmo requisito de Governance que a spec 038 identificou.

## Assumptions

- ~~O Claude Code é o único consumidor de agente deste repositório.~~ **CORRIGIDO em 2026-07-30 — a premissa era falsa.** O [ADR-0054](../../handbook/architecture/adr/0054-ai-assisted-contribution-policy.md) (aceito) declara que o projeto é desenvolvido com "Claude Code, **Kimi Code** e outros agentes que consomem o `AGENTS.md`", e o repo versiona `.agents/skills → ../.claude/skills`, symlink que existe porque o Kimi não auto-descobre `.claude/skills/`. Um ADR aceito vence a suposição.
- **A premissa correta:** o repo **é** multi-agente, e a portabilidade real **nunca veio do spec-kit** — vem do `AGENTS.md` (padrão aberto, com `CLAUDE.md` como stub) e do symlink `.agents/skills`. O spec-kit está com `"integration": "claude"`, uma única integração, e não gera nada para os demais agentes. **A decisão de remover se mantém, e por um motivo mais forte:** o produto que vende portabilidade não é o que a entrega aqui.
- **Consequência para FR-017:** migrar o fluxo de `.specify/` para `.claude/skills/` o coloca **atrás do symlink `.agents/`**, tornando-o visível ao Kimi — o que hoje não ocorre. A consolidação **aumenta** a portabilidade efetiva em vez de reduzi-la.
- ~~**`.agents/` MUST ser preservado.**~~ **A premissa voltou a mudar em 2026-07-31**, agora por decisão explícita: o dono determinou que **só o Claude Code será usado** neste projeto — nada de Kimi, Copilot ou outros. O symlink `.agents/skills` e o `.zed/` foram removidos.

  Vale registrar o percurso, porque ele é instrutivo: a spec nasceu assumindo "só Claude Code", eu **corrigi** a premissa ao descobrir o symlink e o ADR-0054 (que cita Kimi Code), e agora ela volta a valer — não por eu ter acertado antes, mas porque o dono **decidiu** que assim seja. A diferença entre suposição e decisão é exatamente essa: a primeira se verifica contra o repo, a segunda se declara e o repo se ajusta.

- `specs/` (os artefatos de feature já produzidos) é histórico de projeto e **sobrevive** a qualquer decisão sobre `.specify/` — o formato Markdown das specs não depende da ferramenta que as gerou.
- TDD como disciplina e a Política de Regressão Zero sobrevivem intactos, como na spec 038.
- A spec 038 fecha antes desta começar a executar; esta spec assume o estado **pós-038**.
- O acervo segue o padrão da 038: movido para fora do repo, preservado, não deletado.
- A entrega é sequenciada em camadas revertíveis, como na 038.
