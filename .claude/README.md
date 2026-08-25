[← Voltar ao CLAUDE.md](../CLAUDE.md)

# `.claude/` — o harness do `core-api`

> **Só primitivas nativas do Claude Code.** Em 2026-08-06 os dois aparatos de processo que viviam
> aqui — a pipeline W0→W3 e o spec-kit — foram removidos. Não existe mais ticket, wave, `STATE.json`
> nem `.pipeline/`. Se algum texto ainda mandar "abrir ticket antes de tocar código", está velho:
> a regra é fazer a mudança e provar o verde no gate.

---

## O que vive aqui

| Diretório | O que é | Quando carrega |
| :--- | :--- | :--- |
| [`rules/`](./rules/) | Regras por camada, com `paths:` no frontmatter | Quando o Claude toca um arquivo que casa o path |
| [`skills/`](./skills/) | Conhecimento e workflows invocáveis por `/nome` | Descrição sempre; conteúdo ao ser usada |
| [`agents/`](./agents/) | Subagentes com contexto isolado | Quando um é acionado |
| [`hooks/`](./hooks/) | Enforcement determinístico | No evento de ciclo de vida |
| `agent-memory/` | Memória que os subagentes escrevem sozinhos | No subagente dono dela |
| `settings.json` | Permissões e registro de hooks | Sessão |

`agent-memory/` é **versionado e compartilhado com o time** — não está no `.gitignore`, e o
aprendizado dos subagentes chega a todo clone. O caminho é o oficial do campo `memory:` do
frontmatter de subagente: `memory: project` grava em `.claude/agent-memory/<nome-do-agente>/`
(`user` vai para `~/.claude/`, `local` para `.claude/agent-memory-local/`, esse sim fora do git).

> ⚠️ Este repositório é **público**. O que um subagente escreve aqui é publicado junto — auditar
> antes de commitar memória que cite host, credencial ou dado de cliente.

---

## Os hooks, e o que cada um garante

Registrados em `settings.json` — a lista canônica é o próprio arquivo, não esta tabela:

| Evento | Script | Garante |
| :--- | :--- | :--- |
| `SessionStart` | `ensure-git-hookspath.sh` | `core.hooksPath` aponta para `.githooks` neste clone |
| `PreToolUse` | `block-npm.sh` | `npm` nunca roda (ADR-0029) |
| `PreToolUse` | `block-cross-project-docker.sh` | Docker não toca projeto vizinho |
| `PreToolUse` | `block-inline-interpreter.sh` | Script utilitário não nasce como interpretador inline |
| `PostToolUse` | `prettier-write.sh` | Arquivo editado sai formatado |
| `PostToolUse` | `regen-inquiry-index.sh` | Índice de inquiries acompanha o que foi escrito |
| `Stop` | `stop-quality-gate.sh` | Turno não fecha com gate vermelho |
| `InstructionsLoaded` | `log-instructions-loaded.sh` | Registra quais rules entraram em contexto, e por quê |

⚠️ **Dois arquivos de `hooks/` não são hooks do Claude Code:** `pre-commit-typecheck.sh` e
`pre-commit-tombstone.sh` são **git hooks**, invocados por `.githooks/pre-commit`, nunca por
`settings.json`. Procurá-los no settings e não achar não significa que estejam mortos.

O `Stop` é o backstop da política de regressão zero: se o diff toca `.ts`, um dos arquivos de config
do gate ou uma `rules/*.md`, ele roda `typecheck`, `format:check`, `lint` e `test`, e devolve exit 2
se algo falhar. A rule entra na lista porque o bloco `verify:` dela afirma coisas sobre o código, e
quem confere essas afirmações — `tests/cleanup/rules-self-verify.test.ts` — só roda dentro de `test`. Todo caminho de saída dele
registra o veredito em `.last-quality-gate.log` — inclusive quando decide **não** rodar, para que
um log vazio signifique uma coisa só (o hook morreu antes de decidir).

Hook não é sugestão: é o único mecanismo que **garante**. Regra que só vive em prosa é pedido.

---

## Como o trabalho acontece agora

1. Faz a mudança.
2. Roda o gate — `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`.
3. Commita (o `.githooks/pre-commit` cobra os quatro de novo sobre o `.ts` staged).

Sem ticket, sem wave, sem REPORT. **Decisão** que precisa sobreviver vai para
[`handbook/architecture/adr/`](../handbook/architecture/adr/); **raciocínio em curso** vai para
[`handbook/inquiries/`](../handbook/inquiries/); **achado fora do escopo** vira issue pela skill
[`issue-report`](./skills/issue-report/SKILL.md), em vez de virar scope-creep.

---

## Hierarquia quando as fontes divergem

```
1. handbook/architecture/adr/   ← ADRs aceitos, imutáveis, vencem tudo
2. handbook/                    ← domínio, infra, inquiries, reference/
3. CLAUDE.md + .claude/rules/
4. .claude/agents/<agent>.md
5. .claude/skills/<skill>/SKILL.md
```

ADR aceito nunca é contrariado — abre-se outro que o `supersedes`. E ADR `Superseded` não é norma
viva: citar o revogado como razão canônica foi um defeito real deste harness, corrigido em
2026-08-06.

---

## Anti-padrões

1. Escrever `npm` em doc, PR ou script — sempre `pnpm`. O hook barra a execução, não o texto.
2. Citar handbook de memória — abrir o arquivo e citar literalmente.
3. Duplicar regra que já vive no handbook ou numa rule — referenciar, não copiar.
4. Tratar vermelho como "não é meu erro" — ver a política de regressão zero no `CLAUDE.md`.
5. Ressuscitar processo: ticket, wave, `STATE.json` ou pasta de execução. Foi removido por medição,
   não por gosto — o aparato custava mais contexto do que entregava.
