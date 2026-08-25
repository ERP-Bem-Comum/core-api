---
name: eslint-worktrees-oom
description: ESLint flat config não lê .gitignore — worktrees em .claude/worktrees/ (~1748 .ts) infla o programa TS do projectService e causa OOM do V8 no lint type-aware
metadata:
  type: project
---

O `eslint.config.js` usa `projectService: true` (type-aware) sem excluir `.claude/worktrees/**`. O ESLint 10 flat config NÃO lê `.gitignore` automaticamente — `.claude/worktrees/` está no .gitignore mas não no campo `ignores` do flat config. Resultado: ~1748 arquivos .ts adicionais (duplicatas de src/tests de branches anteriores) entram no programa TS, triplicando o heap consumido pelo type checker.

**Evidência:**
- `find .claude/worktrees -name "*.ts" | wc -l` → 1748 arquivos
- ESLint enxerga 2586 arquivos; sem worktrees seriam ~838
- `pnpm run lint` falha com FATAL OOM em ~2028 MB (limite default V8 ~2 GB)
- `NODE_OPTIONS="--max-old-space-size=3072" pnpm run lint` → EXIT 0 (workaround empírico)

**Correção:** adicionar `.claude/worktrees/**` (e `.claude/agent-memory/**`, `scripts/**` se não quiser type-check ali) ao campo `ignores` do `eslint.config.js`.

**Why:** flat config não herda .gitignore; campo ignores deve ser explícito.
**How to apply:** ao diagnosticar OOM de lint neste projeto, checar worktrees antes de aumentar heap. Sempre adicionar `.claude/**` ao `ignores` em novos projetos com worktrees.
