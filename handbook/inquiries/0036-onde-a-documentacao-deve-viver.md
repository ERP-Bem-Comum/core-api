---
inquiry: 0036
title: 'Onde a documentação deve viver — o critério do `grep` e os 30 MB de handbook/reference'
state: open
opened: 2026-09-02
last_reviewed: 2026-09-02
open_outputs: 2 # destino do reference/ e do specs/ — ver §6
---

# Inquiry-0036: Onde a documentação deve viver — o critério do `grep` e os 30 MB de `handbook/reference`

- **Opened by:** Claude Code, na branch `chore/organiza-arvore-e-docs`
- **Asked to:** dono do repo — a decisão move 84 % do volume documental e reescreve 707 citações do harness
- **Impact:** decisão operacional sobre a árvore do repositório · afeta 12 agentes de `.claude/agents/`

---

## 1. Contexto

O repositório acumulou quatro árvores de documentação com propósitos sobrepostos — `handbook/`,
`docs/`, `context/` e `_workspace/` — e a percepção de quem trabalha nele é que **arquivo parado
demais gera mais ruído que informação**.

A premissa que motivou a pergunta precisa de uma correção factual antes de qualquer decisão: o Claude
Code **não lê esses diretórios automaticamente**. O que entra em contexto sem pedir é o
[`CLAUDE.md`](../../CLAUDE.md) e as rules de `.claude/rules/` que casam por `path_glob_match`. Esses
quatro diretórios só entram quando **um agente vai buscá-los**.

O custo real, portanto, não é leitura automática — é **poluição do espaço de busca**: todo `grep -r`
do repositório atravessa 1.061 arquivos de documentação de fornecedor.

---

## 2. Pergunta(s) feita(s)

```
Analise onde no gh do core-api FICARIA melhor os arquivos que existem dentro de handbook/,
_workspace/, context/ e docs/. Quero usar o github/core-api como ferramenta para organizar
tudo de uma maneira que tenha: versão, temporalidade, facilidade de lida e visibilidade,
sem causar conflito na branch e no source em si.
```

---

## 3. Respostas / Investigação

### 2026-09-02 — medição da árvore (fonte primária: o próprio repositório)

Atividade medida por `git log --since='90 days ago'` — **não** por `mtime`, que numa worktree recém-criada
reporta a hora do checkout e marcaria todo arquivo como alterado hoje. Acoplamento medido por citações a
cada diretório dentro de `.claude/`.

| Diretório                | Arq.  | Commits/90d | Refs em `.claude/` |
| :----------------------- | ----: | ----------: | -----------------: |
| `handbook/architecture`  |    75 |          51 |                169 |
| `handbook/inquiries`     |    39 |          29 |                 15 |
| `handbook/infrastructure`|    14 |          27 |                  0 |
| `handbook/tickets`       |    33 |          24 |                  0 |
| `context/`               |   102 |          17 |                  1 |
| `handbook/reviews`       |     4 |           7 |                  0 |
| `handbook/domain_questions` | 22 |           6 |                 13 |
| `handbook/reference`     | 1061 |           6 |            **707** |
| `docs/`                  |     8 |           5 |                  0 |
| `handbook/specs`         |   381 |           4 |                  2 |
| `handbook/interviews`    |    51 |       **0** |                 18 |
| `handbook/legacy_docs`   |     4 |       **0** |                  0 |

`handbook/reference` + `handbook/specs` somam **1.442 de 1.720 arquivos** — 84 % do volume.

### 2026-09-02 — o que cada primitiva do GitHub entrega

| Primitiva                     | Versão      | Temporalidade | Zero conflito com o source | Agente faz `grep`? |
| :---------------------------- | :---------- | :------------ | :------------------------- | :----------------- |
| Repo (hoje)                   | ✅ commit   | ⚠️ só `git log` | ❌ polui diff e busca      | ✅                 |
| Wiki (`.wiki.git`)            | ✅ git próprio | ⚠️         | ✅ repo separado           | ⚠️ só se clonar    |
| Discussions                   | ❌          | ✅ nativa     | ✅                         | ❌                 |
| Issues                        | ❌          | ✅ nativa     | ✅                         | ❌                 |
| Releases (asset `.tar.gz`)    | ✅ tag      | ✅            | ✅                         | ❌                 |
| Repo separado + submodule     | ✅          | ✅            | ✅                         | ✅                 |

---

## 4. Análise interna

**O eixo que decide não é "isso é documentação?" — é "algum agente precisa `grep`ar isso?"** Discussions
e Issues são invisíveis para busca local: o que o harness lê tem de continuar sendo arquivo em disco.
É esse critério, e não a natureza do texto, que separa o que sai do que fica.

O `handbook/reference` é o caso extremo dos dois lados: **quase imóvel** (6 commits em 90 dias, é
documentação de fornecedor vendorizada) e **o mais acoplado de todos** (707 citações). Tirá-lo limpa
toda busca no repositório; tirá-lo errado cega 12 agentes de uma vez.

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A** — Repo separado `core-api-reference` + git submodule | `grep` do agente continua funcionando; 30 MB saem do diff, do clone raso e da busca; doc de fornecedor ganha versão própria e independente do produto | reescrever 707 caminhos; todo clone precisa de `--recurse-submodules`; CI precisa do checkout recursivo | ⏳ candidata |
| **B** — Não mexer | risco zero para os 12 agentes | 1.061 arquivos poluindo toda busca, permanentemente | ⏳ status quo |
| **C** — Migrar para o MCP `acdg-skills` | elimina o peso por completo; a base de teoria já é servida por MCP no fluxo atual | cria dependência de rede para ler doc; **não verificável hoje** — o servidor está fora do ar (`ENOTFOUND mcp-server.tailf5e6ca.ts.net`), então não há como inventariar o que já está indexado | ⏳ bloqueada por medição |
| **D** — Wiki do GitHub | zero conflito com o source; versionado em git próprio | o agente perde o `grep` local a menos que clone o `.wiki.git`, o que recria o problema | ❌ rejeitada — falha no critério decisivo |

---

### 2026-09-02 (mais tarde) — o bloqueador mudou de natureza

O host `mcp-server.tailf5e6ca.ts.net` **voltou a resolver** e a tailnet está ativa. O `ENOTFOUND` do início
da sessão era queda de rede, não servidor desligado. Mas os servidores MCP conectam **na inicialização da
sessão**: uma sessão que começou com o host fora do ar não os recupera enquanto durar.

O bloqueador deixou de ser "o servidor está fora" e passou a ser "esta sessão não alcança o MCP" — o que
uma sessão nova resolve sozinha.

---

## 5. Decisão final

**PENDENTE, e agora destravável.** A alternativa **C** passou a ser avaliável: basta uma sessão nova, com o
MCP `acdg-skills` conectado no boot, para inventariar o que ele já indexa e comparar com os 1.061 arquivos
de `handbook/reference/`.

A pergunta a responder com esse inventário, e que decide entre **A** e **C**: *quanto do `reference/` o
`acdg-skills` já serve?* Se a cobertura for alta, **C** elimina o peso sem custo de migração e a decisão é
sobre aceitar dependência de rede para ler doc. Se for baixa, **A** é o caminho, e o custo real é reescrever
os 707 caminhos — mecânico, mas amplo o bastante para pedir gate próprio.

**O que NÃO fazer sem esse número:** criar o repositório separado. É ação externa, e escolher A por descarte
de C não medido repete o erro que esta mesma sessão cometeu com `context/decisions/` — classificar por
aparência e descobrir o consumidor depois.

O que **já foi decidido** nesta sessão, e não depende deste bloqueador:

- `context/` (102 arquivos) — removido; o git preserva o histórico.
- Datado e episódico (`operations/`, `incidents/`, `reviews/`, `research/`, `po-feedback/`,
  `_workspace/debate-ambiente-de-dados/`) — vai para Discussions, que tem temporalidade nativa.
- Norma viva (`architecture/`, `inquiries/`, `domain_questions/`, `runbooks/`, `infrastructure/`) —
  fica no repositório, versionada com o código e revisada por PR.

---

## 6. Saídas (outputs concretos)

- [ ] Destino do `handbook/reference/` (1.061 arq · 707 refs) — reavaliar com o MCP `acdg-skills` no ar.
- [ ] Destino do `handbook/specs/` (381 arq · 2 refs · 4 commits/90d) — provável mesmo caminho do `reference/`.
- [x] Issue [#960](https://github.com/ERP-Bem-Comum/core-api/issues/960) — a skill canônica de domínio
      cita `handbook/domain/`, aposentado por redirect, e o gate de links não vê caminho em código inline.

---

## 7. Referências

- [`handbook/redirects.json`](../redirects.json) — mecanismo de caminho aposentado com destino declarado.
- [`scripts/handbook/link-scan.ts`](../../scripts/handbook/link-scan.ts) — gate de links; `pnpm run docs:links`.
- [ADR-0057](../architecture/adr/0057-claude-md-as-canonical-agent-doc.md) — âncoras históricas para
  `context/decisions/` **MUST NOT** ser reescritas.
- [ADR-0064](../architecture/adr/0064-outbox-fanout-per-consumer-progress.md) §"Limite conhecido" —
  ancora um gatilho normativo em `context/planning/ASYNC-MESSAGING-STRATEGY.md:176`.
