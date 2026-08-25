# Quickstart — Aposentadoria da pipeline W0→W3

**Feature**: `038-retire-pipeline-w0w3` · **Data**: 2026-07-30

Roteiro de execução em 6 etapas, uma por commit. Cada etapa é independentemente reversível
(`git revert` do commit correspondente). As asserções citadas estão em
[`contracts/verification.md`](./contracts/verification.md).

> ⚠️ **As etapas 0 e 1 não são opcionais e não podem ser reordenadas.** Pular a etapa 1 destrói
> trabalho de forma irrecuperável.

---

## Etapa 0 — Destravar o repositório ⚠️ exige OK do usuário

O repositório está marcado `bare = true` embora tenha árvore de trabalho completa. Nesse estado,
nenhuma operação de índice funciona — e o defeito já vinha **mascarando 19 arquivos modificados**
como se a árvore estivesse limpa.

```bash
git config core.bare false

# Verificar (C0.1, C0.2)
git rev-parse --is-bare-repository   # → false
git status --short                    # → deve listar 19 arquivos
git worktree list                     # → os 11 worktrees seguem íntegros
```

**Por que exige autorização**: altera configuração do repositório e tem efeito além desta feature.
Reversível com `git config core.bare true`.

---

## Etapa 1 — Preservar o trabalho pendente ⚠️ irreversível se pulada

7 arquivos que a Etapa 4 vai **deletar** estão modificados e não commitados — implementação de
`wave-override` do ticket `PIPELINE-STATE-WAVE-OVERRIDE`.

```bash
# Confirmar o escopo do que está sujo
git status --short -- scripts/pipeline tests/pipeline

# Preservar em commit próprio, antes de qualquer remoção
git add scripts/pipeline tests/pipeline
git commit -m "chore(pipeline): preserva wave-override antes da aposentadoria (#038)"
```

Decidir também sobre os untracked `.claude/.pipeline/PIPELINE-STATE-WAVE-OVERRIDE/` e
`handbook/process/` — commitar ou aceitar que não serão recuperáveis.

**Gate**: `C0.3` deve passar antes de seguir. Deletar arquivo com modificação não commitada **não
tem volta** — não existe blob no object store para restaurar.

---

## Etapa 2 — Parar a contaminação (US1)

A fatia que resolve a dor aguda. Nada é destruído; só automação é desligada.

```bash
git rm .claude/hooks/inject-ticket-context.sh
git rm .claude/hooks/subagent-stop-validate.sh
```

Editar à mão:

- `.claude/settings.json` — remover os blocos `UserPromptSubmit` e `SubagentStop` inteiros.
  **Preservar** `PreToolUse` (`block-npm.sh` — ADR-0012), `PostToolUse`, `Stop`, `SessionStart`.
- `.claude/hooks/session-start-context.sh` — remover a varredura de `.claude/.pipeline`;
  **manter** git/branch e planejamento pausado.
- `.claude/statusline.sh` — remover as linhas 52-56 (ticket ativo); **manter** modelo, branch,
  PR, cache, custo.

**Verificar**: `C1.1` a `C1.7`.
**Prova real**: abrir sessão nova e confirmar que nenhum bloco `[ticket-context]` aparece.

```bash
git commit -m "chore(claude): remove hooks que injetam estado de ticket no contexto (#038)"
```

---

## Etapa 3 — Enxugar a doutrina (US2)

Ordem imposta pela Governance da constituição: **ADR primeiro**, emenda depois.

**3a. ADR novo** — `handbook/architecture/adr/0056-retire-w0-w3-pipeline.md`. Registra a
aposentadoria e declara como ler os ADRs que citam a pipeline (`0018`, `0034`, `0054`). **Não é
`supersedes`** — nenhum ADR instituía a pipeline. Registrar em `handbook/CHANGELOG.md`.

> Princípio IX: a decisão exige citação literal ≥4 linhas de livro canônico. As três citações já
> estão extraídas e com grounding verificado em [`research.md`](./research.md) §R0 (Valente sobre
> espaço mental, Uncle Bob sobre código morto, Beck sobre o que TDD de fato é).

**3b. Constituição** — emendar o Princípio I preservando teste-antes-de-código; remover a seção
RED→YELLOW→GREEN (linhas 75-81) e a linha "Pipeline state" (95). **Princípio II fica intacto.**
Subir versão 1.2.0 → **2.0.0**.

**3c. Contexto default** — `AGENTS.md` (seção 95-114, comandos 198-216, anti-padrão #6, linhas
60/64/80/120/128/167) e `.claude/output-styles/erp-contracts.md` (seção 40-49).

**3d. Skills e agente** — `git rm -r .claude/skills/pipeline-maestro`. **Manter**
`ts-quality-checker` (hook `speckit.verify` é `optional: false`) e `code-reviewer`, apenas tirando
o rótulo de wave. Podar `contratos-orchestrator.md` (linhas 8, 14, 18, 34).

**3e. Documentação** — `.claude/README.md`, `README.md`, `docs/04-dev-guide.md`, templates
`.specify/`, `workflow.yml`. Remover `.claude/runbooks/spec-driven-pipeline.md`.

```bash
# Medir a redução (SC-002) — baseline: AGENTS.md = 29.487 bytes
wc -c AGENTS.md .claude/output-styles/erp-contracts.md

git commit -m "docs(agents): aposenta a doutrina W0→W3 do contexto default (#038)"
```

**Verificar**: `C2.1` a `C2.11`, `C5.1`, `C5.2`.

---

## Etapa 4 — Remover a ferramenta (US3)

```bash
git rm -r scripts/pipeline tests/pipeline
```

Editar: `package.json` (remover as 3 linhas `pipeline:*`) e `.zed/tasks.json:60`.

```bash
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
git commit -m "chore(scripts): remove a CLI de pipeline e sua suíte (#038)"
```

**Verificar**: `C3.1` a `C3.5`. A asserção `C3.5` (`git diff -- src/` vazio) é a invariante central
da feature.

---

## Etapa 5 — Evacuar o acervo (US4)

**Nunca `mv` cego.** O protocolo é copiar → verificar → só então remover.

```bash
DEST=../core-api-pipeline-archive
ORIGEM=$(find .claude/.pipeline -type f | wc -l)   # esperado: 3436

cp -R .claude/.pipeline "$DEST"
DESTINO=$(find "$DEST" -type f | wc -l)

# GATE BLOQUEANTE (C4.1) — divergência de 1 arquivo aborta
[ "$ORIGEM" -eq "$DESTINO" ] || { echo "ABORTAR: $ORIGEM != $DESTINO"; exit 1; }

git rm -r --cached .claude/.pipeline
rm -rf .claude/.pipeline
```

Adicionar ao `.gitignore`:

```gitignore
# Acervo da pipeline W0→W3 (aposentada — ADR-0056); arquivado fora do repo
.claude/.pipeline/
```

```bash
git commit -m "chore(pipeline): evacua o acervo de 544 tickets para fora do repo (#038)"
```

**Verificar**: `C4.1` a `C4.5`.

---

## Verificação final

```bash
# Gate de qualidade
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test

# Nenhuma invocação remanescente (SC-003)
grep -rIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=specs \
  -E "pipeline:(state|status|metrics)|scripts/pipeline" .

# Invariante da feature (SC-007)
git diff --name-only <base>..HEAD -- src/    # → vazio

# Reversibilidade por camada (SC-008)
git log --oneline <base>..HEAD               # → ≥ 6 commits atômicos
```

**A prova que importa (SC-009)**: abrir uma sessão nova, pedir uma mudança de código qualquer, e
confirmar que nada propõe abrir ticket nem percorrer waves.

---

## Se algo der errado

| Situação                             | Ação                                                              |
| ------------------------------------ | ----------------------------------------------------------------- |
| Etapa individual deu problema        | `git revert <commit-da-etapa>` — as camadas são independentes     |
| Acervo evacuado por engano           | Está em `$DEST` **e** no histórico até o commit da Etapa 5        |
| `core.bare` causou efeito inesperado | `git config core.bare true` restaura                              |
| Gate vermelho após uma etapa         | Princípio II (preservado): corrigir a causa agora, não justificar |
| Worktree quebrou                     | `git worktree list` e `git worktree repair`                       |
