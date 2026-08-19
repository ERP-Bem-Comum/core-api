---
name: git-local-expert
description: >-
  Especialista no git LOCAL — o que o `gh` não cobre: contrato de ambiente dos hooks (`GIT_DIR` e
  companhia), worktrees e o que elas compartilham, config por escopo, index/staging, reflog e
  resgate de trabalho perdido. Use SEMPRE que precisar criar ou consertar worktree, escrever ou
  depurar hook, entender por que um comando git se comporta diferente dentro do pre-commit, isolar
  repositório de teste, decidir onde uma config vive, ou recuperar commit/branch que "sumiu".
  Aciona em: "criar worktree", "worktree quebrada", "must be run in a work tree", "core.bare",
  "GIT_DIR", "hook não funciona", "o teste mexeu no meu repositório", "perdi o commit", "reflog",
  "detached HEAD", "git config não pega", "index travado", "recuperar branch deletada". NÃO é para
  operações do GitHub (PR, issue, release) — isso é `gh`, e para issue existe [[issue-report]].
---

# git-local-expert — o git abaixo do GitHub

## Persona

Você trata o repositório como **estado inspecionável**, nunca como caixa-preta. Toda afirmação sobre
"onde o git está olhando" vem de um comando que responde, não de suposição — e a diferença não é
estilo: as variáveis de ambiente mudam a resposta sem mudar o `cwd`, e é exatamente aí que se erra.

> **Fronteira:** git local — repositório, worktree, config, index, refs, hooks. Operações de
> **plataforma** (PR, issue, review, release, Actions) são `gh`. Rodar o gate de qualidade é
> [`ts-quality-checker`](../ts-quality-checker/SKILL.md). Registrar achado é
> [`issue-report`](../issue-report/SKILL.md).

---

## 1. Pergunte ao git; não deduza do caminho

O `cwd` **não** determina o repositório em que o git opera. Cinco perguntas, cinco respostas
autoritativas:

```bash
git rev-parse --git-dir            # onde estão os objetos e refs desta invocação
git rev-parse --show-toplevel      # a raiz da work tree (falha se não houver uma)
git rev-parse --git-common-dir     # o .git COMPARTILHADO — difere do --git-dir em worktree linkada
git rev-parse --local-env-vars     # as variáveis que sequestram as respostas acima
git config --show-origin --get <chave>   # de QUAL arquivo aquele valor veio
```

`--show-origin` é o que encerra discussão sobre config: ele imprime o arquivo. Um valor que "não
pega" quase sempre está sendo sobrescrito por um escopo mais específico, e a ordem é
`system → global → local → worktree`, com **o último vencendo** (`git-config(1)` §FILES).

---

## 2. O ambiente é parte do repositório — e é a armadilha nº 1

`githooks(5)` é explícito, e vale citar porque a consequência é contraintuitiva:

> _"Environment variables, such as GIT_DIR, GIT_WORK_TREE, etc., are exported so that Git commands
> run by the hook can correctly locate the repository. If your hook needs to invoke Git commands in a
> foreign repository or in a different working tree of the same repository, then it should clear
> these environment variables."_

Traduzindo para a consequência prática: **dentro de um hook, `GIT_DIR` vence o `cwd`.**

```bash
# Dentro do pre-commit, isto NÃO opera em /tmp/fixture — opera no repositório real:
git -C /tmp/fixture init

# A receita canônica, do próprio manual:
(unset $(git rev-parse --local-env-vars); git -C /tmp/fixture init)
```

`git rev-parse --local-env-vars` é a **lista mantida pelo git** — 15 variáveis no 2.50.1, entre elas
`GIT_DIR`, `GIT_INDEX_FILE`, `GIT_WORK_TREE`, `GIT_OBJECT_DIRECTORY`, `GIT_CONFIG`, `GIT_COMMON_DIR`.
Preferi-la a uma lista escrita à mão é o ponto: a lista à mão desatualiza em silêncio, e o modo de
falha é o da seção 5.

### O que isso já custou aqui

Medido em **19/08/2026**: três testes criavam repositório de fixture passando só `cwd`
(`tests/scripts/tombstone.test.ts`, `gate-blocker.test.ts`, `link-scan.test.ts`). O
`.githooks/pre-commit` roda a suíte inteira, então **uma tentativa de commit** bastava para o
`git init` do fixture marcar o repositório real como `core.bare = true` e para os `git config
user.*` seguintes gravarem a identidade do fixture no `.git/config` de verdade.

O modo de falha é o pior possível para detecção: **`pnpm test` avulso é inofensivo**, porque fora do
hook não existe `GIT_DIR` no ambiente. A suíte passa limpa; o dano só ocorre dentro do `git commit`,
onde a saída rola e ninguém lê — e **fica** depois que o commit é recusado.

Corrigido no PR #758, com o helper `tests/support/git-fixture.ts` (`gitFixtureEnv` para quem
constrói o `env` do subprocesso, `withoutGitEnv` para quem chama código de produção que herda o
ambiente do processo). O mecanismo que impede a reintrodução é a issue **#759** — enquanto ela não
fechar, **este parágrafo é a única barreira**.

> ⚠️ Ao escrever teste que cria repositório git: `cwd` sozinho **não isola nada**. E não é só
> `spawnSync`/`execFileSync` — código de produção que invoca `git` herdando o ambiente do processo
> (em `scripts/`, por exemplo) está **certo** em fazê-lo, porque no uso real roda dentro do hook e o
> `GIT_DIR` dele É o repositório a inspecionar. Quem o aponta para um fixture é que precisa limpar.

---

## 3. Worktree: o que é compartilhado, e o que morde

Uma worktree linkada tem `.git` como **arquivo** (aponta para `<comum>/.git/worktrees/<id>/`), HEAD e
index próprios — e **config compartilhado**. Isso é o que surpreende: mudar config numa worktree
muda em todas.

```bash
git worktree list                    # todas, com HEAD e branch de cada
git worktree add <path> -b <branch> origin/dev
git worktree remove <path>           # recusa se houver mudança não commitada
git worktree prune                    # limpa metadado de worktree que sumiu do disco
git worktree repair                   # conserta os ponteiros após mover diretórios
```

### O gotcha que derruba TODAS as worktrees de uma vez

`git-worktree(1)` §CONFIGURATION FILE:

> _"If the config variables `core.bare` or `core.worktree` are present in the common config file and
> `extensions.worktreeConfig` is disabled, then they will be applied to the main worktree only."_
> (…) _"Note that in this file, the exception for `core.bare` and `core.worktree` is gone."_
> (…) _"`core.bare` should not be shared if the value is `core.bare=true`."_

Leia a segunda frase junto com a primeira: **habilitar `extensions.worktreeConfig` REMOVE a proteção
que confinava `core.bare` ao worktree principal.** Com a extensão ligada — que é o caso deste
repositório — um `core.bare = true` no config comum derruba o checkout principal **e** todas as
linkadas, com `fatal: this operation must be run in a work tree`.

Foi o que aconteceu em 19/08/2026: o vazamento da seção 2 escreveu `core.bare = true`, e o efeito não
ficou contido no fixture nem na worktree — parou o repositório inteiro.

Config que **nunca** deve ser compartilhada entre worktrees (o manual as lista):
`core.worktree`, `core.bare=true`, `core.sparseCheckout`. Para essas, o escopo certo é
`git config --worktree <chave> <valor>` — que só existe se `extensions.worktreeConfig` estiver
ligado; sem ele, `--worktree` é sinônimo de `--local` (`git-config(1)`).

---

## 4. Diagnóstico: "meu repositório quebrou"

Três perguntas, nesta ordem. A primeira que responder errado é a causa.

| # | Pergunta | Comando | Sintoma quando é essa |
| :-- | :--- | :--- | :--- |
| 1 | O git está olhando o repositório certo? | `git rev-parse --git-dir --show-toplevel` | comandos agem "no lugar errado"; `git log` mostra outra história |
| 2 | Há variável de ambiente mandando? | `env \| grep ^GIT_` | funciona no terminal e falha no hook/CI (ou o contrário) |
| 3 | De onde veio esse valor de config? | `git config --show-origin --get <chave>` | `--global` "não pega"; identidade de commit errada |

`fatal: this operation must be run in a work tree` com `git log` funcionando é a assinatura de
`core.bare = true` — pergunta 3, chave `core.bare`.

---

## 5. Resgate: quase nada se perde de verdade

```bash
git reflog --date=iso                 # tudo que HEAD já apontou; o ponto de partida
git reflog show <branch>              # o histórico daquela ref, inclusive após reset --hard
git branch <nome-novo> <sha-do-reflog>   # ressuscita branch deletada
git fsck --lost-found                 # objetos órfãos, quando nem o reflog tem
git checkout ORIG_HEAD                # onde HEAD estava antes de merge/rebase/reset
git stash list && git stash show -p stash@{0}
```

Regra de ouro: **antes de qualquer operação destrutiva, anote o SHA** (`git rev-parse HEAD`). O
reflog é local, expira (90 dias por padrão) e **não** existe em clone novo — não é backup, é rede.

Situações e a saída:

| Situação | Saída |
| :--- | :--- |
| `reset --hard` errado | `git reset --hard ORIG_HEAD`, ou o SHA do reflog |
| Branch deletada | `git reflog` → `git branch <nome> <sha>` |
| Rebase que embolou | `git rebase --abort` (durante) · `ORIG_HEAD` (depois) |
| Commit na branch errada | `git cherry-pick` para a certa, `git reset --hard HEAD~1` na errada |
| Amend indevido | o commit anterior está no reflog — nada foi destruído |
| `detached HEAD` com trabalho | `git branch <nome>` **antes** de trocar de branch |

---

## 6. Neste repositório em particular

Não repito aqui o que já é norma no [`CLAUDE.md`](../../../CLAUDE.md) — leia-o para
`git config core.hooksPath .githooks` (exigido uma vez por clone), o trailer `Assisted-by` e a
proibição de `Signed-off-by` gerado por IA. O que esta skill acrescenta é o comportamento **local**:

- **`.git/config` é compartilhado por todas as worktrees**, inclusive as de `.claude/worktrees/`
  (que é gitignored). Config escrita numa vale para o trabalho do humano na principal.
- **O `pre-commit` roda o gate inteiro** — typecheck, format, lint e a suíte. Um commit custa
  minutos, e **executa código de teste com `GIT_DIR` apontando para o repositório real** (seção 2).
- **O hook de formatação reformata a working tree DEPOIS do commit.** Conferir `git status` antes de
  concluir: o commit pode estar feito e a árvore, suja.
- **`dev` e `main` são protegidas** — sem push direto; o caminho é branch + PR para `dev`.
- **Escape de emergência:** `git commit --no-verify` pula o hook. Usar exige dizer ao humano que
  usou, e por quê.

---

## 7. Anti-padrões

| ❌ Errado | ✅ Certo |
| :--- | :--- |
| Confiar que `cwd`/`-C` isola o repositório dentro de um hook | Limpar `$(git rev-parse --local-env-vars)` |
| Lista de variáveis `GIT_*` escrita à mão | `git rev-parse --local-env-vars`, ou filtro por prefixo |
| Supor de qual arquivo veio uma config | `git config --show-origin --get <chave>` |
| `core.bare`/`core.worktree` no config comum com worktrees | `git config --worktree` |
| `git worktree remove` para worktree movida | `git worktree repair`, depois remover |
| Deletar branch achando que perdeu o trabalho | `git reflog` antes de qualquer conclusão |
| `reset --hard` sem anotar o SHA | `git rev-parse HEAD` primeiro |
| `--no-verify` silencioso | Só com causa declarada ao humano |
| Usar `gh` para o que é git local (e vice-versa) | `gh` = plataforma; `git` = repositório |

---

## 8. Skills relacionadas

Gate de qualidade que o hook dispara: [`ts-quality-checker`](../ts-quality-checker/SKILL.md) ·
registrar achado fora de escopo: [`issue-report`](../issue-report/SKILL.md) · onde um teste vive:
[`test-pyramid-engineer`](../test-pyramid-engineer/SKILL.md).

---

## 9. Changelog

- **2026-08-19:** Criação. Nasceu do incidente da #751/#758 — o `git commit` do repositório
  corrompia o próprio `.git/config`, e nenhum orquestrador de plataforma teria pego, porque a causa
  era o contrato de ambiente dos hooks. Afirmações conferidas contra `githooks(5)`,
  `git-worktree(1)` e `git-config(1)` do git 2.50.1, e contra a saída real dos comandos citados.
