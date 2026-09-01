---
inquiry: 0026
title: "Três trocas estruturais em aberto — assíncrono human-in-the-loop, Drizzle 1.0 e Bruno × TS"
state: open
opened: 2026-08-05
last_reviewed: 2026-09-01
open_outputs: 11  # migrar para issue — ver README §Saídas
---

# Inquiry-0026: Três trocas estruturais em aberto — assíncrono human-in-the-loop, Drizzle 1.0 e Bruno × TS

- **Opened by:** Claude Code (a pedido do dono do repo, no gate humano da Fase 1 da spec 040)
- **Asked to:** investigação interna medida — sem consulta externa
- **Impact:** ADR-0015 (outbox), ADR-0030 (fila diferida), ADR-0014/ADR-0058 (persistência e política de versão), ADR-0038 (Bruno CLI)

---

## 1. Contexto

TRÊS perguntas nasceram no mesmo dia e têm a mesma raiz: **o que hoje é decidido por argumento e precisa ser decidido por medição.**

**(a) Fluxo assíncrono com humano no meio.** Ao triar as 21 contradições ADR × código, o dono do repo
sinalizou que vêm eventos assíncronos mais complexos que os atuais. O exemplo dado:

> "Fazer solicitação de aprovação para um e-mail, a pessoa no e-mail 'aprova' e o código reage a isso
> mudando um status de uma máquina de estado."

Hoje o repositório tem outbox MySQL + polling ([ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md)),
e a decisão de **não** adotar fila foi consciente ([ADR-0030](../architecture/adr/0030-valkey-shared-store-deferred.md),
`Proposed`): YAGNI, com gatilho em "3+ jobs com dependência entre si". Há 6 jobs, todos independentes
— a contagem não dispara, mas fanout de aprovação dispararia.

**(b) Drizzle 1.0.** Na mesma sessão perguntou-se se valia migrar. O registry mostra que a linha
estável é `0.45.2` (dist-tag `latest`, publicada 2026-03-27) e a próxima é `1.0.0`, hoje em
**release candidate** (`1.0.0-rc.4`, 2026-06-27, 25 builds de RC e 291 de beta). Não existe `0.98`.

As duas se cruzam porque o mecanismo assíncrono é construído **sobre** o ORM: se o 1.0 mudar
`mysql-core`, `relations-v2` ou o modelo de transação, a resposta de (a) muda junto.

**(c) Bruno CLI × testes TS.** Ao decidir a alegação `ADR-0038-C11`, o dono do repo perguntou se não
seria melhor substituir o `bru run` por arquivos TS batendo em localhost. É a terceira troca
estrutural em aberto, e a única mensurável hoje.

---

## 2. Pergunta(s) feita(s)

1. O outbox + polling atual sustenta um fluxo **human-in-the-loop** — solicitação → e-mail → callback
   externo → transição de máquina de estado — ou o desenho pede fila / workflow engine?
2. Quais das limitações do outbox são reais **neste** volume, e quais são teóricas?
3. O `drizzle-orm@1.0.0` muda alguma premissa de (1)? E o que ele custa em 8 módulos?
4. Os 242 `.bru` cobrem algo que os 179 `inject` não cobrem — ou são camada duplicada com custo de
   supply-chain próprio?

---

## 3. Respostas / Investigação

### 2026-08-05 — o que JÁ está medido

Três medições feitas na sessão que abriu esta inquiry, para não serem refeitas:

| Medição | Resultado |
| --- | --- |
| Linha estável do `drizzle-orm` | `0.45.2` é o dist-tag `latest`; **não existe `0.98`**. Próxima linha é `1.0.0`, em `rc.4` |
| `drizzle-kit` | `0.31.10` instalado **é** o latest |
| Collation por coluna no 0.45.2 | **Possível** via `customType` — `dataType()` devolvendo `'varchar(36) COLLATE utf8mb4_bin'` emite verbatim no DDL e a 2ª geração responde "No schema changes" (idempotente). Reproduzido com `drizzle-kit generate` em worktree descartável |

A terceira derruba um argumento que eu mesmo havia escrito: **não é verdade** que expressar collation
exija passo manual permanente. Ver a correção registrada em `context/decisions/ADR-0014.yaml`,
alegação `ADR-0014-C8`.

### O que FALTA medir — (a) assíncrono

- [ ] **Latência aceitável do polling.** Qual o intervalo atual do `runLoop`, e o que o fluxo de
      aprovação tolera? Se a aprovação é humana, minutos podem ser irrelevantes — e aí o outbox basta.
- [ ] **O callback externo.** A aprovação por e-mail chega como request HTTP na borda, não como
      evento. Isso é **entrada**, não saída: o outbox cobre o lado de publicar, e a transição de
      estado é um use case comum. Medir se há problema real ou se o desenho já cabe.
- [ ] **Retry e dead-letter.** O outbox atual tem contagem de tentativa? O que acontece com evento
      que falha N vezes? É aqui que fila costuma ganhar.
- [ ] **Agendamento futuro** ("reenviar em 3 dias se ninguém aprovar"). O outbox não agenda; o cron
      one-shot agenda. Medir se a combinação cobre, ou se falta primitiva.
- [ ] **Multi-instância.** `claimJobRun` já coordena job. O worker de outbox coordena? O
      [ADR-0030](../architecture/adr/0030-valkey-shared-store-deferred.md) tem gatilho em multi-instância.

### O que FALTA medir — (c) Bruno CLI × testes TS contra localhost

Levantado em 2026-08-05, na mesma sessão. O dono do repo perguntou se não seria melhor substituir o
`bru run` por arquivos JS/TS que consomem a API em localhost, com exit code no CI.

Números de partida:

| | |
| --- | --- |
| Arquivos `.bru` | **242** |
| Arquivos usando `inject(` | **179** (dos quais 75 são `*.http.test.ts`) |
| Arquivos `*.e2e.ts` | 3 |
| Exceções de supply-chain que existem SÓ pelo Bruno | **2** — `protobufjs: false` (build gRPC que coleção REST não usa) e `semver@5.7.2 \|\| 6.3.1` no `trustPolicyExclude`, transitivas de `@babel/*` → `jscodeshift` |

- [ ] **Quanto dos 242 `.bru` é duplicata** das rotas já cobertas pelos 179 `inject`?
- [ ] **O que só o servidor real pega.** `fastify.inject` roda in-process: não passa por rede, CORS,
      helmet nem rate-limit. Medir quantos casos dependem disso de fato.
- [ ] **O que se perde sem o app do Bruno** — exploração manual, QA sem terminal, coleção como doc.
- [ ] **As 2 exceções de supply-chain saem junto?** Se sim, é ganho direto na política do ADR-0011.
- [ ] **O rastro histórico.** 17 arquivos em `.claude/.pipeline/` e `specs/007/safety-net/` citam
      `z-pending-fixes`. Sair do Bruno os transforma em ponteiros mortos, e o `ADR-0057 §5` proíbe
      reescrever registro histórico. Não é argumento contra sair — é custo a declarar.

⚠️ **A armadilha que o ADR-0038 documenta, e que a substituição precisa evitar.** Aquele ADR nasceu
de uma medição: ao rodar o runner único pela primeira vez contra infra real, **24 de 26 falhas eram
`.bru` desalinhados com o servidor**. A causa foi exatamente a arquitetura proposta como alternativa
— `api-collections/contracts` nunca teve runner Bruno, porque o `e2e-contracts.sh` rodava um
`node:test` **em paralelo**. O `.bru` apodreceu sem ninguém ver. Trocar Bruno por TS resolve isso
**se e somente se as coleções morrerem junto**; se sobreviverem como documentação, o problema volta
idêntico com os papéis invertidos.

### 2026-09-01 — (b) medido: o major é barato, e o gatilho segue não-disparado

Três dos quatro itens de (b) foram medidos contra o código e contra fonte primária do fornecedor. O
resultado inverte a premissa que abriu a inquiry: **o custo do major não está em `relations-v2` nem
em `mysql-core` — está no formato da pasta de migração, que é estado já aplicado em produção.**

#### Estado da linha, no registry (`pnpm view`, 2026-09-01)

| | |
| --- | --- |
| `drizzle-orm` dist-tag `latest` | **`0.45.2`** — inalterado desde 2026-03-27 |
| Último RC | `1.0.0-rc.5-169397b`, **2026-08-12** |
| `drizzle-kit` dist-tag `latest` | **`0.31.10`** — **não existe `1.0` publicado** |

⚠️ **Correção de ritmo.** O §1 registrou "25 builds de RC em ~6 semanas — linha em movimento". O
histórico do registry mostra o contrário: `rc.4` em 2026-05-20, hiato até 2026-07-17, `rc.5` em
2026-08-11/12. São ~4 meses de RC e ~5 meses sem release estável em nenhuma das duas linhas — a
linha está **desacelerando**, não se movendo. O §1 fica como estava: registra o que se sabia em
05/08, e é este bloco que corrige.

#### Cruzamento dos breaking changes obrigatórios com o código

Fonte: [v0 → v1 changes](https://orm.drizzle.team/docs/v0-v1-changes) (doc oficial). Contagens sobre
`src/`, excluindo `.claude/worktrees/`.

| # | Breaking change obrigatório | Afeta? | Evidência medida |
| --- | --- | --- | --- |
| 1 | **RQBv1 removido** → `defineRelations()` | **não** | `0` `relations(`, `0` `db.query.`, `0` `._query` |
| 2 | Nova API de casing (`snakeCase.table()`) | **não** | `0` ocorrências de `casing` em `src/` e `db/` |
| 3 | Arrays não encadeáveis (`.array().array()`) | **não** | PG-only; MySQL não tem coluna array |
| 4 | **Migração v3** — `_journal.json` eliminado, SQL e snapshots em pastas separadas, `drizzle-kit drop` removido | **SIM** | **7 `_journal.json`, 131 snapshots, 124 `.sql`** |
| 5 | `schemaFilter` passa a gerenciar todos os schemas | marginal | os 7 configs de `db/drizzle/` só declaram `dialect`/`schema`/`out` |
| 6 | `--strict` removida do `push` | **não** | os 7 scripts usam **só** `generate`; nunca `push`/`pull` |
| 7 | `.generatedAlwaysAs()` só aceita `` sql`` `` | **não** | `0` ocorrências |
| — | `getTableColumns()` → `getColumns()` | **não** | `0` ocorrências |
| — | Migrator aplica **toda** migration ausente, ignorando ordem de timestamp | **SIM** | muda a semântica de `job:migrate` em produção |

Dois achados que reduzem o custo e não estavam previstos:

- **Os 67 `mysqlTable` já usam a assinatura nova:** 62 ocorrências de `=> [` (terceiro argumento em
  array) e **zero** `=> ({` (o formato de objeto deprecado). Migração de schema: custo zero.
- **Superfície de contato total: 105 imports** — 87 de `drizzle-orm` (operadores `eq`/`and`/`sql`/
  `desc`/`inArray`/`between`, nenhum na lista de breaking), 7 de `drizzle-orm/mysql2` (só `drizzle` e
  `MySql2Database`), 7 do migrator (só `migrate`), 4 de `mysql-core`.

#### As respostas

- [x] **Breaking changes reais em `mysql-core`** — **6 dos 7 obrigatórios são inertes neste repo.** O
      único que atinge é o **#4**, e ele não é código: é converter 124 migrations, 131 snapshots e 7
      journals já aplicados em produção, sem que o differ do kit 1.0 conclua que precisa recriar algo.
      Somado à mudança de semântica do migrator, é a classe de mudança em que "passou no teste" e
      "está correto em produção" divergem. Há rede (`tests/jobs/migrate/`,
      `tests/infra/migrate-compose.test.ts`), mas ela cobre o formato atual.
- [x] **`relations-v2` obriga reescrever repositórios?** — **Não, e nem um dos 8 módulos.** O
      repositório **nunca adotou o RQB v1**: zero `relations()`, zero `db.query.*`, zero `._query`.
      Toda leitura é `select` explícito com projeção de colunas nomeadas e mapper `row → domínio`. O
      breaking change nº 1 do major passa ao largo — a pergunta que parecia o maior risco tem o menor
      custo.
- [ ] **Collation ganhou suporte de primeira classe?** Se sim, o `customType` vira desnecessário.
      **Segue aberta — não medida nesta sessão.** O que se sabe: o `customType` está confinado a **um**
      arquivo (`src/shared/persistence/identifier-columns.ts`, 4 ocorrências), então o custo de
      aposentá-lo é pequeno em qualquer cenário. Cruza com a [0015](./0015-charset-drizzle-roadmap.md),
      que está `blocked` **em upstream** por este mesmo assunto.
- [x] **`drizzle-kit` correspondente e estabilidade do differ** — **o kit não tem `1.0` publicado**
      (`latest` = `0.31.10`). Como o formato v3 de migração vem do **kit**, não do ORM, o differ não é
      mensurável hoje e o major não é executável hoje. **Isto é trava mecânica, não política** — e
      obriga a refinar o gatilho (ver §4).

#### O ganho que ainda não chegou

Do [roadmap v1](https://orm.drizzle.team/roadmap), o que interessaria a este repositório:

| Ganho | Estado |
| --- | --- |
| **Down migrations e melhorias de rollback** | ⚠️ **pendente** |
| `.$returningIds()` para MySQL | previsto, não entregue |
| JIT mappers (`jit: true`), codecs | entregue, opcional |
| Novos dialetos (MSSQL, CockroachDB, MariaDB) | irrelevante — MySQL-only por [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) |

O item que resolveria o pior defeito do estado atual — **124 migrations e nenhum `down`** — é
justamente um dos que **não saíram**. Migrar hoje pagaria o custo do #4 sem receber a contrapartida
que o justificaria.

### O que FALTA medir — (b) Drizzle 1.0

- [ ] **Collation ganhou suporte de primeira classe?** Único item de (b) ainda aberto — ver o bloco
      de 2026-09-01 acima, e a [0015](./0015-charset-drizzle-roadmap.md), `blocked` em upstream pelo
      mesmo assunto.

---

## 4. Análise interna

**Não decidir agora é a decisão certa, e ela tem fundamento no próprio acervo.** O
[ADR-0058](../architecture/adr/0058-runtime-tracks-recommended-lts.md) §3, aceito em 2026-08-05,
exige que troca de tecnologia estrutural seja justificada por **inquiry que MEÇA, não que argumente**
— e um major de ORM é tecnologia estrutural. Esta inquiry é o instrumento que aquele ADR nomeia.

Para (b) há ainda a política de supply-chain: `drizzle-orm` é dependência de **produção**, pinada em
versão exata e cobrada por `tests/cleanup/production-deps-pinned.test.ts`. Colocar um **release
candidate** nessa posição contraria `minimumReleaseAge: 1440`, `minimumReleaseAgeStrict: true` e
`trustPolicy: no-downgrade` — a postura que nasceu do comprometimento do `axios` em março/2026.

**Gatilho para medir (b):** o `1.0.0` sair com dist-tag `latest` **e** passar a quarentena de 24h.
Antes disso é medir alvo móvel — 25 builds de RC em ~6 semanas indicam linha em movimento.

> **Refinamento em 2026-09-01, depois de medir.** O gatilho acima está incompleto: ele nomeia só o
> `drizzle-orm`. O breaking change que de fato atinge este repositório é o **formato v3 da pasta de
> migração**, e esse formato vem do **`drizzle-kit`** — que não tem `1.0` publicado (`latest` =
> `0.31.10`). O gatilho passa a ser **duplo: `drizzle-orm@1.0.0` E `drizzle-kit@1.x` ambos em
> `latest`, ambos cumprida a quarentena.** Enquanto o kit não sair, o major não é executável, e a
> espera deixa de ser postura de supply-chain para ser impedimento mecânico.
>
> **E a natureza da espera mudou.** A inquiry foi aberta supondo que o major custaria "8 módulos" de
> reescrita. Medido: 6 dos 7 breaking changes obrigatórios são inertes aqui e o schema já está no
> formato novo. O que resta é converter o histórico de migração e provar o migrator contra MySQL
> real — trabalho de uma sessão, não projeto. **Isso não é argumento para antecipar** (o kit não
> existe, e o ganho que interessa — down migrations — também não), mas muda a conta: quando o
> gatilho disparar, não há motivo para adiar.

**Gatilho para medir (a):** o épico de aprovação entrar no roadmap. Medir antes é especular sobre
requisito que ainda não existe; medir depois de construir é pagar retrabalho.

**Gatilho para medir (c):** nenhum evento externo — é o único dos três que pode ser medido HOJE, e
barato: cruzar as rotas dos 242 `.bru` com as dos 179 `inject` responde a pergunta central em uma
sessão. O que a torna decisão e não medição é que substituir o Bruno **supersede o ADR-0038**, que é
aceito. Medir primeiro, decidir depois.

---

## 5. Decisão / Encaminhamento

Nenhuma decisão tomada. A inquiry existe para que, quando qualquer gatilho disparar, a medição
comece do estado registrado aqui em vez de recomeçar do zero.

**Estado por troca, em 2026-09-01:**

| Troca | Estado | O que falta |
| --- | --- | --- |
| (a) assíncrono | não medida | 5 itens; gatilho é o épico de aprovação entrar no roadmap |
| (b) Drizzle 1.0 | **3 de 4 medidos** | só collation de primeira classe; gatilho **duplo** (ORM **e** kit em `latest`) |
| (c) Bruno × TS | não medida | 5 itens; mensurável hoje, sem gatilho externo |

A medição de (b) **não muda a recomendação** — segue "não migrar agora" —, mas muda a razão: deixou
de ser "custo desconhecido em 8 módulos" e passou a ser "o `drizzle-kit@1.x` não existe, e o ganho
que justificaria o major (down migrations) também não".

**O que NÃO se decide por esta inquiry:** a adoção do `customType` `binId` para identificadores. Ela é
independente do 1.0 (funciona no 0.45.2, medido), tem escopo próprio — toca schema de 8 módulos e
muda comportamento de geração — e merece ciclo próprio.

---

## 6. Referências

- [ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md) — outbox MySQL, polling como única leitura possível
- [ADR-0030](../architecture/adr/0030-valkey-shared-store-deferred.md) — fila diferida, com gatilho declarado
- [ADR-0058](../architecture/adr/0058-runtime-tracks-recommended-lts.md) §3 — troca estrutural exige inquiry que mede
- [Inquiry-0023](./0023-typescript-7-native-spike.md) — o precedente: mediu Node/Deno/Bun/tsgo em harness executável e **refutou** uma premissa de ADR aceito
- `context/decisions/ADR-0014.yaml`, alegação `ADR-0014-C8` — a medição de collation e a correção do argumento errado
- `.claude/rules/jobs-and-workers.md` — topologia de worker por grupo, e por que a fila segue diferida
- [Inquiry-0015](./0015-charset-drizzle-roadmap.md) — `blocked` em upstream pelo mesmo assunto do único item de (b) ainda aberto (collation)

**Fonte primária consultada na medição de 2026-09-01** — doc do fornecedor e registry, não artefato interno:

- [Drizzle ORM — v0 → v1 changes](https://orm.drizzle.team/docs/v0-v1-changes) — a lista de breaking changes obrigatórios que o §3 cruza com o código
- [Drizzle ORM — Roadmap v1](https://orm.drizzle.team/roadmap) — down migrations e `.$returningIds()` ainda pendentes
- [Drizzle ORM — Relational Queries v1 → v2](https://orm.drizzle.team/docs/relations-v1-v2) — a migração que este repositório não precisa fazer
- Registry npm (`pnpm view drizzle-orm dist-tags`, `pnpm view drizzle-kit dist-tags`) — dist-tags e datas de publicação
