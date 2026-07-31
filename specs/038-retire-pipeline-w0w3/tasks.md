---
description: 'Task list — Aposentadoria da pipeline W0→W3'
---

# Tasks: Aposentadoria da pipeline W0→W3

**Input**: Design documents from `/specs/038-retire-pipeline-w0w3/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/verification.md](./contracts/verification.md)

**Tests**: Nenhuma task de teste novo. Esta feature é **subtrativa** — não há comportamento novo a cobrir, e a suíte **encolhe** em 2.352 LOC. A verificação é feita pelas **31 asserções** de [`contracts/verification.md`](./contracts/verification.md), referenciadas como `C*` em cada task.

**Organization**: Tasks agrupadas por user story. Cada story é uma camada independentemente entregável e revertível (`git revert` do seu commit).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 (hooks) · US2 (doutrina) · US3 (ferramenta) · US4 (acervo)
- Todo path é relativo à raiz do repositório

## Path Conventions

Projeto único, raiz em `core-api/`. **Nenhuma task toca `src/`** — invariante da feature (FR-017, C3.5).

---

## Phase 1: Setup (Pré-condições bloqueantes) ✅ CONCLUÍDA

**Purpose**: destravar o repositório e preservar trabalho que a remoção destruiria

- [x] T001 Corrigir `core.bare` para `false` em `.git/config` — destrava toda operação de índice (C0.1, C0.2)
- [x] T002 Commitar as 692 linhas de `wave-override` sujas em `scripts/pipeline/` e `tests/pipeline/` + o ticket untracked `.claude/.pipeline/PIPELINE-STATE-WAVE-OVERRIDE/` (C0.3)

> **Executadas nesta sessão em 2026-07-30** com autorização explícita do usuário.
> Commit: `6408c5ed` — 13 arquivos, 1.093 inserções.
> **T002 era irreversível se pulada**: sem o commit, T045/T046 destruiriam o trabalho sem blob para restaurar.

---

## Phase 2: Foundational (Baseline de medição)

**Purpose**: capturar os números do "antes", sem os quais SC-002 e SC-006 são inverificáveis

**⚠️ CRITICAL**: precisa rodar **antes** de qualquer remoção — depois, o baseline é irrecuperável

- [x] T003 [P] Registrar baseline de contexto: `wc -c AGENTS.md .claude/output-styles/erp-contracts.md` — medido: **29.487 B** + 3.493 B = 32.980 B (SC-002)
- [x] T004 [P] Registrar baseline do acervo: `find .claude/.pipeline -type f | wc -l` e `du -sh .claude/.pipeline` — medido: **3.436 arquivos / 16 MB** (SC-006, C4.1)
- [x] T005 [P] Registrar baseline de rastreados: `git ls-files .claude/.pipeline | wc -l` — medido: **3.435** (não 3.429; +6 do ticket preservado em T002) (SC-006, C4.3)
- [x] T006 [P] Registrar o SHA base da entrega — `6408c5ed3aac27885e94cdc522f34b46a5d2ea33` (C3.5, C5.3, C5.4, C5.5)
- [x] T007 Gravar os baselines de T003–T006 em `specs/038-retire-pipeline-w0w3/BASELINE.md`

**Checkpoint**: números do "antes" congelados — as user stories podem começar

---

## Phase 3: User Story 1 - Conversar sem contaminação de contexto (Priority: P1) 🎯 MVP

**Goal**: nenhum conteúdo derivado do acervo de tickets é injetado em prompt ou boot de sessão

**Independent Test**: abrir sessão nova, enviar prompt qualquer, confirmar ausência do bloco `[ticket-context]` e de menção a ticket no resumo de abertura

### Implementation for User Story 1

- [x] T008 [P] [US1] Remover `.claude/hooks/inject-ticket-context.sh` — causa direta da contaminação (FR-001, C1.1)
- [x] T009 [P] [US1] Remover `.claude/hooks/subagent-stop-validate.sh` — valida fechamento de wave (FR-003, C1.2)
- [x] T010 [US1] Remover o bloco `UserPromptSubmit` inteiro de `.claude/settings.json` (só continha o hook de T008) (FR-005, C1.5)
- [x] T011 [US1] Remover o bloco `SubagentStop` inteiro de `.claude/settings.json` (só continha o hook de T009) (FR-005, C1.5)
- [x] T012 [P] [US1] Podar a varredura de `.claude/.pipeline` em `.claude/hooks/session-start-context.sh`, **preservando** git/branch e planejamento pausado (FR-002, C1.3)
- [x] T013 [P] [US1] Podar as linhas 52-56 de `.claude/statusline.sh` (resolução de ticket ativo), **preservando** modelo, branch, PR, cache e custo (FR-004, C1.4, C1.6)
- [x] T014 [US1] Verificar que `block-npm.sh` (ADR-0012), `block-cross-project-docker.sh`, `prettier-write.sh` e `stop-typecheck.sh` seguem registrados e intactos em `.claude/settings.json` — JSON válido, 4 eventos restantes (C1.7)
- [x] T015 [US1] Rodar as asserções C1.1–C1.7 de `contracts/verification.md` — **7/7 PASS**
- [x] T016 [US1] Commit atômico: `chore(claude): remove hooks que injetam estado de ticket no contexto (#038)`

> ✅ **RESOLVIDO pela US3** (antecipada) — o gate está **100% verde** desde T049.
>
> ⚠️ Registro histórico do que ocorreu ao fechar a US1 — `typecheck` ✅ · `format:check` ✅ · `lint` ✅ · `test` ❌.
> As 3 falhas estão **exclusivamente** em `tests/pipeline/` e são o **RED do W2 round 2** do ticket
> `PIPELINE-STATE-WAVE-OVERRIDE` (Blocker 1: override repetido apaga a autorização anterior; Blocker 2:
> `--reason` não sanitizado forja linhas no STATE.md — CWE-93/CWE-116). O W1 round 2 nunca foi executado.
> **Não é regressão da US1** — nenhum arquivo da US1 é coberto por esses testes —, mas entrou no HEAD pelo
> commit de preservação T002. **Escalado ao humano** (saída 3 da Política de Regressão Zero): a decisão
> entre corrigir código condenado, antecipar a Fase 5 ou aceitar o RED é de escopo, não técnica.

**Checkpoint**: 🎯 **MVP entregue.** A dor aguda acabou. Nada foi destruído — só automação desligada. Parar aqui já é ganho real. **Validar abrindo uma sessão nova antes de seguir.**

---

## Phase 4: User Story 2 - Enxugar o contexto default (Priority: P2)

**Goal**: o material carregado em toda sessão descreve o projeto, não um ritual extinto

**Independent Test**: medir bytes antes/depois e confirmar que nenhuma instrução remanescente manda abrir ticket ou percorrer waves

### Governança primeiro (ordem imposta pela constituição)

> A seção Governance determina que _"alterações de stack ou de princípio exigem ADR novo (com `supersedes`), não edição aqui"_. **O ADR vem antes da emenda — nunca o contrário.**

- [ ] T017 [US2] Criar `handbook/architecture/adr/0055-retire-w0-w3-pipeline.md` registrando a aposentadoria, **sem `supersedes`** (nenhum ADR instituía a pipeline), e declarando como ler `0018`, `0034` e `0054` após a remoção (FR-022, C5.1)
- [ ] T018 [US2] Incluir no ADR-0055 as 3 citações literais já extraídas com grounding verificado em `research.md` §R0 — Valente (espaço mental), Uncle Bob (código morto), Beck (o que TDD de fato é) — exigência do Princípio IX
- [ ] T019 [US2] Registrar o ADR-0055 em `handbook/CHANGELOG.md` (FR-022, C5.2)
- [ ] T020 [US2] Confirmar que **nenhum** ADR de `0001` a `0054` foi editado (C5.4) — são imutáveis por hierarquia de regras

### Constituição

- [ ] T021 [US2] Emendar o Princípio I em `.specify/memory/constitution.md` (linhas 11-17): **preservar** teste-antes-de-código, **remover** ticket, waves numeradas e comandos de estado (FR-011, C2.8)
- [ ] T022 [US2] Remover a seção "Ciclo RED → YELLOW → GREEN (mapeia no W0→W3)" (linhas 75-81) de `.specify/memory/constitution.md`
- [ ] T023 [US2] Remover a linha "Pipeline state" (linha 95) de `.specify/memory/constitution.md`, **preservando** o gate de qualidade e a linha de integração
- [ ] T024 [US2] Confirmar que o **Princípio II (regressão zero) permanece íntegro** em `.specify/memory/constitution.md` (C2.9) — ele não cai junto
- [ ] T025 [US2] Subir a versão da constituição de `1.2.0` para **`2.0.0`** (major — remove princípio marcado NÃO-NEGOCIÁVEL) e atualizar `Last Amended`

### Contexto default

- [ ] T026 [US2] Remover a seção "Pipeline fail-first W0→W3" de `AGENTS.md` (linhas 95-114) (FR-006, C2.1)
- [ ] T027 [US2] Remover os blocos `pipeline:state` / `pipeline:status` / `pipeline:metrics` de "Comandos essenciais" em `AGENTS.md` (linhas 198-216) (FR-006, C2.2)
- [ ] T028 [US2] Podar em `AGENTS.md`: anti-padrão #6 (ticket obrigatório), linha 120 ("orquestra as 4 waves"), linha 128, linha 167 (`pipeline-maestro`), linhas 60/64 (tabela de idioma) e a tabela de hooks ativos
- [ ] T029 [US2] Reescrever `AGENTS.md:80` — "código-IA passa pela mesma Pipeline W0→W3" → apontar para o fluxo spec-kit, sem editar o ADR-0054 em si
- [ ] T030 [US2] Remover a seção "Pipeline W0→W3" (linhas 40-49) de `.claude/output-styles/erp-contracts.md` — **output style ativo** em `settings.json` (FR-007, C2.3)

### Skills e agente

- [ ] T031 [P] [US2] Remover `.claude/skills/pipeline-maestro/` — existe só para orquestrar waves (FR-008, C2.4)
- [ ] T032 [P] [US2] Podar o rótulo "W3" de `.claude/skills/ts-quality-checker/SKILL.md`, **mantendo a skill** — o hook `speckit.verify` é `optional: false` e removê-la quebraria o fluxo substituto (FR-010, C2.6)
- [ ] T033 [P] [US2] Podar o rótulo "W2" de `.claude/skills/code-reviewer/SKILL.md`, **mantendo a skill** (FR-010, C2.7)
- [ ] T034 [US2] Podar a orquestração de waves de `.claude/agents/contratos-orchestrator.md` (linhas 8, 14, 18, 34), **mantendo** o roteamento agente/skill (FR-009, C2.5)

### Fluxo spec-kit e documentação

- [ ] T035 [P] [US2] Remover a seção "Estimativa de Pipeline (W0 size)" (linhas 132-138) de `.specify/templates/plan-template.md` (FR-012, C2.10)
- [ ] T036 [P] [US2] Remover referências a comandos de pipeline de `.specify/templates/tdd-template.md` (FR-012, C2.10)
- [ ] T037 [P] [US2] Remover referências a comandos de pipeline de `.specify/workflows/core-api-sdd/workflow.yml` e `.specify/.smoke-test/RUNBOOK.md` (FR-012, C2.10)
- [ ] T038 [P] [US2] Podar a seção "Pipeline 4-wave" de `.claude/README.md` (linhas 13, 24-25, 38-40, 44-65, 131, 134) (FR-013, C2.11)
- [ ] T039 [P] [US2] Podar referências ao fluxo de pipeline em `README.md` e `docs/04-dev-guide.md` (FR-013, C2.11)
- [ ] T040 [P] [US2] Remover `.claude/runbooks/spec-driven-pipeline.md` — runbook do processo extinto
- [ ] T041 [US2] Decidir o destino de `handbook/process/00-fluxo-pipeline-sdd-agentes.md` — está **untracked** (nunca versionado); remover do disco ou descartar
- [ ] T042 [US2] Medir a redução de contexto contra o baseline de T003 e registrar em `BASELINE.md` (SC-002)
- [ ] T043 [US2] Rodar as asserções C2.1–C2.11, C5.1, C5.2, C5.4
- [ ] T044 [US2] Commit atômico: `docs(agents): aposenta a doutrina W0→W3 do contexto default (#038)`

**Checkpoint**: contexto default enxuto; nenhuma instrução órfã aponta para comandos que ainda existem — mas já não são citados

---

## Phase 5: User Story 3 - Remover a ferramenta e seus testes (Priority: P3)

**Goal**: o código da CLI de pipeline e sua suíte saem do repositório

**Independent Test**: os comandos não existem mais e a bateria de qualidade fica verde sem eles

> ⚠️ **Bloqueado por T002.** Sem o commit de preservação, T045 destrói 692 linhas de forma irrecuperável. Reconfirmar `C0.3` (saída vazia) antes de iniciar esta fase.

### Implementation for User Story 3

- [x] T045 [US3] Remover `scripts/pipeline/` — 8 arquivos (FR-014, C3.1)
- [x] T046 [US3] Remover `tests/pipeline/` — 6 arquivos (FR-014, C3.2)
- [x] T047 [P] [US3] Remover os 3 scripts `pipeline:*` de `package.json` (FR-015, C3.3)
- [x] T048 [P] [US3] Remover a task `pipeline:status` de `.zed/tasks.json` (FR-016, C3.4)
- [x] T049 [US3] Rodar o gate completo — **todos verdes**: typecheck ✅ · format:check ✅ · lint ✅ · test ✅ (4.490 pass, **0 fail**, exit 0) (SC-005)
- [x] T050 [US3] Verificar a invariante da feature — `git diff --name-only 6408c5ed..HEAD -- src/` e `git status -- src/` ambos **vazios** (FR-017, C3.5, SC-007)
- [x] T051 [US3] Rodar as asserções C3.1–C3.5 — **5/5 PASS**
- [x] T052 [US3] Commit atômico: `chore(scripts): remove a CLI de pipeline e sua suíte` — 16 arquivos, **3.864 deleções**

> **US3 antecipada** a pedido do usuário (2026-07-30), fora da ordem recomendada em R8. Motivo: resolver
> na raiz os 3 testes vermelhos herdados de T002, em vez de consertar código já condenado à remoção.
> **Consequência aceita**: a doutrina da US2 (`AGENTS.md`, output-style, constituição) passa a referenciar
> comandos que não existem mais — inconsistência temporária até a Fase 4 ser executada. Era exatamente o
> risco que R8 apontava ao recomendar US2 antes de US3; foi assumido conscientemente, não por descuido.

**Checkpoint**: 3.855 LOC a menos; gate verde; `src/` intocado

---

## Phase 6: User Story 4 - Evacuar o acervo (Priority: P4)

**Goal**: 544 tickets preservados na íntegra, fora da árvore do repositório

**Independent Test**: contagem de arquivos idêntica no destino; ausência na worktree e no índice

> ⚠️ **Protocolo obrigatório: copiar → verificar → só então remover.** Nunca `mv` cego.

### Implementation for User Story 4

- [ ] T053 [US4] Copiar `.claude/.pipeline/` para `../core-api-pipeline-archive/` preservando a estrutura (FR-018)
- [ ] T054 [US4] **GATE BLOQUEANTE**: conferir que `find ../core-api-pipeline-archive -type f | wc -l` é idêntico ao baseline de T004 (3.436). Divergência de **um único arquivo aborta a etapa** (FR-018, C4.1)
- [ ] T055 [US4] Remover do índice: `git rm -r --cached .claude/.pipeline` (FR-019, C4.3)
- [ ] T056 [US4] Remover da árvore de trabalho: `rm -rf .claude/.pipeline` (FR-019, C4.2)
- [ ] T057 [US4] Adicionar `.claude/.pipeline/` ao `.gitignore` com comentário apontando o ADR-0055 (FR-020, C4.4)
- [ ] T058 [US4] Verificar recuperabilidade: `git show <SHA-T006>:.claude/.pipeline/<ticket>/STATE.json` retorna conteúdo (FR-021, C4.5)
- [ ] T059 [US4] Rodar as asserções C4.1–C4.5
- [ ] T060 [US4] Commit atômico: `chore(pipeline): evacua o acervo de 544 tickets para fora do repo (#038)`

**Checkpoint**: −16 MB, −3.429 arquivos rastreados, 100% preservado fora do repo

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: fechamento, verificação global e limpeza de resíduos

- [ ] T061 Rodar o gate final completo: `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test` (SC-005)
- [ ] T062 [P] Varredura global de resíduo: `grep -rIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=specs -E "pipeline:(state|status|metrics)|scripts/pipeline" .` → **zero** ocorrências (SC-003)
- [ ] T063 [P] Confirmar que nenhuma automação ativa lê o acervo: inspecionar `.claude/settings.json` e `.claude/statusline.sh` (SC-004, C1.5)
- [ ] T064 [P] Confirmar histórico congelado: `git diff --name-only <SHA-T006>..HEAD -- specs/ | grep -v 038-` → vazio (FR-024, C5.5)
- [ ] T065 [P] Confirmar reversibilidade: `git log --oneline <SHA-T006>..HEAD` → **≥ 5 commits** desta entrega, um por camada (FR-023, C5.3, SC-008)
- [ ] T066 Verificar que os 11 worktrees seguem íntegros: `git worktree list` (R5, risco residual)
- [ ] T067 **Prova final (SC-009)**: abrir sessão nova, pedir uma mudança de código qualquer, confirmar que nada propõe abrir ticket nem percorrer waves
- [ ] T068 Atualizar `specs/038-retire-pipeline-w0w3/BASELINE.md` com os números finais (antes → depois) de contexto, acervo e LOC

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: ✅ concluída — destravou o repositório e preservou o trabalho pendente
- **Phase 2 (Foundational)**: depende de Phase 1. **BLOQUEIA todas as stories** — sem baseline, SC-002 e SC-006 tornam-se inverificáveis para sempre
- **Phase 3 (US1)**: depende de Phase 2. Independente das demais stories
- **Phase 4 (US2)**: depende de Phase 2. Independente, mas **recomendada antes da US3** (ver abaixo)
- **Phase 5 (US3)**: depende de Phase 2 e **de T002** (preservação). Independente das demais
- **Phase 6 (US4)**: depende de Phase 2 e **recomendada após US1** (ver abaixo)
- **Phase 7 (Polish)**: depende de todas as stories entregues

### Ordem recomendada e por quê

`US1 → US2 → US3 → US4`. As stories são tecnicamente independentes, mas a ordem minimiza risco:

- **US1 primeiro** — é a dor aguda, é reversível e não destrói nada. Entrega valor mesmo se tudo parar aí
- **US2 antes de US3** — se a ferramenta saísse antes, a doutrina remanescente apontaria para comandos inexistentes; nesta ordem a janela de inconsistência é menor
- **US4 por último** — única etapa que mexe em dado histórico, e só é segura depois que `inject-ticket-context.sh` morreu na US1

### Within Each User Story

- Governança antes de emenda (US2: ADR T017 → constituição T021)
- Preservação antes de remoção (US3: T002 → T045)
- Verificação antes de destruição (US4: T054 → T055/T056)
- Gate verde antes do commit da story

### Parallel Opportunities

- **Phase 2**: T003, T004, T005, T006 — todas `[P]`, medições independentes
- **US1**: T008 e T009 `[P]` (arquivos distintos); T012 e T013 `[P]`
- **US2**: T031–T033 `[P]` (skills distintas); T035–T040 `[P]` (arquivos distintos)
- **US3**: T047 e T048 `[P]` (`package.json` vs `.zed/tasks.json`)
- **Phase 7**: T062–T065 `[P]` — verificações somente-leitura

⚠️ **T010 e T011 NÃO são paralelizáveis** — ambas editam `.claude/settings.json`.

---

## Parallel Example: User Story 2

```bash
# Skills — arquivos distintos, sem dependência entre si:
Task: "Remover .claude/skills/pipeline-maestro/"
Task: "Podar rótulo W3 de .claude/skills/ts-quality-checker/SKILL.md"
Task: "Podar rótulo W2 de .claude/skills/code-reviewer/SKILL.md"

# Templates e docs — arquivos distintos:
Task: "Podar .specify/templates/plan-template.md (linhas 132-138)"
Task: "Podar .specify/templates/tdd-template.md"
Task: "Podar .claude/README.md (seção 4-wave)"
Task: "Podar README.md e docs/04-dev-guide.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. ✅ Phase 1: Setup — concluída
2. Phase 2: Foundational — capturar baseline (**não pular**)
3. Phase 3: US1 — remover os hooks
4. **PARAR e VALIDAR**: abrir sessão nova, confirmar ausência de `[ticket-context]`
5. A dor aguda acabou. Tudo depois disso é higiene.

### Incremental Delivery

1. Setup + Foundational → baseline congelado
2. US1 → validar → **MVP: contexto limpo**
3. US2 → validar → contexto default enxuto
4. US3 → gate verde → −3.855 LOC
5. US4 → integridade conferida → −16 MB
6. Polish → verificação global

Cada story adiciona valor sem quebrar as anteriores. Qualquer uma pode ser revertida isoladamente.

### Estratégia de time

Feature de manutenção com forte acoplamento de julgamento (doutrina, ADR, constituição). **Recomenda-se execução por uma pessoa**, sequencialmente. As oportunidades `[P]` são para acelerar dentro de uma sessão, não para paralelizar entre pessoas.

---

## Notes

- `[P]` = arquivos diferentes, sem dependência
- **Nenhuma task toca `src/`** — invariante verificada por T050 (C3.5)
- Commit ao final de cada story, nunca no meio (garante `git revert` limpo por camada)
- Pela Política de Regressão Zero (Princípio II, **preservado**): qualquer vermelho no gate é corrigido agora, mesmo que pré-existente e alheio ao diff
- **T054 é gate bloqueante**: divergência de um arquivo aborta a evacuação
- **T002 já protegeu T045**: sem ela, a remoção seria destrutiva e irrecuperável
- A memória `always-full-w0-w3-pipeline` já foi corrigida em 2026-07-30 (fora do repo, não versionada)

---

## Resumo

| Fase             | Tasks          | Story | Commit                               |
| ---------------- | -------------- | ----- | ------------------------------------ |
| 1 — Setup ✅     | T001–T002 (2)  | —     | `6408c5ed` (feito)                   |
| 2 — Foundational | T003–T007 (5)  | —     | — (medição, sem commit próprio)      |
| 3 — Hooks 🎯 MVP | T008–T016 (9)  | US1   | `chore(claude): remove hooks…`       |
| 4 — Doutrina     | T017–T044 (28) | US2   | `docs(agents): aposenta a doutrina…` |
| 5 — Ferramenta   | T045–T052 (8)  | US3   | `chore(scripts): remove a CLI…`      |
| 6 — Acervo       | T053–T060 (8)  | US4   | `chore(pipeline): evacua o acervo…`  |
| 7 — Polish       | T061–T068 (8)  | —     | `chore(038): fecha a aposentadoria…` |

**Total: 68 tasks** · 2 concluídas · 66 pendentes · 24 FRs cobertos por 31 asserções
