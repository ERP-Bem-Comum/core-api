# Contrato de verificação

**Feature**: `038-retire-pipeline-w0w3` · **Data**: 2026-07-30

Esta feature não expõe API, rota HTTP nem comando novo — ela **retira** interface. O contrato
verificável é, portanto, o inverso do usual: um conjunto de asserções que devem retornar **vazio ou
zero**. Cada asserção mapeia um FR da spec e é executável sem julgamento humano.

**Convenção**: toda asserção abaixo é escrita para **falhar alto** enquanto o requisito não estiver
cumprido. `PASS` significa saída vazia ou contagem `0`, salvo indicação em contrário.

---

## C0 — Pré-condições (bloqueiam tudo)

| ID   | Asserção                                                | PASS quando            | Cobre |
| ---- | ------------------------------------------------------- | ---------------------- | ----- |
| C0.1 | `git rev-parse --is-bare-repository`                    | `false`                | R2    |
| C0.2 | `git status --short` executa sem erro                   | exit 0                 | R2    |
| C0.3 | `git status --short -- scripts/pipeline tests/pipeline` | vazio **antes** da US3 | R3    |

> ⚠️ **C0.3 é a asserção mais importante do contrato.** Se ela falhar e a US3 rodar mesmo assim, o
> trabalho não commitado é destruído sem possibilidade de recuperação — não há blob no object store
> para voltar. Nenhuma outra falha desta feature é irreversível; esta é.

---

## C1 — Automação de contexto (US1 · FR-001 a FR-005)

| ID   | Asserção                                                                        | PASS                       | Cobre  |
| ---- | ------------------------------------------------------------------------------- | -------------------------- | ------ |
| C1.1 | `test -e .claude/hooks/inject-ticket-context.sh`                                | ausente                    | FR-001 |
| C1.2 | `test -e .claude/hooks/subagent-stop-validate.sh`                               | ausente                    | FR-003 |
| C1.3 | `grep -c "\.pipeline\|STATE\.md" .claude/hooks/session-start-context.sh`        | `0`                        | FR-002 |
| C1.4 | `grep -c "\.pipeline\|STATE\.md" .claude/statusline.sh`                         | `0`                        | FR-004 |
| C1.5 | `grep -c "inject-ticket-context\|subagent-stop-validate" .claude/settings.json` | `0`                        | FR-005 |
| C1.6 | `grep -c "git\|branch" .claude/statusline.sh`                                   | **> 0** — resto preservado | FR-004 |
| C1.7 | `grep -c "block-npm" .claude/settings.json`                                     | **> 0** — ADR-0012 intacto | FR-005 |

**Verificação de comportamento (manual, não automatizável)**: abrir sessão nova, enviar prompt
qualquer, confirmar ausência de bloco `[ticket-context]`. É a prova final de SC-001 — hoje ela
falha em 100% dos prompts, incluindo os três desta própria sessão.

---

## C2 — Doutrina (US2 · FR-006 a FR-013)

| ID    | Asserção                                                                                                            | PASS                           | Cobre  |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------ | --- | ---------------- | --- | ------ |
| C2.1  | `grep -cE "W0                                                                                                       | W1                             | W2     | W3  | wave" AGENTS.md` | `0` | FR-006 |
| C2.2  | `grep -cE "pipeline:(state\|status\|metrics)" AGENTS.md`                                                            | `0`                            | FR-006 |
| C2.3  | `grep -cE "W0\|wave\|\.pipeline" .claude/output-styles/erp-contracts.md`                                            | `0`                            | FR-007 |
| C2.4  | `test -d .claude/skills/pipeline-maestro`                                                                           | ausente                        | FR-008 |
| C2.5  | `grep -cE "wave\|W0→W3" .claude/agents/contratos-orchestrator.md`                                                   | `0`                            | FR-009 |
| C2.6  | `test -d .claude/skills/ts-quality-checker`                                                                         | **presente**                   | FR-010 |
| C2.7  | `test -d .claude/skills/code-reviewer`                                                                              | **presente**                   | FR-010 |
| C2.8  | `grep -cE "W0→W3\|pipeline:state" .specify/memory/constitution.md`                                                  | `0`                            | FR-011 |
| C2.9  | `grep -c "regressão zero" .specify/memory/constitution.md`                                                          | **> 0** — Princípio II intacto | FR-011 |
| C2.10 | `grep -cE "pipeline:(state\|status\|metrics)" .specify/templates/*.md .specify/workflows/core-api-sdd/workflow.yml` | `0`                            | FR-012 |
| C2.11 | `grep -cE "pipeline:(state\|status\|metrics)" README.md docs/04-dev-guide.md .claude/README.md`                     | `0`                            | FR-013 |

**Medição de SC-002**: `wc -c AGENTS.md .claude/output-styles/erp-contracts.md` antes e depois.
Baseline: `AGENTS.md` = **29.487 bytes**.

---

## C3 — Ferramenta (US3 · FR-014 a FR-017)

| ID   | Asserção                                                                        | PASS    | Cobre      |
| ---- | ------------------------------------------------------------------------------- | ------- | ---------- |
| C3.1 | `test -d scripts/pipeline`                                                      | ausente | FR-014     |
| C3.2 | `test -d tests/pipeline`                                                        | ausente | FR-014     |
| C3.3 | `grep -c "pipeline:" package.json`                                              | `0`     | FR-015     |
| C3.4 | `grep -rc "scripts/pipeline" .zed/tasks.json .github/workflows/ .claude/hooks/` | `0`     | FR-016     |
| C3.5 | `git diff --name-only <base>..HEAD -- src/`                                     | vazio   | **FR-017** |

**Gate de qualidade (SC-005)** — a bateria completa, na ordem:

```bash
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

Os quatro devem ficar **verdes**. Pela Política de Regressão Zero (Princípio II, preservado),
qualquer vermelho — inclusive pré-existente e alheio a este diff — é regressão a corrigir agora,
não a justificar.

---

## C4 — Acervo (US4 · FR-018 a FR-021)

| ID   | Asserção                                                   | PASS                          | Cobre  |
| ---- | ---------------------------------------------------------- | ----------------------------- | ------ |
| C4.1 | `find <destino> -type f \| wc -l`                          | **3.436** — idêntico à origem | FR-018 |
| C4.2 | `test -d .claude/.pipeline`                                | ausente                       | FR-019 |
| C4.3 | `git ls-files .claude/.pipeline \| wc -l`                  | `0`                           | FR-019 |
| C4.4 | `git check-ignore .claude/.pipeline/x`                     | ignorado (exit 0)             | FR-020 |
| C4.5 | `git show <commit-antes>:.claude/.pipeline/<t>/STATE.json` | conteúdo recuperado           | FR-021 |

> **C4.1 é gate bloqueante**: a remoção da origem só ocorre **após** a contagem conferir. Divergência
> de um único arquivo aborta a etapa.

---

## C5 — Governança (FR-022 a FR-024)

| ID   | Asserção                                                                     | PASS                        | Cobre  |
| ---- | ---------------------------------------------------------------------------- | --------------------------- | ------ |
| C5.1 | `test -f handbook/architecture/adr/0056-*.md`                                | presente                    | FR-022 |
| C5.2 | `grep -c "0056" handbook/CHANGELOG.md`                                       | **> 0**                     | FR-022 |
| C5.3 | `git log --oneline <base>..HEAD \| wc -l`                                    | **≥ 6** — um por camada     | FR-023 |
| C5.4 | `git diff --stat <base>..HEAD -- handbook/architecture/adr/0001-*.md … 0054` | vazio — ADRs intactos       | FR-022 |
| C5.5 | `git diff --name-only <base>..HEAD -- specs/ \| grep -v 038-`                | vazio — histórico congelado | FR-024 |

---

## Resumo de cobertura

| User Story  | FRs             | Asserções    | Bloqueantes                  |
| ----------- | --------------- | ------------ | ---------------------------- |
| Pré         | R2, R3          | C0.1 – C0.3  | **C0.3** (irreversível)      |
| US1         | FR-001 a FR-005 | C1.1 – C1.7  | —                            |
| US2         | FR-006 a FR-013 | C2.1 – C2.11 | —                            |
| US3         | FR-014 a FR-017 | C3.1 – C3.5  | **C3.5** (invariante `src/`) |
| US4         | FR-018 a FR-021 | C4.1 – C4.5  | **C4.1** (integridade)       |
| Transversal | FR-022 a FR-024 | C5.1 – C5.5  | —                            |

**24 FRs · 31 asserções · 100% de cobertura.** Nenhum FR sem asserção; nenhuma asserção órfã.
