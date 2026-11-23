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
- **Gatilho de fechamento:** o ADR que substitui o 0013 e o 0020 escrito com os números das P3, P4 e P5 (P6, §6). As P1 a P5 foram respondidas em 2026-11-23.

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

### 2026-11-23 — P3: os ciclos de deadlock da 0031 e da 0032 medidos no PostgreSQL 18.7

Mesmo spike, com a migration `20261123000002_financial_lock_cycles.sql`: o recorte do `financial` que forma os dois ciclos (`fin_documents`, `fin_payables`, `fin_remittances`, `fin_remittance_payables`), com as FKs e o `ON DELETE` iguais aos de `schemas/mysql.ts` — `CASCADE` dentro do documento, `RESTRICT` nas três FKs do vínculo. Os testes ficam em `test/lock-cycles.test.ts`.

Cada rodada força a mesma intercalação dos dumps das inquiries de origem. Duas sessões, `READ COMMITTED` (o default), `deadlock_timeout = 50ms`. O teste só avança quando `pg_stat_activity` mostra a sessão anterior em `wait_event_type = 'Lock'`. Há 6.000 títulos fictícios de fundo, para que nenhum lock caia em tabela vazia. São **20 rodadas por cenário**.

| Cenário | MySQL 8.4 (medido na inquiry de origem) | PostgreSQL 18.7 |
| :--- | :--- | :--- |
| **0031**: duas emissões dos mesmos títulos, na ordem **antiga** (busca da remessa inexistente com `FOR UPDATE` antes de travar os títulos) | deadlock em 20/20; gap lock no `supremum` × insert-intention | **0/20 deadlocks.** A primeira emissão grava 20/20 e a segunda é recusada por `payables-already-held` 20/20, isto é, a releitura sob lock vê o vínculo já commitado |
| **0032**: emissão × hard replace do documento, com o documento travado por `SELECT … FOR UPDATE`, que é o que `document-repository.drizzle.ts:224-228` faz | 10/10 deadlocks, em RR e em RC | **deadlock em 20/20** (`40P01`). A vítima foi sempre a emissão |
| **0032**, com o documento travado por `SELECT … FOR NO KEY UPDATE` | não existe no InnoDB | **0/20 deadlocks.** A emissão grava 20/20 e o hard replace é recusado com `23001 restrict_violation` 20/20: a regra de negócio aparece no lugar do deadlock |

**Por que cada resultado sai assim, pela doc oficial do PostgreSQL 18:**

- **0031.** No PostgreSQL a busca por uma linha inexistente não deixa lock. O `FOR UPDATE` trava linhas encontradas, e não há equivalente ao gap lock do InnoDB. A doc não afirma isso com a palavra "gap": a página de isolamento só menciona *predicate locking* para `SERIALIZABLE`. **A prova é a medição.** A segunda sessão espera no título e, em `READ COMMITTED`, *"the would-be updater will wait for the first updating transaction to commit or roll back"* e *"the search condition of the command (the `WHERE` clause) is re-evaluated"* ([transaction-iso](https://www.postgresql.org/docs/18/transaction-iso.html) §13.2.1).
- **0032 com `FOR UPDATE`.** A checagem de FK do `INSERT` em `fin_remittance_payables` pede `FOR KEY SHARE` na linha do documento. Pela tabela de conflitos, `FOR KEY SHARE` conflita **só** com `FOR UPDATE` ([explicit-locking](https://www.postgresql.org/docs/18/explicit-locking.html), Tabela 13.3). O ciclo é o mesmo do InnoDB, porque nasce da **ordem de aquisição** do código e não do engine. *"The best defense against deadlocks is generally to avoid them by being certain that all applications … acquire locks on multiple objects in a consistent order"* (§13.3.4).
- **0032 com `FOR NO KEY UPDATE`.** *"this lock will not block `SELECT FOR KEY SHARE` commands that attempt to acquire a lock on the same rows"*, e é o mesmo lock que *"any `UPDATE` that does not acquire a `FOR UPDATE` lock"* já toma (§13.3.2). O documento continua serializado contra outro `save`, mas deixa de bloquear quem só precisa que a chave exista.

**Achados que entram como condição da adoção:**

1. **A troca de engine não cura o ciclo da 0032 sozinha.** O `save` do documento precisa travar com `FOR NO KEY UPDATE`, porque `FOR UPDATE` reproduz o deadlock 20/20. O `version` e o `UPDATE` do documento não mexem na chave, então não há motivo para o lock mais forte.
2. **A ordem de aquisição da 0031 (braço A) passa a ser defesa em profundidade, e não a correção.** Sem gap lock, a ordem antiga não deadlocka. Manter a ordem global não custa nada e evita a próxima surpresa.
3. **`ON DELETE RESTRICT` responde `23001 restrict_violation`, e não `23503 foreign_key_violation`.** É o que o PG chama de `restrict_violation` ([errcodes](https://www.postgresql.org/docs/18/errcodes-appendix.html)). Quem hoje traduz o `1451` do MySQL precisa reconhecer o `23001`, senão a recusa "título já remetido" vira erro genérico de infraestrutura. O primeiro rascunho do teste esperava `23503` e falhou nisso.
4. **O `1213` vira `40P01 deadlock_detected`**, e o `withDeadlockRetry` precisa ser retraduzido junto. `55P03 lock_not_available` é o equivalente do `1205`.

### 2026-11-23 — P5: linha de base de desempenho do SQL atual (MySQL 8.4.13, carga fictícia)

**Ambiente.** MySQL **8.4.13**, a mesma linha do `compose.yaml` (`mysql:8.4`), baixado do CDN oficial com a assinatura GPG da Oracle conferida e instalado em `~` sem sudo. Fica num laboratório fora do repositório (`~/dev/Casly/p5-mysql-baseline`) com `innodb_buffer_pool_size = 2G`, na máquina de desenvolvimento (8 vCPU, 15 GB, WSL2).

**Schema.** As **136 migrations reais**, aplicadas por `src/jobs/migrate/run.ts` sem nenhuma alteração.

**Volume.** É **premissa declarada, não medição de produção**. Todos os dados são fictícios: nomes de listas fixas, documentos com raiz `9`, UUID v4 derivado de hash.

| Tabela | Linhas |
| :--- | ---: |
| `par_suppliers` / `fin_supplier_view` | 5.000 |
| `fin_documents` | 100.000 |
| `fin_payables` / `fin_payable_view` | 200.000 (1 principal + 1 retenção por nota) |
| `fin_remittances` / `fin_remittance_payables` | 2.000 / 40.000 |
| `fin_reconciliations` / `_items` | 60.000 / 60.000 |
| `ctr_contracts` | 5.000 |

**Método.**
- O **servidor HTTP real** (`src/server.ts`, código sem alteração) roda contra esse banco, e as rotas `GET` vêm do próprio OpenAPI (`/docs/json`).
- O SQL medido é o que o Drizzle de fato emite. Cada rota é chamada 1 vez para aquecer e 7 vezes medidas; a tabela mostra a mediana.
- O SQL é atribuído por `performance_schema.events_statements_summary_by_digest`, zerado antes de cada rota, e o plano vem de `EXPLAIN ANALYZE` sobre o texto capturado em `events_statements_history_long`.
- Variantes: padrão (página 1), busca `silva` e página 2000.
- Resultado reprodutível: os números se repetiram, dentro de ±20%, depois de recriar o banco do zero.
- Foram 73 casos (rota × variante).
  - 61 responderam 200. Os 47 que não estão na tabela abaixo ficaram abaixo de 80 ms.
  - 12 responderam 400/404, porque o gerador não preencheu algum parâmetro obrigatório.
  - **Ficaram sem medição:** `/financial/payables`, `/financial/reconciliation-periods`, `/reports/dashboard/realized`, `/partner-municipalities`, `/programs` e `/users`.

**Os casos acima de 100 ms:**

| Rota | Mediana | Queries/req | O que gasta o tempo |
| :--- | ---: | ---: | :--- |
| `GET /reports/generalReport` | **3,6–4,0 s** | 15–23 | `COUNT(*)` de 2,9–3,3 s examinando **800 mil linhas**, sem índice. Depois o `SELECT` da página (0,7–1,4 s). Mais **N+1**: uma consulta ao `partners` por fornecedor da página (12–20 por request) |
| `GET /financial/payable-titles/counts` | **2,4 s** | 3 | `GROUP BY status` sobre o join inteiro (300 mil linhas examinadas), mais o `COUNT` e o `SELECT` de `listDocuments` com a `recon` |
| `GET /reports/cashflow/chart` | **2,3 s** | 1 | 622 mil linhas examinadas; `GROUP BY` + `ORDER BY` sobre `DATE_FORMAT(due_date)`; temporária com 21.600 linhas |
| `GET /reports/payment-position` | **2,3 s** | 1 | **1 milhão de linhas examinadas**, sem índice; temporária com 5.000 grupos |
| `GET /financial/documents` | **1,8–2,1 s** | 2 | A `recon` (abaixo) executada **duas vezes**: no `COUNT` e no `SELECT` da página. A página 1 custa 0,7 s para devolver 20 linhas |
| `GET /reports/cashflow` | **1,9 s** | 1 | 600 mil linhas examinadas, sem índice |
| `GET /financial/payable-titles` | **0,6–0,7 s** | 2 | `COUNT` do join inteiro (300 mil); `ORDER BY created_at` sem índice, filesort sobre 200 mil |
| `GET /reports/realized` | **0,6 s** | 4 | `YEAR(reconciled_at)` / `DATE_FORMAT` no `WHERE` e no `GROUP BY`; 164 mil + 118 mil linhas |
| `GET /financial/dashboard/cost-centers` | **0,25 s** | 1 | soma condicional sobre todos os pagos, sem recorte de data no `WHERE` |

**O padrão que mais custa: a subquery `recon`.** É `document-repository.drizzle.ts:529-537`, e `general-report-projection.ts:137-143` repete o padrão. O plano é sempre o mesmo:

```
-> Materialize  (actual time=714..714 rows=100000 loops=1)
   -> Group aggregate: count(0), sum((fin_payables.status = 'Reconciled'))  (actual time=0.7..533 rows=100000)
      -> ... fin_payables (200000 linhas)
```

A tabela derivada agrupa **todos** os títulos da base (100 mil grupos, ~0,7 s) para usar 20 deles. Como `COUNT` e página são duas queries, ela roda duas vezes por request. O custo cresce com o tamanho da base, e não com o da página: com o dobro de títulos, a listagem de documentos dobra.

**Resumo para o antes e depois da reescrita:**
- **Agregação sobre a tabela inteira para servir uma página:** `recon` e os `COUNT(*)` totais.
- **Função sobre coluna em `WHERE` e `GROUP BY`:** `YEAR()` e `DATE_FORMAT()`.
- **`ORDER BY` em coluna sem índice.**
- **N+1 cross-módulo:** generalReport.
- **`OFFSET`:** a página 2000 custa pouco a mais que a página 1. O custo dominante já é a varredura total, e não o deslocamento.

O PostgreSQL não resolve nenhum desses itens sozinho. São defeitos de SQL, e o número acima é a régua da reescrita.

### Não confirmado

- Versão default do RDS e do Aurora, e disponibilidade por versão em `sa-east-1` (a doc não detalha por região).
- Lista ao vivo da Magalu: `mgc` não está autenticada.
- Volume real de produção. A P5 usou volume fictício declarado acima; a relação entre o tempo e o tamanho da base vale como forma, mas o número absoluto de produção depende do volume de lá.
- A ausência de gap lock em `READ COMMITTED` no PostgreSQL está **medida** (P3, cenário 0031), mas a doc oficial não a afirma com essas palavras.

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
| A. Ficar no MySQL 8.4 | Zero custo de migração; código e testes de lock já medidos no InnoDB | Collation `_ci` e deadlocks de gap lock continuam (0031/0032); ecossistema SQL-first mais pobre (ver abaixo) | em aberto; ver o balanço abaixo |
| B. PostgreSQL 18.7 | Única versão com equivalente direto da busca `_ci`; RDS/Aurora; suporte até 2030/31 | Tradução de 97 upserts, errno e 136 migrations — custo que a reescrita do SQL já vai pagar | **versão recomendada** |
| C. PostgreSQL 17.12 | 12 minors | Busca `_ci` vira projeto à parte; sem `uuidv7`/`RETURNING OLD/NEW`; EOL 2029; um upgrade de major a mais | ❌ seu único motivo era a Magalu, que saiu do projeto |
| D. PostgreSQL 19.0 | Mais features e suporte até 2031 | 4 dias de vida; sem oferta gerenciada | ❌ reavaliar quando entrar no RDS |

**Ligação com a pesquisa SQL-first (mesma sessão):** a recomendação para MySQL era Skeema (schema), dbmate (migrations) e Kysely + kysely-codegen (queries). **O Skeema é só MySQL.** No PostgreSQL, o leque de ferramentas que tipam SQL escrito à mão é maior e mais maduro (PgTyped, SafeQL, sqlc com TS, Atlas/sqldef para schema declarativo). Escolher o engine muda a resposta daquela pesquisa, então as duas decisões devem andar juntas.

### Balanço: mudar ou não mudar (2026-11-23)

Cada ponto aponta para a evidência da §3. Quando não há evidência, o ponto diz isso.

**Pontos para mudar:**

| # | Ponto | Evidência |
| :- | :--- | :--- |
| M1 | As três premissas que mantiveram o MySQL caíram. O ADR-0013 já listava os negativos do MySQL; sem a continuidade, eles ficam sem contrapeso | §4, premissas |
| M2 | A reescrita do SQL já está decidida. Feita no PostgreSQL, a tradução de 97 upserts, 136 migrations e 204 SQL crus é paga uma vez só; feita no MySQL e trocada depois, é paga duas | §3, inventário; §4 |
| M3 | O objetivo declarado é SQL "natural, verificável e validado". No PostgreSQL existe a cadeia completa: tipos derivados do servidor (PgTyped), lint de migration (squawk) e teste de schema (pgTAP). No MySQL o Skeema cobre o schema, mas as queries ficam em builder (Kysely), e não em SQL escrito à mão | P4 |
| M4 | Sem gap lock em `READ COMMITTED`: o ciclo da 0031 não ocorre (0/20), e o produtor do outbox não bloqueia com um claim aberto, o que dispensa o desvio de isolamento da rule `adapters.md` | P3, P4 |
| M5 | Modos de lock mais finos (`FOR NO KEY UPDATE` × `FOR KEY SHARE`) dão o remédio para o ciclo da 0032 sem reordenar o agregado | P3 |
| M6 | A busca sem caixa nem acento tem equivalente nativo no 18, com `LIKE` em collation ICU | P4, spike |
| M7 | Recursos que o código hoje contorna: `RETURNING` (inclusive `OLD`/`NEW` no upsert), `uuidv7()`, índice parcial, schemas reais (alternativa ao isolamento por prefixo do ADR-0014) e DDL transacional (no MySQL, DDL faz commit implícito, então uma migration que falha no meio deixa estado parcial) | §3, versões; spike (rollback e reaplicação) |

**Pontos para não mudar (ou custos e riscos de mudar):**

| # | Ponto | Evidência |
| :- | :--- | :--- |
| N1 | **A lentidão não é do engine.** As 9 rotas lentas são agregação sobre a tabela inteira, função em `WHERE`, `ORDER BY` sem índice e N+1. Uma reescrita no próprio MySQL resolve todas | P5 |
| N2 | O deadlock da 0032 continua no PostgreSQL se o código não mudar (20/20 com `FOR UPDATE`) | P3 |
| N3 | **Migração dos dados de produção.** Desligar o ETL elimina o fluxo legado → core-api, mas não os dados que o próprio core-api já tenha gravado em MySQL. Se houver produção com dado real, a conversão é um projeto à parte, com janela de corte e conferência | **não medido**: volume e existência de produção não confirmados |
| N4 | O harness inteiro é MySQL: 52 arquivos em `.claude/` (rules, skills e agents), 5 ADRs com MySQL no título (0013, 0014, 0015, 0020, 0026), 19 gates em `tests/cleanup`/semgrep, mais compose, CI e deploy. Cada um precisa ser reescrito ou aposentado, e ADR aceito só muda por ADR novo | `grep -ril mysql` em 2026-11-23 |
| N5 | A semântica de isolamento muda: o default passa de `REPEATABLE READ` (InnoDB) para `READ COMMITTED`. Os 21 pontos com isolamento explícito e o código que conte com o snapshot do RR precisam ser revistos | §3, inventário |
| N6 | Ferramentas menos maduras do que parecem: o PgTyped sai com código 0 em erro de parse, deduz nulidade errada em `RETURNING old.*` e tem uma opção (`camelCaseColumnNames`) que mente no tipo. O `pg` devolve `bigint` como string, o que toca o `Money`. O `@scarf/scarf` tenta rodar telemetria no postinstall | P4, achados 2 a 6 |
| N7 | A busca `_ci` no 18 tem limites: só `LIKE` (sem `ILIKE` nem regex), não usa índice e o B-tree perde a deduplicação | P4; doc de collation do 18 |
| N8 | Mudar engine e SQL ao mesmo tempo concentra o risco numa entrega só. É o oposto do "uma batalha de cada vez" do ADR-0001, ainda que M2 mostre que separar as duas custa mais | §4 |
| N9 | O `WAIT FOR LSN`, que daria leitura das próprias escritas na réplica (ADR-0026), só existe no 19, que ainda não tem oferta gerenciada | §3, versões |

**Pontos neutros:** os dois engines estão no RDS e no Aurora em `sa-east-1`; `FOR UPDATE`, `SKIP LOCKED` e `CHECK` existem nos dois; o Drizzle suporta os dois dialetos.

**Como os pontos se pesam:**

- **N1 tira o desempenho da conta.** Desempenho justifica a reescrita, não a troca de engine. A troca se sustenta em M2, M3 e M4: custo pago uma vez, ferramentas para o SQL verificável e uma classe inteira de deadlock (gap lock) que deixa de existir.
- **N2, N5, N6 e N7 viram condições de adoção**, e não motivos contra: cada um tem remédio conhecido e medido (P3, P4).
- **N4 é custo certo e grande, mas finito**, e uma parte dele (ADRs e rules sobre o SQL atual) muda com a reescrita de qualquer forma.
- **N3 é o único ponto que pode inverter o balanço.** Sem produção com dado real, a troca custa quase só a reescrita, que já vai acontecer. Com produção, entra uma migração de dados que esta inquiry não mediu.
- **N8 se mitiga pela ordem:** migrar por módulo (o isolamento por prefixo `ctr_*`/`fin_*` do ADR-0014 permite essa divisão), começando por um módulo pequeno, com a régua da P5 no fim de cada etapa.

**N3 respondida (Gabriel, 2026-11-23):**

> Tem dados em produção, porém estão desatualizados e precisam ser migrados para produção de qualquer maneira, e podemos
> manter um dump do banco também para isso, fazendo não ser um impedimento.

Uma carga de dados em produção já ia acontecer de qualquer forma. A conversão de MySQL para PostgreSQL entra nessa carga, em vez de ser um projeto à parte, e o dump do MySQL serve de reserva e de base para conferir a conversão. O que sobra de N3 é uma **condição de adoção**: um script de conversão verificado, que trate:

- `datetime` → `timestamp`;
- `varchar(36)` → `uuid`;
- `bigint` do `Money`;
- collations;
- e confira a contagem de linhas e somas de controle contra o dump.

**Leitura:** com N3 neutralizado, **nenhum ponto inverte o balanço, e ele favorece mudar**. Os custos que sobram (N2 e N4 a N9) entram no ADR (P6) como condições de adoção e plano de execução.

---

## 5. Decisão final

**PARCIAL (2026-11-23).**

- **Versão:** **PostgreSQL 18.7** em todos os ambientes. A 17 perdeu o único motivo que tinha (a Magalu) e a 19 espera oferta gerenciada.
- **Premissas do ADR-0013:** nenhuma se sustenta (§4). A reescrita do SQL já está decidida, então o custo da troca de engine coincide com um trabalho que vai acontecer de qualquer forma.
- **Medições (P3, P5, 2026-11-23):**
  - Dos dois ciclos de deadlock, o da 0031 some no PG 18.7.
  - O da 0032 só some com `FOR NO KEY UPDATE` no `save` do documento, uma mudança de código que entra na reescrita.
  - A linha de base do SQL atual tem 9 rotas acima de 100 ms. A pior é o `generalReport`, com ~4 s em 200 mil títulos fictícios.
  - O custo dominante é agregação sobre a tabela inteira para servir uma página. É defeito de SQL, independente de engine.
- **Balanço mudar × não mudar (§4):** favorece mudar. O único ponto capaz de inverter, a migração dos dados de produção, foi neutralizado na P7: a carga já ia acontecer, e há dump de reserva.
- **Ainda não decidido:** a troca de engine em si. Ela sai como ADR que substitui o 0013 e o 0020, com os números da §3 (P6).

---

## 6. Saídas (outputs concretos)

- [x] **P1.** As premissas do ADR-0013 ainda valem? — **Não** (Gabriel, 2026-11-23): o ETL será desligado, a reescrita do SQL está decidida e não há ligação com a Magalu. Ver §3 e §4.
- [x] **P2.** Onde fica a homologação? — **Fora da Magalu**, que saiu do projeto. PG 18.7 em todos os ambientes.
- [x] **P3.** Medir, num PostgreSQL 18 real, os cenários de deadlock das inquiries 0031 e 0032 em `READ COMMITTED`, com citação da doc oficial sobre o modelo de locks.
  - **0031:** 0/20 deadlocks; a segunda emissão é recusada corretamente.
  - **0032 com `FOR UPDATE`:** 20/20 deadlocks, como no MySQL.
  - **0032 com `FOR NO KEY UPDATE`:** 0/20 deadlocks, e a recusa sai como `23001`.
  - Os 4 achados de adoção estão no §3.
- [x] **P4.** Escolher a stack SQL-first para PostgreSQL. — **dbmate + psqldef + PgTyped + pg + squawk + pgTAP**, provada por spike com 7/7 verdes contra o PG 18.7. Os 7 achados que viram condição de adoção estão no §3.
- [x] **P5.** Medir a linha de base de desempenho do SQL atual, com as queries mais lentas e o `EXPLAIN` das rotas quentes, para que "o SQL atual destrói a performance" vire número comparável antes e depois da reescrita.
  - Medido no MySQL 8.4.13, com as 136 migrations reais, o servidor HTTP real e carga fictícia de 100 mil notas e 200 mil títulos.
  - 9 rotas passam de 100 ms, de 0,25 s a 4,0 s.
  - O padrão dominante é a `recon`, que materializa 100 mil grupos para servir 20 linhas.
  - A tabela completa e os planos estão no §3.
- [ ] **P6.** Escrever o ADR que substitui o [ADR-0013](../architecture/adr/0013-mysql-database-engine.md) e o [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md). Ele leva:
  - a versão (18.7) e a stack (P4);
  - as condições de adoção da P3 e da P4;
  - a linha de base da P5 como régua da reescrita;
  - o balanço mudar × não mudar (§4), com a conversão dos dados de produção verificada contra o dump (P7) como condição.
- [x] **P7.** Existe dado de produção gravado pelo core-api em MySQL? — **Sim, desatualizado, e precisa ser carregado em produção de qualquer forma** (Gabriel, 2026-11-23). Fica um dump do MySQL de reserva. A conversão entra nessa carga e deixa de ser impedimento. A condição de adoção é um script de conversão verificado contra o dump (§4, balanço).

---

## 7. Referências

- [ADR-0013](../architecture/adr/0013-mysql-database-engine.md) · [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) · [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) · [ADR-0026](../architecture/adr/0026-mysql-read-write-split-connection.md)
- [Inquiry-0008](./0008-postgres-driver-pg-vs-postgres.md) · [Inquiry-0010](./0010-mysql-engine-correction.md) · [Inquiry-0031](./0031-deadlock-na-reserva-atomica-de-remessa.md) · [Inquiry-0032](./0032-titulo-remetido-fronteira-do-agregado.md)
- PostgreSQL: [versionamento](https://www.postgresql.org/support/versioning/) · [18 released](https://www.postgresql.org/about/news/postgresql-18-released-3142/) · [19 released](https://postgresql.org/about/news/postgresql-19-released-3449) · [release notes 19.0](https://www.postgresql.org/docs/release/19.0/) · [pattern matching (18)](https://www.postgresql.org/docs/18/functions-matching.html) · [collation (18)](https://www.postgresql.org/docs/18/collation.html)
- AWS: [calendário RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html) · [calendário Aurora PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html)
- Magalu: [versões do DBaaS PostgreSQL](https://docs.magalu.cloud/docs/dbaas/postgres/security-monitoring/versions)
- Drizzle: [PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql) · [generated columns](https://orm.drizzle.team/docs/generated-columns)
