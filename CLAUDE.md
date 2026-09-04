# CLAUDE.md

Backend do ERP Bem Comum — modular monolith. Regras por camada vivem em [`.claude/rules/`](./.claude/rules/) e carregam quando o path casa. Stack, módulos e scripts: leia `package.json` e `src/modules/`, não confie em lista escrita aqui.

## Fonte de verdade — invariante

**O código é a verdade sobre o que existe. O ADR aceito é a verdade sobre o que foi decidido.**

Quando divergirem, o código descreve o presente. A divergência é um **defeito a registrar** — nunca resolvida escolhendo o texto mais bonito. ADR aceito não se edita: abre-se um novo que `supersedes`.

**`handbook/` é acervo, não norma.** Ele contém decisão registrada, pesquisa e histórico — e também descreve coisas que nunca foram construídas. Nada de lá vira premissa sem conferir no código primeiro.

**Citar fonte primária, nunca artefato que cita outro artefato.** Afirmação técnica apoiada noutro documento do repositório, e não no código ou na documentação do fornecedor, é candidata a estar errada — foi assim que onze artefatos passaram meses afirmando um layout de arquivo bancário que o banco recusa.

## Idioma — invariante

Fonte única. Não replicar esta tabela em outro arquivo.

| Camada                                    | Idioma                                                      |
| ----------------------------------------- | ----------------------------------------------------------- |
| Código (`src/`, `tests/`)                 | **EN**                                                      |
| Strings ao humano, logs, erros formatados | **PT-BR**                                                   |
| Documentação, diálogo, commits            | **PT-BR com acentuação completa**                           |
| Erros internos (string literal union)     | **EN kebab-case** — `'contract-not-active'`                 |
| Eventos de domínio                        | **EN passado** — `ContractCreated`                          |
| Commit                                    | **PT-BR** com escopo — `feat(contracts): adiciona VO Money` |

Casing é enforced por `@typescript-eslint/naming-convention` — desligado em `tests/**`.

## Política de regressão zero — invariante

**Não existe "o erro não é meu".** Qualquer vermelho — teste, `lint`, `typecheck`, hook, build — é regressão a corrigir **agora**, tenha ou não sido causado pelo diff atual. "Já estava quebrado antes" não fecha turno.

Três saídas aceitáveis, e só três:

1. **Consertar a causa** — volta ao verde de verdade.
2. **Corrigir o gate que classifica errado** — e **provar** o verde no caminho certo. Nunca esconder atrás de `skip`.
3. **Escalar ao humano** com causa-raiz — só quando 1 e 2 estão fora de alcance, e sempre explícito.

O backstop mecânico é o hook `Stop`, mas a disciplina é de julgamento e não se delega a ele.

## Commits assistidos por IA

Todo commit gerado por IA leva o trailer `Assisted-by: AGENT_NAME:MODEL_VERSION`, cobrado por `scripts/ci/check-commit-trailers.ts`. **A IA nunca adiciona `Signed-off-by`** — só um humano certifica o DCO.

## Anti-padrões — os que exigem julgamento

Os mecânicos (`npm`, sintaxe TS, casing, `class` no domínio, JSON/ENUM no MySQL) já são barrados por hook, `tsconfig`, ESLint e semgrep.

1. **Escrever `npm` em doc, PR, script ou comentário** — sempre `pnpm`. O hook barra a execução, não o texto.
2. **Misturar módulos numa sessão** (`ctr_*` e `fin_*` ao mesmo tempo) — quebra o isolamento por prefixo.
3. **Importar de `<module>/domain/` ou `application/` de outro módulo** — só via `<module>/public-api/`.
4. **Escrever migration à mão** — sempre `pnpm run db:generate`.
5. **Citar documento de memória** — abrir o arquivo e citar literalmente, com `arquivo:linha`.
6. **Dispensar vermelho como "não é meu erro"** — ver regressão zero.
7. **Consertar problema fora do escopo atual** — registrar via skill [`issue-report`](./.claude/skills/issue-report/SKILL.md) e seguir a tarefa.
8. **Duplicar regra que já vive numa rule ou SKILL.md** — referenciar, não copiar.
9. **Pôr dado real de cadastro em fixture** — convênio, conta, agência, documento de parceiro. **Os três repositórios são públicos**, e fixture é o caminho por onde esse dado entra: um número de convênio copiado de arquivo recebido do banco viveu aqui em 16 ocorrências, num comentário e em cinco arquivos de teste. O convênio já é barrado por `tests/cleanup/bank-fixture-masking.test.ts` (reservados `000000` e `999999`); **os demais dependem de julgamento**. Nunca escrever o valor na mensagem de commit, no assert ou na issue — o CI é público, e explicar a correção citando o dado a repete.

## Gotchas que não se descobre lendo o código

**Hook de pre-commit exige instalação manual, uma vez por clone:**

```bash
git config core.hooksPath .githooks
```

`core.hooksPath` é estado local em `.git/config`, não conteúdo versionado — clone novo não o traz, e sem isso **não há hook de commit instalado**. Escape de emergência: `git commit --no-verify`.

**`pnpm run test:integration` sobe MySQL via Docker** e derruba a infra de dev no processo.

**Gate de qualidade:** `typecheck` + `format:check` + `lint` + `test`.

**[`handbook/guidelines/`](./handbook/guidelines/) está no `.gitignore`** — documentação Bradesco com restrição de redistribuição. Leitura autorizada localmente; **não copiar trechos para arquivo commitável**. É a fonte primária para qualquer coisa de CNAB.

**Ler código por `cat` desliga as rules.** As rules de [`.claude/rules/`](./.claude/rules/) entram em contexto por `load_reason: path_glob_match`, e o gatilho é a **ferramenta dedicada** — não o conteúdo lido. Medido em 18/08/2026 (Claude Code 2.1.234), com o hook `InstructionsLoaded` como testemunha: `head -15 src/shared/kernel/cnpj.ts` via Bash **não carrega rule nenhuma**; o `Read` do mesmo arquivo grava `path_glob_match` e injeta `rules/domain.md` na hora. Quem lê o código por shell trabalha **sem o harness, em silêncio** — e o modo `auto` do Claude Code induz exatamente isso. Do outro lado, escrita por `sed -i` ou `> arquivo.ts` fura o `PostToolUse(Edit|Write)`, então o Prettier não roda e o `format:check` reprova longe da causa. `block-bash-file-io.sh` barra as duas formas; pipeline (`cat x.ts | grep`), `git show`, `.log` e qualquer caminho fora do repo seguem liberados.

**A compactação derruba as rules e não as devolve.** Medido na mesma sessão: 6 sessões produziram 14 `session_start` + 14 `path_glob_match` e **zero** `load_reason: compact`, apesar de 4 compactações registradas. É por isso que o agente começa aderente e degrada no meio de sessão longa. `compact` **é** um valor documentado do matcher de `InstructionsLoaded` — a divergência entre o documentado e o observado está registrada, não resolvida escolhendo um lado. O hook `post-compact-rules-reminder.sh` lista, no `PostCompact`, o que caiu; recarregar exige tocar um arquivo do glob com `Read`. Sessão curta é a profilaxia: o que nunca compacta nunca perde o harness.

O testemunho de quais instruções valiam num momento é `.claude/.last-instructions.log` — consultar antes de supor que uma regra estava carregada.

**Sessão que cai não avisa — quem avisa é a ausência.** `pnpm run logbook` lê o diário de bordo (`.claude/.session-logbook.log`, escrito pelo hook `logbook.sh` em SessionStart/SessionEnd/PreCompact/PostCompact/Stop) e lista as sessões; `pnpm run logbook --dead` mostra só as que **não** emitiram `SessionEnd` — essas caíram, e o horário do último evento é a hora do óbito, para cruzar com status.claude.com. O diário registra operação, nunca conteúdo de prompt ou de ferramenta.

## Harness

Só primitivas nativas do Claude Code: `.claude/rules/` (por path), `.claude/skills/`, `.claude/agents/`, `.claude/hooks/` + `settings.json`. Não existe pipeline W0→W3, ticket com `STATE.json`, wave nem spec-kit — foram removidos em 2026-08-06.

**Trabalho novo não abre ticket de processo.** Faz a mudança, roda o gate, commita. Decisão nova vira ADR em `handbook/architecture/adr/`; achado fora de escopo vira issue no GitHub.
