---
name: bash-cwd-resets-across-worktrees
description: Bash tool cwd resets between calls and can land in a SIBLING worktree, not the one assigned for review — use absolute paths or `git -C`/`cd absoluto &&` always
metadata:
  type: feedback
---

Numa revisão multi-agente (vários `.claude/worktrees/<nome>` ativos ao mesmo tempo, um por
frente), chamadas de `Bash` com caminho relativo (`git diff dev -- src/...`, `grep -rl ... tests/`,
`find tests ...`) podem rodar dentro de OUTRO worktree — não o que a tarefa aponta. Medido nesta
sessão: `pwd` no meio da revisão devolveu `.claude/worktrees/segmento-j52-891` quando a tarefa era
revisar `.claude/worktrees/pre-voo-reguas-837`. Um `grep` relativo por `RemittanceBilletPayment`
leu o arquivo do worktree errado (que já tinha os campos do #891) e quase virou um achado falso —
"o reader não popula campo obrigatório" — que não existia na branch sob revisão.

**Por quê:** o ambiente documenta "Agent threads always have their cwd reset between bash calls,
please only use absolute file paths" — mas o reset não é para um default fixo e óbvio; na prática
pode aterrissar no último worktree tocado por QUALQUER agente do time, já que várias frentes
(`cnab-837`, `ts-837`, `zod-837`, etc.) rodam em paralelo. Um `cd <worktree> && comando1 && comando2`
dentro da MESMA chamada de Bash é seguro (cwd persiste dentro da chamada); confiar em cwd entre
chamadas separadas não é.

**Como aplicar:** em revisão de worktree específico, todo comando shell usa `git -C "$WT" ...` ou
prefixa com o path absoluto do worktree — nunca `git diff dev -- <relativo>` solto. Ferramentas
`Read`/`Write`/`Edit` são sempre absolutas e portanto confiáveis nesse cenário; é só `Bash` com
caminho relativo que quebra. Ao notar um achado "estranho" (campo ausente que parecia óbvio demais),
reconferir com `pwd` + path absoluto antes de reportar — foi essa reconferência que evitou o falso
positivo aqui.
