# Implementation Plan: Aposentadoria da pipeline W0→W3

**Branch**: `fix/368-deadman-audit-false-fired` (spec dir `038-retire-pipeline-w0w3`) | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/038-retire-pipeline-w0w3/spec.md`

## Summary

Remover do core-api as quatro camadas da pipeline W0→W3 — ferramenta (3.855 LOC), automação de
contexto (4 hooks), acervo (16 MB / 3.429 arquivos versionados) e doutrina (`AGENTS.md`,
output-style, constituição, skill de orquestração) — preservando integralmente o acervo fora do
repositório e sem tocar em uma única linha de `src/`.

**Abordagem técnica**: entrega subtrativa em **6 commits atômicos**, um por camada, cada um
revertível isoladamente. Duas pré-condições bloqueantes descobertas no Phase 0 antecedem as camadas:
corrigir a flag `core.bare` que impede toda operação de índice, e commitar 7 arquivos sujos que a
remoção destruiria de forma irrecuperável. A ordem das camadas segue **risco e alívio**, não
arrumação lógica: hooks primeiro (dor aguda, reversível, nada é destruído), acervo por último (única
etapa que mexe em dado histórico).

**O que NÃO cai junto**: a disciplina de teste-antes-de-código e a Política de Regressão Zero
permanecem. Ancorado em Beck (`research.md` §R0): TDD é "conduzir o desenvolvimento com testes
automatizados" — ticket, wave numerada e dashboard de estado nunca fizeram parte da definição.

## Technical Context

**Language/Version**: N/A para o produto — a feature não compila código. Os artefatos removidos são
TypeScript 6 (Node 24, ESM, `--experimental-strip-types`), Bash (hooks) e Markdown (doutrina).

**Primary Dependencies**: nenhuma adicionada ou removida. `package.json` perde 3 scripts, zero
dependências.

**Storage**: N/A — sem schema, migration, tabela ou evento. O único "dado" é o acervo de 3.436
arquivos Markdown/JSON, movido sem transformação.

**Testing**: `pnpm run typecheck` + `format:check` + `lint` + `test`. A suíte **encolhe** em 2.352
LOC (6 arquivos). Nenhum teste novo — não há comportamento novo a cobrir; a verificação é o contrato
de 31 asserções em [`contracts/verification.md`](./contracts/verification.md).

**Target Platform**: repositório e ambiente de desenvolvimento local (macOS/Linux). Zero impacto em
runtime, deploy, QA ou produção.

**Project Type**: manutenção de ferramentaria de processo — subtrativa, sem entrega funcional.

**Performance Goals**: reduzir o custo fixo de contexto por sessão. Baseline `AGENTS.md` = 29.487
bytes; redução medida e reportada na entrega (SC-002).

**Constraints**: `src/` intocado (invariante); ADRs aceitos imutáveis; `pnpm` sempre; acervo
preservado sem perda; reversibilidade por camada.

**Scale/Scope**: ~70 arquivos afetados — 14 removidos (ferramenta), 4 hooks, ~20 editados
(doutrina/docs), 3.436 movidos, 1 ADR criado. **0 arquivos em `src/`**.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                               | Status                | Observação                                                                                                                    |
| --------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **I. TDD fail-first em pipeline W0→W3** | ⚠️ **VIOLADO — alvo** | A feature **é** a remoção deste princípio. Ver Complexity Tracking. Emendado por ADR novo, conforme a Governance.             |
| **II. Regressão zero**                  | ✅ preservado         | Mantido íntegro na constituição (C2.9). O gate roda ao final de cada etapa; vermelho é corrigido, não justificado.            |
| **III. pnpm único**                     | ✅                    | Nenhum `npm`. `block-npm.sh` preservado (C1.7).                                                                               |
| **IV. Modular Monolith**                | ✅ N/A                | Nenhum Bounded Context tocado. `src/` intocado.                                                                               |
| **V. Domínio puro**                     | ✅ N/A                | Nenhuma mudança de domínio.                                                                                                   |
| **VI. MySQL + Drizzle**                 | ✅ N/A                | Nenhuma mudança de schema ou migration.                                                                                       |
| **VII. HTTP-first**                     | ✅ N/A                | Nenhuma rota criada, alterada ou removida.                                                                                    |
| **VIII. TS strict + ESM + idioma**      | ✅                    | Só remoção de `.ts`; `typecheck`/`lint` verdes no gate. Docs em PT-BR, commits com escopo.                                    |
| **IX. Citação canônica obrigatória**    | ✅ **cumprido**       | 3 citações literais extraídas via MCP `acdg-skills`, **grounding verificado** — Valente, Uncle Bob, Beck (`research.md` §R0). |

**Veredito**: gate **passa** com uma violação declarada e justificada (Princípio I), que é o próprio
objeto da feature. Nenhuma violação colateral.

**Re-avaliação pós-Phase 1**: inalterado. O design não introduziu nenhuma violação nova — ao
contrário, R7 preservou `ts-quality-checker` e `code-reviewer` justamente para não derrubar o gate
de qualidade que sustenta o Princípio II.

## Project Structure

### Documentation (this feature)

```text
specs/038-retire-pipeline-w0w3/
├── plan.md                      # Este arquivo
├── spec.md                      # 24 FRs · 9 SCs · 4 user stories
├── research.md                  # Phase 0 — R0 a R8 + riscos residuais
├── data-model.md                # Phase 1 — inventário classificado (🗑️ ✂️ 📦 ✅)
├── quickstart.md                # Phase 1 — 6 etapas executáveis
├── contracts/
│   └── verification.md          # Phase 1 — 31 asserções, 100% dos FRs
├── checklists/
│   └── requirements.md          # 16/16 itens
└── tasks.md                     # Phase 2 — gerado por /speckit-tasks
```

### Source Code (repository root)

```text
# REMOVIDOS
scripts/pipeline/                # 8 arquivos · 1.503 LOC
tests/pipeline/                  # 6 arquivos · 2.352 LOC
.claude/hooks/inject-ticket-context.sh
.claude/hooks/subagent-stop-validate.sh
.claude/skills/pipeline-maestro/
.claude/runbooks/spec-driven-pipeline.md

# MOVIDO PARA FORA DO REPO
.claude/.pipeline/               # 544 tickets · 3.436 arquivos · 16 MB
                                 #   → ../core-api-pipeline-archive/

# EDITADOS (poda)
AGENTS.md                        # seção 95-114, comandos 198-216, anti-padrão #6
.claude/output-styles/erp-contracts.md    # seção 40-49 (output style ATIVO)
.claude/settings.json            # blocos UserPromptSubmit + SubagentStop
.claude/hooks/session-start-context.sh
.claude/statusline.sh            # linhas 52-56
.claude/agents/contratos-orchestrator.md
.claude/skills/{ts-quality-checker,code-reviewer}/SKILL.md   # só o rótulo de wave
.specify/memory/constitution.md  # Princípio I · 1.2.0 → 2.0.0
.specify/templates/{plan,tdd}-template.md
.specify/workflows/core-api-sdd/workflow.yml
package.json                     # linhas 48-50
.zed/tasks.json                  # linha 60
.gitignore                       # bloqueia reintrodução
README.md · docs/04-dev-guide.md · .claude/README.md · handbook/CHANGELOG.md

# CRIADO
handbook/architecture/adr/0055-retire-w0-w3-pipeline.md

# INTOCADO — invariante da feature
src/**                           # 0 arquivos alterados
handbook/architecture/adr/0001-0054   # imutáveis
specs/*/                         # ~40 arquivos congelados como histórico
.claude/worktrees/               # 11 worktrees, tratados na integração
```

**Structure Decision**: nenhuma estrutura nova. A feature apenas subtrai de diretórios existentes.
A única adição é um ADR em `handbook/architecture/adr/`, exigido pela Governance da constituição
para alterar princípio.

## Complexity Tracking

> Preenchido porque o Constitution Check tem violação a justificar.

| Violation                                                   | Why Needed                                                                                                                                                                                                              | Simpler Alternative Rejected Because                                                                                                                                                                                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Princípio I removido** (marcado NÃO-NEGOCIÁVEL)           | O princípio institui o aparato que se tornou o principal poluidor do contexto — medido: injeção em 100% dos prompts, 29 KB fixos por sessão, 16 MB de ruído versionado. Mantê-lo é manter a causa do problema relatado. | _Manter as waves como opcionais_ — regra opcional em `.md` não é regra, é ruído que volta a ser citado (lição `prefer-mechanical-enforcement-over-md-rules`). _Manter e só tirar os hooks_ — deixa a doutrina órfã apontando para comandos inexistentes. |
| **Feature entregue sem passar pela pipeline W0→W3**         | Abrir ticket de pipeline para remover a pipeline é autorreferente e contraditório — e produziria mais um `STATE.json` no acervo que está sendo evacuado.                                                                | _Abrir ticket mesmo assim_ — cria o artefato que a feature elimina, no diretório que a feature esvazia.                                                                                                                                                  |
| **Seção "Estimativa de Pipeline (W0 size)" não preenchida** | A seção pertence ao template `plan-template.md` e pressupõe o processo que esta feature remove. A própria feature deleta essa seção do template (Etapa 3e).                                                             | _Preencher com um tamanho fictício_ — registro falso num artefato que deixa de existir.                                                                                                                                                                  |

## Migrations Drizzle (core-api)

- **Mudanças de schema**: **[x] nenhuma**
- **Prefixo de isolamento** (ADR-0014): N/A
- **Outbox**: não
- **Comando `db:generate`**: não se aplica
- **Restrições MySQL 8** (ADR-0020): N/A

## Contrato HTTP

**N/A** — nenhuma rota criada, alterada ou removida. A feature não toca a borda HTTP.

## Fases executadas

| Fase                        | Status | Saída                                                                    |
| --------------------------- | ------ | ------------------------------------------------------------------------ |
| **Phase 0 — Research**      | ✅     | `research.md` — R0 (citações canônicas) a R8 (ordem), + riscos residuais |
| **Phase 1 — Design**        | ✅     | `data-model.md`, `contracts/verification.md`, `quickstart.md`            |
| **Phase 1 — Agent context** | ✅     | `CLAUDE.md` atualizado entre os markers SPECKIT                          |
| **Phase 2 — Tasks**         | ⏭️     | `/speckit-tasks`                                                         |

## Descobertas do Phase 0 que alteraram o plano

Três achados não previstos na spec, todos medidos:

1. **`core.bare = true` com árvore populada** — bloqueia FR-019/021/023 e vinha **mascarando 19
   arquivos modificados** como "clean". Virou Etapa 0, exige OK do usuário (R2).
2. **7 arquivos alvo estão sujos e não commitados** — implementação de `wave-override` que a Etapa 4
   destruiria sem possibilidade de recuperação. Virou Etapa 1, bloqueante (R3).
3. **Nenhum ADR institui a pipeline** — as 7 menções são referenciais. Não há `supersedes` a fazer;
   basta ADR novo reconciliando a leitura do `0054` e assumindo os links quebrados de `0018`/`0034`
   como custo documentado (R6).
