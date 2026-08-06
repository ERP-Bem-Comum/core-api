---
name: review-method-replicate-head-logic-in-scratch
description: Para provar regressão sem tocar o working tree, replicar a lógica pura de HEAD num .mjs no scratchpad e comparar saídas — nunca git stash
metadata:
  type: feedback
---

Provar "isto é regressão, não comportamento pré-existente" exige rodar **as duas
versões**. Como revisor não altera o working tree (nem `git stash`, nem escrever em
`src/`), o caminho é: `git show HEAD:<path>` → copiar **só a função pura** (regex +
normalização, sem imports do projeto) para um `.mjs` no scratchpad → rodar os mesmos
inputs contra ele e contra o `structureText` atual (importado por caminho absoluto num
`.ts` com `node --experimental-strip-types`).

**Why:** afirmar regressão sem a saída de HEAD lado a lado é a forma mais fácil de um
achado virar falso positivo — o comportamento "errado" pode já existir há meses e não
ser do diff. No caso do reader de PDF, a comparação mostrou `52998224725` (HEAD) vs
`52998224725123` (diff) para o mesmo texto, e isso é o que torna o achado inegociável.

**How to apply:** vale para qualquer função pura de parsing/normalização. Confirmar
que a réplica bate com HEAD imprimindo o trecho de `git show HEAD:<path>` junto com o
resultado — a réplica é uma afirmação sobre HEAD e precisa ser auditável.

Mecânica: `node`/`pnpm` rodam direto no Bash via fnm
(`$HOME/.local/share/fnm/node-versions/v24.16.0/installation/bin`). Rodar a suíte alvo
com `node --test --experimental-strip-types tests/<dir>/*.test.ts` é mais rápido que
`pnpm test` inteiro — mas atenção: testes `.local.test.ts` do reader falham por fixture
gitignored e aparecem como `todo`, com `fail 0`. Isso **não** é regressão do diff.
