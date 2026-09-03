---
name: feedback-probe-precisa-de-cwd-explicito
description: Probe de tsc/eslint em review de worktree exige --dir absoluto; o cwd do Bash cai noutra worktree entre chamadas e produz "verde" de outro commit
metadata:
  type: feedback
---

Em revisão dentro de `.claude/worktrees/<x>/`, **todo** comando de gate roda com caminho absoluto
explícito — `pnpm --dir "$W" run typecheck`, `git -C "$W" …` — nunca com caminho relativo.

**Why:** o cwd do Bash de sub-agente **reseta entre chamadas e pode cair noutra worktree do mesmo
repositório**. Medido em 01/09/2026 na review da #837: o `Edit` (caminho absoluto) escreveu em
`pre-voo-reguas-837`, e o `pnpm run typecheck` seguinte rodou em `segmento-j52-891` — devolveu
`EXIT=0` e eu quase reportei "a tese do autor é falsa, o typecheck não quebra" como achado #1. Com
`--dir` correto o mesmo probe deu `TS2366`. As duas worktrees têm a mesma árvore relativa, então
`cp src/…`, `grep src/…` e `git status` **funcionam** — só respondem sobre o commit errado, em
silêncio. O sintoma que denuncia: `git log --oneline -1` não bate com o commit sob revisão.

**How to apply:** primeira chamada de Bash da sessão define `W=<path absoluto>` e confere
`git -C "$W" log --oneline -1`. Nenhum resultado de gate entra no laudo sem ter sido produzido com
`--dir`/`-C`. Vale também para o revert: `git -C "$W" checkout -- <path>`.

Corolário para o revert de probe: se o arquivo a alterar já está **modificado e não commitado**,
`git checkout --` destrói trabalho alheio — desfazer com `Edit` inverso, não com git.

Ver também [[feedback-prove-green-by-merit]].
