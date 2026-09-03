# Briefing 03 — #873: qual é o caminho para produção hoje

> **Item 3 de 7** da fila de bloqueios de 02/09/2026 (`handbook/operations/bloqueios-2026-09-02/BLOQUEIOS.md`, seções **B5** e **B0**).
> **Worktree própria + branch + PR.** Você foi posto numa worktree isolada — trabalhe só nela.
> **Autonomia decidida pelo Gabriel: investigue, apure, proponha — e PARE.** Você não escolhe o
> caminho para produção. Você descobre qual ele é e apresenta as opções onde houver escolha.

---

## O problema, em uma frase

A **#873** é P1, tem label `needs-decision`, e está escrita sobre um objeto que **não existe**.

| A issue afirma                                                        | O repositório diz (medido em 02/09/2026)                                                                |
| :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| _"A branch `go-live`, que alimenta produção, está 794 commits atrás"_ | **`origin/go-live` não existe.** `git ls-remote --heads origin` lista 31 branches e nenhuma é `go-live` |
| CA4 pede _"promoção da `go-live` até `45b74d2e`"_                     | promoção de uma branch inexistente                                                                      |
| —                                                                     | `origin/main` está **1 commit à frente e 10 atrás** de `origin/dev`. Não 794                            |

O `CLAUDE.md` é explícito sobre o que fazer aqui:

> _"O código é a verdade sobre o que existe. (...) A divergência é um **defeito a registrar** —
> nunca resolvida escolhendo o texto mais bonito."_

E o `BLOQUEIOS.md` acrescenta o que está em jogo:

> _"Isto precisa ser resolvido antes de qualquer plano de release, porque o P1 mais estrutural do
> backlog está escrito sobre um objeto que não existe."_

**As duas saídas possíveis são:** ou a branch foi apagada e o caminho para produção mudou (e a
pergunta vira _qual é ele hoje?_), ou ela nunca existiu com esse nome (e o número 794 mede outra
coisa — provavelmente a distância entre a `dev` e o que está **implantado**, que é uma task
definition, não uma branch).

---

## Pistas que já existem — confira todas antes de investigar do zero

1. **Há memória registrada dizendo que a `go-live` foi aposentada** e que a `dev` é a linha de
   integração. Leia a memória do projeto e confirme (ou refute) contra o git. **Memória descreve o
   que era verdade quando foi escrita** — se ela nomear branch, arquivo ou flag, verifique que
   ainda existe antes de apoiar conclusão nela.
2. **Não há workflow de deploy neste repositório.** `.github/workflows/` tem CI, integração,
   audit, semgrep e `qa-image` — este último **publica imagem** em merge na `dev` e **não deploya**.
   O deploy vive fora. Confirme lendo os workflows, não confiando nesta frase.
3. **O repositório `ERP-INFRA` está clonado ao lado**, em
   `../ERP-INFRA` (irmão do `core-api` no monorepo). É o candidato natural a conter o
   pipeline / as task definitions. **É outro repositório: leia, não escreva nele.**
4. **A Discussion #958** — _"Homologação já pegou o 04f24df8b (M2)? E como saber qual commit está
   em cada ambiente"_ — faz exatamente esta pergunta e está sem resposta desde 31/08. O que você
   apurar provavelmente a responde. **Não a responda por conta própria**: relate ao Gabriel que
   ela pode ser fechada com o seu achado, e deixe que ele decida (a #958 também é o item 7 da
   fila, com dono a definir).
5. **O Tailscale está ligado** nesta máquina. O nó de homologação e o de validação respondem.
   Se puder **medir** qual versão está no ar em vez de inferir, meça — mas veja a
   seção de segurança abaixo antes de tocar em qualquer host.
   <!-- Sanitizado em 03/09/2026: os dois nós eram nomeados aqui, contra a própria regra de
        segurança deste briefing ("nada de hostname de tailnet") e contra a do repositório, que
        é público. Descritos pelo papel; quem opera sabe quais são. -->

   ⚠️ **A régua vale para este arquivo também.** A seção de segurança abaixo proíbe hostname de
   tailnet, e a versão original desta linha o continha — o briefing violava a regra que enuncia.
   Antes de escrever qualquer nome de máquina, releia a seção de segurança e pergunte se o papel
   ("o nó de homologação") não basta. Quase sempre basta.

---

## O que entregar

### 1. A apuração (é o coração da tarefa)

Responda, **cada resposta com a evidência literal que a sustenta** (comando + saída, ou
`arquivo:linha`):

- **Existe hoje uma branch que alimenta produção?** Qual? Se não existe, o que a substituiu?
- **O que promove código a produção?** Merge? Tag? Pipeline manual? Onde esse mecanismo vive?
- **De onde sai o número 794?** Ele mede o quê — distância para uma branch, para um commit
  implantado, para uma tag? Se não conseguir reproduzi-lo, **diga isso**: "não reproduzível" é um
  achado legítimo e muito melhor que um número inventado para fechar a lacuna.
- **Qual commit está em produção hoje?** Se não for possível saber daqui, diga **por que** e
  **quem** saberia. Essa impossibilidade é, ela própria, o achado.
- **O CA4 da #873 é executável como está escrito?** Se não, o que ele deveria pedir?

⚠️ **Não invente coerência.** Se a apuração terminar com uma pergunta em aberto, ela fica em
aberto e vai para o Gabriel. O erro que esta tarefa conserta foi exatamente alguém preencher uma
lacuna com texto plausível.

### 2. O registro versionado (é o que vira o PR)

Escreva **um** documento com a apuração. O formato decorre do que você achar — escolha e
justifique a escolha em uma linha:

- **Se a apuração é factual** ("o caminho é X, está em tal arquivo, eis a evidência") → documento
  de operação em `handbook/operations/bloqueios-2026-09-02/caminho-para-producao.md`.
- **Se a apuração revela uma decisão de arquitetura que ninguém tomou** (ex.: "não existe caminho
  definido; há três possíveis") → **ADR em status `Proposed`** em `handbook/architecture/adr/`,
  apresentando as opções **sem escolher**. Um ADR `Proposed` **não é norma** — é a pergunta posta
  no formato do repositório. Nunca edite um ADR já aceito; se algum precisar mudar, o caminho é um
  novo que o `supersedes`.

Em qualquer dos dois: **cite fonte primária**. Comando executado, arquivo do `ERP-INFRA`,
workflow. Nunca outro documento do `handbook/` — foi assim que onze artefatos passaram meses
afirmando um layout que o banco recusa.

### 3. A correção da #873 (comentário, não fechamento)

Comente na #873 com:

- a premissa vencida, nomeada e com a evidência;
- o que a apuração encontrou;
- uma proposta de reescrita do CA4 (e dos demais CAs que dependam da `go-live`), **como
  sugestão**;
- link para o documento/ADR do PR.

**Não feche a #873. Não edite o corpo dela. Não remova o label `needs-decision`.** A decisão é do
Gabriel.

---

## Segurança — leia antes de tocar em qualquer host

- **Os três repositórios são públicos.** Nada de host, IP, hostname de tailnet, ARN, id de conta,
  nome de bucket ou segredo no documento, no commit, no PR ou no comentário da issue. Descreva o
  papel ("o pipeline de deploy", "o host de homologação"), nunca o endereço.
- **Não altere nada em ambiente algum.** Esta tarefa é somente-leitura fora do seu worktree.
  Nenhum deploy, nenhum `mgc`, nenhum push para o `ERP-INFRA`, nenhum restart.
- Se precisar de credencial, ela vem do cofre já carregado no ambiente — **nunca imprima o valor**
  e nunca peça que o Gabriel cole um no chat.

---

## Como trabalhar (harness)

- **Use `Read` / `Edit` / `Write` / `Grep` / `Glob`, nunca `cat` / `sed -i` / `> arquivo`.** As 16
  rules de `.claude/rules/` carregam por `path_glob_match`, e o gatilho é a **ferramenta
  dedicada**, não o conteúdo lido. Quem lê por shell trabalha sem o harness, em silêncio.
  (`git show`, pipelines e caminhos fora do repositório seguem liberados por Bash.)
- **Sessão curta.** A compactação derruba as rules e **não as devolve** — 6 sessões produziram 14
  `path_glob_match` e **zero** `load_reason: compact`. Se sentir a sessão esticando, feche o que
  tem e reporte; não estenda.
- Idioma: **PT-BR com acentuação completa** em documento, commit, PR e diálogo.
- **Commit:** PT-BR com escopo, e o trailer `Assisted-by: AGENT_NAME:MODEL_VERSION` (cobrado por
  `scripts/ci/check-commit-trailers.ts`). **Nunca `Signed-off-by`** — só um humano certifica o DCO.
  Se referenciar a issue, use `Refs #873` **sem dois-pontos** (com dois-pontos o bloco de trailers
  é invalidado).
- **Gate antes do PR:** `pnpm run typecheck && pnpm run format:check && pnpm run lint`.
  Se o seu diff for só Markdown, o `format:check` ainda é obrigatório — o Prettier formata `.md`.
  **Vermelho não fecha turno**, mesmo vermelho que você não causou (política de regressão zero).
- Depois do commit, rode `git status` de novo: o hook de Prettier reformata **após** o commit, e
  isso já produziu PR com arquivo sujo.
- **Nunca `npm`. Sempre `pnpm`** — inclusive em texto de documento, PR e comentário.

### Skills e agentes a disparar

| Quando                                                     | O quê                                           | Por quê                                                                                                                                                                                                                 |
| :--------------------------------------------------------- | :---------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primeiro de tudo**                                       | skill **`inquiry`**                             | O acervo em `handbook/inquiries/` pode já ter investigado o caminho de release. Consultar antes de investigar do zero é o protocolo. A inquiry **0027** trata de branches/teses órfãs — provável parente desta apuração |
| Se achar defeito fora deste escopo                         | skill **`issue-report`**                        | Anti-padrão 7 do `CLAUDE.md`: registre e siga, não conserte de passagem                                                                                                                                                 |
| Se a apuração exigir varrer muitos arquivos do `ERP-INFRA` | agente **`Explore`** (breadth: _very thorough_) | Ele devolve a conclusão sem despejar os arquivos no seu contexto — e contexto curto é o que evita a compactação que derruba as rules                                                                                    |
| Antes de abrir o PR                                        | skill **`ts-quality-checker`**                  | Roda o gate e reporta a saída literal de cada comando                                                                                                                                                                   |

Não dispare especialista de domínio (Drizzle, MySQL, CNAB, Fastify) — esta tarefa não toca código.

---

## Definition of Done

- [ ] Skill `inquiry` consultada **antes** de investigar, e o resultado dito (achou / não achou).
- [ ] As 5 perguntas da apuração respondidas, cada uma com evidência literal — ou marcadas
      explicitamente como **em aberto**, com o motivo.
- [ ] Um documento (operação **ou** ADR `Proposed`) versionado, com fonte primária, sem host/IP/
      segredo.
- [ ] Gate verde, com a saída colada no PR.
- [ ] Commit com trailer `Assisted-by`, sem `Signed-off-by`.
- [ ] PR aberto **para `dev`**, descrevendo a premissa vencida e o que ficou em aberto.
- [ ] Comentário na #873 com a proposta de reescrita do CA4. **Issue não fechada, label
      `needs-decision` intacto.**
- [ ] Relatório final ao Gabriel: o que foi apurado, o que ficou em aberto, e se a Discussion #958
      pode ser respondida com este achado.
