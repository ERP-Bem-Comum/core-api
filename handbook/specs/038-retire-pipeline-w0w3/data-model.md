# Phase 1 — Inventário de artefatos

**Feature**: `038-retire-pipeline-w0w3` · **Data**: 2026-07-30

Esta feature não introduz entidades de dados — não há schema, tabela, agregado ou evento. O "modelo"
aqui é o **inventário completo dos artefatos afetados**, classificado por destino. Ele é a fonte de
verdade para `/speckit-tasks` e para a verificação final.

**Legenda de destino**: 🗑️ remover · ✂️ editar (podar) · 📦 mover para fora · ✅ manter intacto

---

## Camada 0 — Pré-condições (bloqueantes)

| Artefato                                          | Destino | Ação                                                          |
| ------------------------------------------------- | ------- | ------------------------------------------------------------- |
| `.git/config:4` — `bare = true`                   | ✂️      | `git config core.bare false` — **exige OK do usuário** (R2)   |
| 7 arquivos sujos em `scripts/`+`tests/pipeline`   | ✅      | Commitar antes de deletar, senão a perda é irrecuperável (R3) |
| `.claude/.pipeline/PIPELINE-STATE-WAVE-OVERRIDE/` | ✅      | Untracked — commitar junto ou aceitar que não é recuperável   |
| `handbook/process/`                               | ✅      | Untracked — decidir versionar ou descartar antes da US2       |

---

## Camada 1 — Ferramenta (US3)

| Artefato                                 | Destino | Métrica   |
| ---------------------------------------- | ------- | --------- |
| `scripts/pipeline/state-cli.ts`          | 🗑️      | 524 LOC   |
| `scripts/pipeline/metrics.ts`            | 🗑️      | 290 LOC   |
| `scripts/pipeline/dashboard.ts`          | 🗑️      | 205 LOC   |
| `scripts/pipeline/state-schema.ts`       | 🗑️      | 142 LOC   |
| `scripts/pipeline/dashboard-cli.ts`      | 🗑️      | 104 LOC   |
| `scripts/pipeline/state-io.ts`           | 🗑️      | 85 LOC    |
| `scripts/pipeline/metrics-cli.ts`        | 🗑️      | 79 LOC    |
| `scripts/pipeline/render-state-md.ts`    | 🗑️      | 74 LOC    |
| `tests/pipeline/state-cli.test.ts`       | 🗑️      | 910 LOC   |
| `tests/pipeline/metrics.test.ts`         | 🗑️      | 503 LOC   |
| `tests/pipeline/dashboard.test.ts`       | 🗑️      | 491 LOC   |
| `tests/pipeline/render-state-md.test.ts` | 🗑️      | 176 LOC   |
| `tests/pipeline/state-io.test.ts`        | 🗑️      | 134 LOC   |
| `tests/pipeline/state-schema.test.ts`    | 🗑️      | 138 LOC   |
| `package.json:48-50`                     | ✂️      | 3 scripts |
| `.zed/tasks.json:60`                     | ✂️      | 1 task    |

**Total removido**: 14 arquivos · **3.855 LOC**

**Invariante verificada**: nenhum arquivo em `src/` importa `scripts/pipeline` — a remoção não
alcança código de produção (sustenta FR-017).

---

## Camada 2 — Automação de contexto (US1)

| Artefato                                     | Destino | Detalhe                                                                    |
| -------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `.claude/hooks/inject-ticket-context.sh`     | 🗑️      | **Causa direta da contaminação.** Injeta STATE.md em todo prompt.          |
| `.claude/hooks/subagent-stop-validate.sh`    | 🗑️      | Valida fechamento de wave — sem função sem waves.                          |
| `.claude/hooks/session-start-context.sh`     | ✂️      | Remover varredura de 544 `STATE.md`; **manter** git/branch e planejamento. |
| `.claude/statusline.sh:52-56`                | ✂️      | Remover resolução de ticket ativo; **manter** modelo, branch, PR, custo.   |
| `.claude/settings.json` → `UserPromptSubmit` | ✂️      | Remover o bloco inteiro (só continha o hook removido).                     |
| `.claude/settings.json` → `SubagentStop`     | ✂️      | Remover o bloco inteiro (só continha o hook removido).                     |

**Preservar intactos**: `block-npm.sh` (ADR-0012), `block-cross-project-docker.sh`,
`prettier-write.sh`, `stop-typecheck.sh`, `pre-commit-typecheck.sh`.

---

## Camada 3 — Acervo (US4)

| Artefato             | Destino | Métrica                                                 |
| -------------------- | ------- | ------------------------------------------------------- |
| `.claude/.pipeline/` | 📦      | 544 tickets · 3.436 arquivos · 3.429 rastreados · 16 MB |
| `.gitignore`         | ✂️      | Adicionar entrada bloqueando reintrodução (FR-020)      |

**Destino**: `../core-api-pipeline-archive/` (R1). Protocolo: copiar → **verificar contagem** →
remover. Nunca `mv` cego.

---

## Camada 4 — Doutrina (US2)

### Contexto default — carregado em toda sessão

| Artefato                                 | Destino | Linhas alvo                                                             |
| ---------------------------------------- | ------- | ----------------------------------------------------------------------- |
| `AGENTS.md` §"Pipeline fail-first W0→W3" | ✂️      | **95-114** — seção inteira                                              |
| `AGENTS.md` §"Comandos essenciais"       | ✂️      | **198-216** — blocos pipeline state/dashboard/metrics                   |
| `AGENTS.md` tabela de hooks              | ✂️      | Linhas dos hooks removidos                                              |
| `AGENTS.md` anti-padrão #6               | ✂️      | "Editar código não-trivial sem ticket"                                  |
| `AGENTS.md` §Roteamento                  | ✂️      | **120, 128, 167** — "orquestra as 4 waves", linha do `pipeline-maestro` |
| `AGENTS.md` tabela de Idioma             | ✂️      | **60, 64** — referências a `.pipeline/` e "IDs de ticket"               |
| `AGENTS.md:80` (ADR-0054)                | ✂️      | "passa pela mesma Pipeline W0→W3" → apontar para o fluxo spec-kit       |
| `.claude/output-styles/erp-contracts.md` | ✂️      | **40-49** — seção "Pipeline W0→W3" inteira (**output style ativo**)     |

**AGENTS.md hoje**: 29.487 bytes. A redução medida é reportada na entrega (SC-002).

### Skills e agentes

| Artefato                                   | Destino | Motivo                                                                     |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------- |
| `.claude/skills/pipeline-maestro/`         | 🗑️      | Existe só para orquestrar waves.                                           |
| `.claude/skills/ts-quality-checker/`       | ✂️      | **Manter** — hook `speckit.verify` é `optional: false`. Tirar "W3".        |
| `.claude/skills/code-reviewer/`            | ✂️      | **Manter** — revisão tem valor próprio. Tirar "W2".                        |
| `.claude/agents/contratos-orchestrator.md` | ✂️      | **Manter** roteamento; podar orquestração de waves (linhas 8, 14, 18, 34). |

### Governança e fluxo spec-kit

| Artefato                                            | Destino  | Detalhe                                                                 |
| --------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `handbook/architecture/adr/0056-…`                  | ➕ criar | **ADR novo** registrando a aposentadoria (R6). Exigido pela Governance. |
| `handbook/CHANGELOG.md`                             | ✂️       | Registrar o ADR-0056.                                                   |
| `.specify/memory/constitution.md` Princípio I       | ✂️       | Emendar (R4). Versão 1.2.0 → **2.0.0**.                                 |
| `.specify/memory/constitution.md` §RED→YELLOW→GREEN | ✂️       | Linhas 75-81 — mapeamento nas waves.                                    |
| `.specify/memory/constitution.md` §Workflow         | ✂️       | Linha 95 — "Pipeline state". **Manter** o gate de qualidade.            |
| `.specify/templates/plan-template.md`               | ✂️       | Linhas **132-138** — seção "Estimativa de Pipeline (W0 size)".          |
| `.specify/templates/tdd-template.md`                | ✂️       | Referências a comandos de pipeline.                                     |
| `.specify/workflows/core-api-sdd/workflow.yml`      | ✂️       | Referências a comandos de pipeline.                                     |
| `.specify/.smoke-test/RUNBOOK.md`                   | ✂️       | Referências a comandos de pipeline.                                     |

### Documentação

| Artefato                                            | Destino | Detalhe                                                 |
| --------------------------------------------------- | ------- | ------------------------------------------------------- |
| `.claude/README.md`                                 | ✂️      | Linhas 13, 24-25, 38-40, 44-65, 131, 134 — seção 4-wave |
| `README.md`                                         | ✂️      | Referências ao fluxo de pipeline                        |
| `docs/04-dev-guide.md`                              | ✂️      | Referências ao fluxo de pipeline                        |
| `.claude/runbooks/spec-driven-pipeline.md`          | 🗑️      | Runbook do processo extinto                             |
| `handbook/process/00-fluxo-pipeline-sdd-agentes.md` | 🗑️      | **Untracked** — ver Camada 0                            |
| `.claude/.planning/*.md` (4 arquivos)               | ✅      | Notas de planejamento datadas — histórico, congelar     |

---

## Congelados — não tocar

| Artefato                                             | Motivo                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `handbook/architecture/adr/*` (7 que citam pipeline) | **Imutáveis** por hierarquia de regras. ADR-0056 reconcilia (R6).    |
| `specs/*/tasks.md` e `specs/*/plan.md` (~40)         | Registro do que foi feito à época. Reescrever falsificaria (FR-024). |
| `.claude/worktrees/` (11 worktrees)                  | Trabalho em curso; tratados na integração de cada branch (R5).       |
| `src/**`                                             | **Invariante da feature** — zero mudanças (FR-017, SC-007).          |
| `.github/workflows/*`                                | Verificado: nenhuma referência a comandos de pipeline.               |

---

## Resumo quantitativo

| Métrica                       | Antes    | Depois esperado    |
| ----------------------------- | -------- | ------------------ |
| Arquivos rastreados no acervo | 3.429    | 0                  |
| Tamanho do acervo na árvore   | 16 MB    | 0                  |
| LOC de ferramenta + testes    | 3.855    | 0                  |
| Scripts `pipeline:*`          | 3        | 0                  |
| Hooks lendo estado de ticket  | 4        | 0                  |
| `AGENTS.md`                   | 29.487 B | medido na entrega  |
| Arquivos em `src/` alterados  | —        | **0** (invariante) |
