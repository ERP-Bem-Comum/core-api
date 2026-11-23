---
inquiry: 0039
title: 'PostgreSQL no lugar do MySQL 8.4 — qual versão, e as premissas do ADR-0013 ainda valem?'
state: open
opened: 2026-11-23
decided:
last_reviewed: 2026-11-23
---

[← Voltar ao Índice de Inquiries](./INDEX.md)

# Inquiry-0039: PostgreSQL no lugar do MySQL 8.4 — qual versão, e as premissas do ADR-0013 ainda valem?

- **Opened by:** Gabriel Aderaldo (sessão assistida)
- **Asked to:** pesquisa própria — fontes primárias (postgresql.org, docs AWS RDS/Aurora, docs.magalu.cloud, docs Drizzle, registry npm) e inventário do código
- **Impact:** [ADR-0013](../architecture/adr/0013-mysql-database-engine.md) e [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) (ambos `Accepted`; trocar de engine exige ADR novo que os substitua) · [ADR-0014](../architecture/adr/0014-mysql-database-isolation.md) · [ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md) · anti-padrão nº 4 do `CLAUDE.md`
- **Gatilho de fechamento:** P3, P4 e P5 respondidas (§6) e o ADR que substitui o 0013 e o 0020 escrito com esses números. P1 e P2 foram respondidas em 2026-11-23.

---

## 1. Contexto

O projeto **nasceu em PostgreSQL**: o [ADR-0004](../architecture/adr/0004-postgres-outbox-pattern.md) desenhou o outbox em Postgres e a [Inquiry-0008](./0008-postgres-driver-pg-vs-postgres.md) chegou a escolher o driver. Em 2026-04-28, a [Inquiry-0010](./0010-mysql-engine-correction.md) descobriu que o legado roda MySQL 8, e o ADR-0013 trocou o engine.

O ponto que importa para esta inquiry: **o ADR-0013 não escolheu MySQL por mérito técnico**. Ele cita como negativos do MySQL a falta de JSONB, de índice parcial, de `LISTEN/NOTIFY` e de schemas reais. A escolha foi por **continuidade com o legado**:

- "Zero conversão de dados. Dump MySQL → MySQL é trivial." (`0013:53`)
- "Codebit já opera MySQL para a Bem Comum" (`0013:56`)
- o princípio de "uma batalha de cada vez" do ADR-0001 (`0013:26`)

O próprio ADR manda reavaliar se "Bem Comum decidir consolidar stack em PostgreSQL" ou surgir requisito que o MySQL não atenda (`0013:116-120`). Desde então, três coisas mudaram:

- o [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) pôs a produção na AWS `sa-east-1`;
- o código acumulou investigações de deadlock próprias do InnoDB ([0031](./0031-deadlock-na-reserva-atomica-de-remessa.md), [0032](./0032-titulo-remetido-fronteira-do-agregado.md));
- existe uma branch experimental removendo o ETL do legado (`experimento/arrancar-etl`).

Esta inquiry reabre a pergunta do engine com o código de hoje na mão.

---

## 2. Pergunta(s) feita(s)

```
Se o core-api trocar MySQL 8.4 por PostgreSQL, qual versão é a mais compatível com o que o
código faz hoje? E as premissas que fizeram o ADR-0013 ficar com MySQL ainda valem?
```

---

## 3. Respostas / Investigação

### 2026-11-23 — Inventário do código (o que é específico de MySQL)

Contagem por `grep` em `src/` e `scripts/` (ocorrências / arquivos) e nas 136 migrations `.sql` versionadas:

| Recurso | Uso hoje | Equivalente no PostgreSQL | Exige versão? |
| :--- | :--- | :--- | :--- |
| `mysqlTable` (Drizzle `mysql-core`) | 68 / 7 schemas | `pgTable` (`pg-core`) | não |
| Upsert `onDuplicateKeyUpdate` / `ON DUPLICATE KEY` | 97 / 38 | `onConflictDoUpdate` (`ON CONFLICT`) — exige alvo de conflito explícito | não |
| `FOR UPDATE` | 134 / 47 | igual | não |
| `SKIP LOCKED` (outbox, filas) | 33 / 15 | igual; o `LockConfig` do Drizzle pg-core tem `skipLocked` | não |
| errno MySQL — dup `1062` | 87 / 25 | SQLSTATE `23505` | não |
| errno MySQL — deadlock / lock wait `1213`/`1205` | 23 / 11 | `40P01` / `55P03` (`lock_timeout`) | não |
| errno MySQL — FK `1451`/`1452` | 6 / 5 | `23503` | não |
| Collation `utf8mb4_bin` (identificadores) | 220 nas migrations | `C` / determinística (comportamento default) | não |
| Collation `utf8mb4_unicode_ci` (default das tabelas; nomes) + buscas `like(...)` | default das tabelas de contracts, auth e budget-plans; `like` em contracts, auth, programs, reports | collation ICU **não-determinística** (ex.: `und-u-ks-level1`) | **sim — `LIKE` sobre ela só a partir do 18** |
| `AUTO_INCREMENT` | 12 nas migrations (fora de PK de domínio, por norma) | `GENERATED ... AS IDENTITY` | não |
| `ENGINE=InnoDB` / `CHARSET=utf8mb4` | 80 / 80 nas migrations | não existe (UTF-8 no cluster) | não |
| `CHECK` | 138 / 7 | igual | não |
| `datetime(fsp)` | 138 / 20 | `timestamp(3)` (sem fuso) ou `timestamptz` | não |
| Isolamento explícito | 21 / 13 | default do PG é `READ COMMITTED` (InnoDB: `REPEATABLE READ`) | não, mas muda semântica |
| SQL cru (`sql\``) | 204 / 32 | revisar um a um (`GROUP_CONCAT`/`IFNULL`/`DATE_FORMAT`: 11 / 5) | não |
| `information_schema` | 3 / 1 | existe, com colunas diferentes | não |
| UUID | `varchar(36)` gerado na aplicação (`randomUUID`, v4) | tipo `uuid`; `uuidv7()` nativo no 18 | não (opcional) |

**Leitura:** só um item do código exige versão, e é a busca por nome sem diferenciar maiúsculas nem acentos. Hoje ela sai de graça, porque a collation `_ci` é o default das tabelas. No PostgreSQL isso exige collation não-determinística, e `LIKE` sobre ela só é suportado a partir do 18. O resto traduz em qualquer versão suportada; o custo está no volume (97 upserts, 136 migrations, mapeamento de errno), não na versão.

### 2026-11-23 — Versões vigentes e hospedagem (fontes primárias)

| Major | Minor atual | Lançamento | EOL da comunidade | RDS | Aurora | Magalu DBaaS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 19 | 19.0 | 19/11/2026 | 19/11/2031 | não (só beta no Preview, us-east-2) | não | não |
| **18** | **18.7** | 25/09/2025 | 14/11/2030 | sim (até 18.6 listada) | sim (18.3/18.4/18.6) | **não** |
| 17 | 17.12 | 26/09/2024 | 08/11/2029 | sim (até 17.11) | sim (17.7 LTS) | sim |
| 16 | 16.16 | 14/09/2023 | 09/11/2028 | sim | sim | sim |

Fontes:

- [versionamento](https://www.postgresql.org/support/versioning/), [anúncio do 19](https://postgresql.org/about/news/postgresql-19-released-3449) e [roadmap](https://www.postgresql.org/developer/roadmap/) (próxima minor em 11/02/2027);
- [calendário RDS](https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html) (PG18 com suporte padrão até 28/02/2031) e [calendário Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html);
- [política de versões da Magalu](https://docs.magalu.cloud/docs/dbaas/postgres/security-monitoring/versions): só 15, 16 e 17, e major nova "após testes de compatibilidade".

O que cada major traz para este código:

- **17:** `MERGE … RETURNING`.
- **18:**
  - `LIKE` com collation não-determinística ([doc](https://www.postgresql.org/docs/18/functions-matching.html)). `ILIKE`, `SIMILAR TO` e regex continuam sem suporte, há custo de desempenho e o B-tree perde a deduplicação ([doc](https://www.postgresql.org/docs/18/collation.html)).
  - `uuidv7()` nativo.
  - `RETURNING OLD/NEW`.
  - AIO.
  - `pg_upgrade` preservando as estatísticas do planner.
  - Colunas geradas virtuais. O Drizzle pg ainda só expõe `STORED` ([doc](https://orm.drizzle.team/docs/generated-columns)).
  - ([anúncio](https://www.postgresql.org/about/news/postgresql-18-released-3142/))
- **19:**
  - `INSERT … ON CONFLICT DO SELECT … RETURNING`.
  - `WAIT FOR LSN`, que dá leitura das próprias escritas na réplica; relevante para o read/write split do [ADR-0026](../architecture/adr/0026-mysql-read-write-split-connection.md).
  - `pg_stat_lock` e `log_lock_waits` ligado por padrão.
  - ([release notes](https://www.postgresql.org/docs/release/19.0/))

Ecossistema Node (registry npm, 2026-11-23):

- `drizzle-orm` 0.45.4 e `drizzle-kit` 0.31.11 suportam o dialeto pg com os drivers `pg` (8.23.1) e `postgres` (4.1.1) ([doc](https://orm.drizzle.team/docs/get-started-postgresql));
- `kysely` 0.29.9 também suporta;
- nenhum desses pacotes declara requisito de versão do servidor;
- imagem oficial `postgres:18` / `18.7`: `latest` já é `19.0-trixie`, então fixar a tag. Do 18 em diante, `PGDATA` muda para `/var/lib/postgresql/<major>/docker`.

### 2026-11-23 — Gabriel (resposta a P1 e P2)

> O ETL vai ser desligado: foi identificado como a maior fonte de bugs do código, mais problema do que
> solução. Também foi decidido migrar para SQL escrito da forma mais natural, verificável e validada
> possível — o SQL atual está destruindo a performance e está muito mal escrito. Não existe mais nenhuma
> ligação com a infra da Magalu Cloud dentro deste projeto.

**Conferência contra o código (mesma data):**

- **Magalu:** procede operacionalmente, mas sobrou resíduo.
  - O adapter `magalu-object-storage` existe (`src/modules/contracts/adapters/storage/magalu-cloud-config.ts`, 135 linhas) e é exportado pelo `public-api` do `contracts`.
  - Nenhum composition root o instancia, e o próprio `src/deploy/capability-adapters.ts:95` registra isso.
  - Continuam no código e na doc: 4 variáveis `MAGALU_*` em `src/deploy/env-catalog.ts:516-535`, menções em `.claude/rules/supply-chain.md`, `.claude/skills/web-security-backend/`, `README.md` e o [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md), `Accepted`, que ainda põe a homologação na Magalu.
  - Pela regra do repositório, isso é **divergência a registrar**. A limpeza do código é issue; o ADR-0021 só muda por ADR novo.
- **ETL:** o `package.json` ainda tem os scripts `etl:*` e `scripts/etl/` existe. O desligamento é intenção declarada, ainda não executada, e a branch `experimento/arrancar-etl` está fora da `dev`.
- **"O SQL atual destrói a performance":** é avaliação do dono do repositório e ainda não foi medida nesta inquiry. P5 mede a linha de base, para que o antes e depois da reescrita seja comparável.

### 2026-11-23 — P4: pesquisa da stack SQL-first e spike executado contra PostgreSQL 18.7

**Pesquisa** (versões e datas pelo registry npm e pela API do GitHub; comportamento pelo README, pela doc ou pelo código-fonte de cada ferramenta):

| Papel | Escolha | Descartados, e por quê |
| :--- | :--- | :--- |
| Migrations em SQL puro, com up e down | **dbmate** 2.38.2 | Graphile Migrate: sem down e sem v2 estável. Atlas: lint e testes ficam no plano pago. Sqitch fica como plano B (exige Perl) |
| Rascunho de migration e checagem de drift | **psqldef** 3.11.30 (o CI deles testa PG 18) | — |
| Queries e commands em `.sql`, com tipos gerados pelo servidor | **PgTyped** 2.4.x | SafeQL é regra de ESLint e o projeto usa oxlint. sqlc-gen-typescript está parado e sem LICENSE. Kysely é builder, não SQL à mão. TypeSQL marca Postgres como "Experimental". sqlx-ts baixa binário no postinstall |
| Driver | **pg** 8.23.1 | postgres.js 4.1.1 é tecnicamente superior (`AbortSignal`, zero deps), mas é uma major de 4 semanas e o runtime do PgTyped espera a interface do `pg` |
| Lint de migration | **squawk** 2.73.0 (a 2.74.0 ainda está na quarentena do `minimumReleaseAge`) | — |
| Testes de schema | **pgTAP** | — |

**Spike** em `~/dev/Casly/spike-pg18-sql-first`, fora do repositório. A fatia é real: `par_suppliers`, `fin_outbox` e `eventos_processados` com claim por consumidor (ADR-0064). O PostgreSQL 18.7 foi compilado da fonte oficial, com SHA-256 conferido e ICU, via `~/instalar-postgresql.pl`. Resultado: **7/7 testes verdes**, mais rollback e reaplicação da migration.

| Prova | Resultado |
| :--- | :--- |
| `LIKE '%jose%'` em coluna `COLLATE ci_ai` (ICU `und-u-ks-level1`, não-determinística) acha `José` e `JOSE` | ✅ É o equivalente do `utf8mb4_unicode_ci`, nativo no PG 18 |
| Paginação keyset `(name, id) > (…)` sem repetir nem pular linha | ✅ |
| Upsert `ON CONFLICT … RETURNING new.*, old.name` (PG 18) | ✅ Devolve o nome anterior na atualização e `NULL` na inserção |
| Duas réplicas do mesmo consumidor em `FOR UPDATE OF o SKIP LOCKED` | ✅ Lotes disjuntos, sem espera |
| **Produtor grava com um claim aberto**, com `lock_timeout = 1s` como detector | ✅ **Não bloqueia.** No InnoDB, este é o cenário do `1205` por gap lock que obrigou o claim a rodar em `READ COMMITTED` (rule `adapters.md`) |
| Fanout: o que um consumidor processou continua pendente para o outro | ✅ |
| `EXPLAIN` da busca `LIKE '%…%'` | `Seq Scan` + `Sort`, como esperado: collation não-determinística não serve `LIKE` por índice. Medir em volume real é a P5 |

**Achados do spike, que entram como condição da adoção:**

1. **O squawk reprovou o primeiro rascunho em 8 pontos, todos vícios trazidos do MySQL:**
   - `varchar(n)` deve virar `text` + `CHECK (char_length(...) …)`, porque mudar o `n` depois exige lock exclusivo;
   - `SET lock_timeout` e `statement_timeout` precisam vir no início da migration;
   - `bigint` no lugar de `integer`.
   - Com isso corrigido, deu 0 issues. O lint funciona como professor do idioma Postgres, que é exatamente o papel pedido.
2. **`camelCaseColumnNames` do PgTyped é um tipo que mente.** A opção muda só os tipos gerados, o runtime devolve `snake_case`, e o typecheck passa com os valores `undefined`. **Proibir a opção.** O tipo fica com o nome da coluna, e a tradução para o domínio continua no mapper do adapter, como já é hoje.
3. **A nulidade em `RETURNING old.*` sai errada.** O PgTyped deduz `string` da coluna base `NOT NULL`, mas o valor é `NULL` na inserção. Corrige-se com a dica `AS "previous_name?"`. Toda expressão que não seja coluna direta precisa de revisão de nulidade.
4. **O PgTyped imprime erro de parse e sai com código 0, apesar do `failOnError`.** Ele recusa texto livre dentro do bloco `/* @name … */`. No CI, a geração de tipos precisa de outra trava: o typecheck do código que importa o `*.queries.ts`, mais `git diff --exit-code` sobre os arquivos gerados.
5. **O driver `pg` devolve `bigint` como `string`.** O tipo gerado está correto, mas afeta o `Money` em centavos (bigint). A migração precisa de um parser de `int8` → `bigint` no driver, decidido junto com o mapper do `Money`.
6. **Supply chain:**
   - `@pgtyped/cli` → `io-ts-reporters` puxa o `@scarf/scarf`, telemetria com postinstall. O `allowBuilds` do pnpm barrou o script; foi negado explicitamente (`'@scarf/scarf': false`) e o PgTyped funciona sem ele.
   - dbmate e squawk chegam como `optionalDependencies` por plataforma, sem script.
7. **O código gerado roda direto pelo type stripping do Node 26:** sem `enum`, e com o import do runtime como valor.

### Não confirmado

- Versão default do RDS e do Aurora, e disponibilidade por versão em `sa-east-1` (a doc não detalha por região).
- Lista ao vivo da Magalu: `mgc` não está autenticada.
- Fonte primária sobre gap locks: o PostgreSQL não usa next-key/gap lock em `READ COMMITTED` como o InnoDB em `REPEATABLE READ`, mas isso ainda não foi citado da doc oficial nem medido contra os cenários da 0031 e da 0032.

---

## 4. Análise interna

### A versão

**PostgreSQL 18 (18.7)** é a versão mais compatível com o código de hoje. Motivos:

1. É a primeira em que a busca por nome sem diferenciar caixa nem acento (`utf8mb4_unicode_ci` + `like`) tem equivalente direto, por collation ICU não-determinística com `LIKE`. Na 17 isso vira projeto à parte: coluna normalizada `STORED` mais wrapper imutável de `unaccent`, em todo campo pesquisável.
2. Tem 7 minors de maturidade, está no RDS e no Aurora, e o suporte vai até 2030 (comunidade) / 2031 (RDS).
3. O `pg_upgrade` com estatísticas preservadas barateia o 18→19 futuro.

**Por que não a 19 agora:** a 19.0 tem 4 dias e nenhum provedor gerenciado a oferece. Pela política da AWS (major nova até 30 dias depois da x.1), o RDS deve recebê-la por volta de março de 2027; isso é inferência, não data anunciada. O que se perde ficando na 18:

- `ON CONFLICT DO SELECT`;
- `WAIT FOR LSN` para o read/write split;
- `pg_stat_lock`;
- um ano a mais de suporte.

**O bloqueio da Magalu caiu (P2, §3).** O DBaaS da Magalu só ia até a 17, mas o projeto não tem mais ligação com ela. Com isso, a 17.12 perde o único motivo que tinha. Todos os ambientes podem ficar na 18.7: RDS/Aurora na AWS e `postgres:18.7` fixado por tag no local e no CI.

### As premissas do ADR-0013

| Premissa (2026-04-28) | Estado em 2026-11-23 | Ainda vale? |
| :--- | :--- | :--- |
| Dump MySQL → MySQL do legado, sem conversão | O core-api tem schema próprio (136 migrations) e um ETL de mapeamento, não dump. **O ETL vai ser desligado** (Gabriel, §3) | ❌ Sem ETL, não há fluxo legado → core-api para manter no mesmo engine. A alternativa B rejeitada no ADR-0013 (cross-engine) deixa de existir como problema |
| Codebit opera MySQL | Produção na AWS (ADR-0021); **nenhuma ligação com a Magalu** (§3) | ❌ |
| Uma batalha de cada vez (ADR-0001) | **A reescrita do SQL já foi decidida** (§3) | ❌ **Inverte o argumento.** O maior custo de trocar de engine era traduzir 97 upserts, 136 migrations e o SQL cru, e esse SQL vai ser reescrito de qualquer forma. Trocar o engine depois da reescrita seria pagar a tradução duas vezes; junto com ela, a batalha é uma só |

**Nenhuma das três premissas do ADR-0013 se sustenta hoje.** O ADR registrava a escolha por continuidade e listava como negativos do MySQL a falta de JSONB, índice parcial, `LISTEN/NOTIFY` e schemas reais. Sem a continuidade, sobram só os negativos.

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| A. Ficar no MySQL 8.4 | Zero custo de migração; código e testes de lock já medidos no InnoDB | Collation `_ci` e deadlocks de gap lock continuam (0031/0032); ecossistema SQL-first mais pobre (ver abaixo) | em aberto |
| B. PostgreSQL 18.7 | Única versão com equivalente direto da busca `_ci`; RDS/Aurora; suporte até 2030/31 | Tradução de 97 upserts, errno e 136 migrations — custo que a reescrita do SQL já vai pagar | **versão recomendada** |
| C. PostgreSQL 17.12 | 12 minors | Busca `_ci` vira projeto à parte; sem `uuidv7`/`RETURNING OLD/NEW`; EOL 2029; um upgrade de major a mais | ❌ seu único motivo era a Magalu, que saiu do projeto |
| D. PostgreSQL 19.0 | Mais features e suporte até 2031 | 4 dias de vida; sem oferta gerenciada | ❌ reavaliar quando entrar no RDS |

**Ligação com a pesquisa SQL-first (mesma sessão):** a recomendação para MySQL era Skeema (schema), dbmate (migrations) e Kysely + kysely-codegen (queries). **O Skeema é só MySQL.** No PostgreSQL, o leque de ferramentas que tipam SQL escrito à mão é maior e mais maduro (PgTyped, SafeQL, sqlc com TS, Atlas/sqldef para schema declarativo). Escolher o engine muda a resposta daquela pesquisa, então as duas decisões devem andar juntas.

---

## 5. Decisão final

**PARCIAL (2026-11-23).**

- **Versão:** **PostgreSQL 18.7** em todos os ambientes. A 17 perdeu o único motivo que tinha (a Magalu) e a 19 espera oferta gerenciada.
- **Premissas do ADR-0013:** nenhuma se sustenta (§4). A reescrita do SQL já está decidida, então o custo da troca de engine coincide com um trabalho que vai acontecer de qualquer forma.
- **Ainda não decidido:** a troca de engine em si. Ela sai como ADR que substitui o 0013 e o 0020, e esse ADR deve nascer junto com a escolha da stack SQL-first (P4) e com as medições (P3, P5). Sem elas, o ADR afirmaria ganho sem número.

---

## 6. Saídas (outputs concretos)

- [x] **P1.** As premissas do ADR-0013 ainda valem? — **Não** (Gabriel, 2026-11-23): o ETL será desligado, a reescrita do SQL está decidida e não há ligação com a Magalu. Ver §3 e §4.
- [x] **P2.** Onde fica a homologação? — **Fora da Magalu**, que saiu do projeto. PG 18.7 em todos os ambientes.
- [ ] **P3.** Medir, num PostgreSQL 18 real, os cenários de deadlock das inquiries 0031 e 0032 em `READ COMMITTED`, com citação da doc oficial sobre o modelo de locks. **Parcial (2026-11-23):** o outbox com `SKIP LOCKED` e o produtor sem bloqueio durante o claim já estão provados pelo spike (§3). Faltam os dois ciclos de deadlock: a reserva de remessa da 0031 e o hard replace do documento da 0032.
- [x] **P4.** Escolher a stack SQL-first para PostgreSQL. — **dbmate + psqldef + PgTyped + pg + squawk + pgTAP**, provada por spike com 7/7 verdes contra o PG 18.7. Os 7 achados que viram condição de adoção estão no §3.
- [ ] **P5.** Medir a linha de base de desempenho do SQL atual, com as queries mais lentas e o `EXPLAIN` das rotas quentes, para que "o SQL atual destrói a performance" vire número comparável antes e depois da reescrita.

---

## 7. Referências

- [ADR-0013](../architecture/adr/0013-mysql-database-engine.md) · [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) · [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) · [ADR-0026](../architecture/adr/0026-mysql-read-write-split-connection.md)
- [Inquiry-0008](./0008-postgres-driver-pg-vs-postgres.md) · [Inquiry-0010](./0010-mysql-engine-correction.md) · [Inquiry-0031](./0031-deadlock-na-reserva-atomica-de-remessa.md) · [Inquiry-0032](./0032-titulo-remetido-fronteira-do-agregado.md)
- PostgreSQL: [versionamento](https://www.postgresql.org/support/versioning/) · [18 released](https://www.postgresql.org/about/news/postgresql-18-released-3142/) · [19 released](https://postgresql.org/about/news/postgresql-19-released-3449) · [release notes 19.0](https://www.postgresql.org/docs/release/19.0/) · [pattern matching (18)](https://www.postgresql.org/docs/18/functions-matching.html) · [collation (18)](https://www.postgresql.org/docs/18/collation.html)
- AWS: [calendário RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html) · [calendário Aurora PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html)
- Magalu: [versões do DBaaS PostgreSQL](https://docs.magalu.cloud/docs/dbaas/postgres/security-monitoring/versions)
- Drizzle: [PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql) · [generated columns](https://orm.drizzle.team/docs/generated-columns)
