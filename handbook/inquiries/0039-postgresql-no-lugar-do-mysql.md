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
- **Gatilho de fechamento:** decisão registrada sobre P1 e P2 (§6). Se a decisão for migrar, ela sai como ADR que substitui o 0013 e o 0020. Se não, esta inquiry fica `decided` com o motivo.

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

**O bloqueio:** o DBaaS da Magalu, onde mora a homologação (PBE, ADR-0021), só vai até a 17. Homologação na 17 com produção na 18 quebra exatamente o item que justifica a 18. As saídas coerentes são duas (P2): homologação sai do DBaaS da Magalu (`postgres:18` em VM ou container, ou RDS também), ou tudo fica na 17.12.

### As premissas do ADR-0013

| Premissa (2026-04-28) | Estado hoje | A verificar |
| :--- | :--- | :--- |
| Dump MySQL → MySQL do legado, sem conversão | O core-api tem schema próprio (136 migrations) e ETL de mapeamento (`scripts/etl/`), não dump. A branch `experimento/arrancar-etl` sugere que o ETL pode sair | P1: o ETL do legado continua no plano? Se sim, ele passa a ser cross-engine (MySQL legado → PG), que o ADR-0013 rejeitou como alternativa B |
| Codebit opera MySQL | A produção foi para a AWS (ADR-0021) | P1: quem opera o banco do core-api hoje? |
| Uma batalha de cada vez (ADR-0001) | O core-api está em release candidate (`1.0.0-rc.7`) | P1: momento — antes ou depois do 1.0 |

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| A. Ficar no MySQL 8.4 | Zero custo de migração; código e testes de lock já medidos no InnoDB | Collation `_ci` e deadlocks de gap lock continuam (0031/0032); ecossistema SQL-first mais pobre (ver abaixo) | em aberto |
| B. PostgreSQL 18.7 | Única versão com equivalente direto da busca `_ci`; RDS/Aurora; suporte até 2030/31 | Homologação precisa sair do DBaaS da Magalu; tradução de 97 upserts, errno, 136 migrations | **versão recomendada, se migrar** |
| C. PostgreSQL 17.12 | Paridade AWS + Magalu hoje; 12 minors | Busca `_ci` vira projeto à parte; sem `uuidv7`/`RETURNING OLD/NEW`; EOL 2029; um upgrade de major a mais | ❌ só se a Magalu for inegociável |
| D. PostgreSQL 19.0 | Mais features e suporte até 2031 | 4 dias de vida; sem oferta gerenciada | ❌ reavaliar quando entrar no RDS |

**Ligação com a pesquisa SQL-first (mesma sessão):** a recomendação para MySQL era Skeema (schema), dbmate (migrations) e Kysely + kysely-codegen (queries). **O Skeema é só MySQL.** No PostgreSQL, o leque de ferramentas que tipam SQL escrito à mão é maior e mais maduro (PgTyped, SafeQL, sqlc com TS, Atlas/sqldef para schema declarativo). Escolher o engine muda a resposta daquela pesquisa, então as duas decisões devem andar juntas.

---

## 5. Decisão final

**PENDENTE.** Respondido: **se** migrar, a versão é o **PostgreSQL 18.7**. Pendente: se migra (P1) e onde fica a homologação (P2).

---

## 6. Saídas (outputs concretos)

- [ ] **P1.** Decidir se as premissas do ADR-0013 ainda valem: o ETL do legado, quem opera o banco e o momento em relação ao 1.0. Responde se a migração acontece.
- [ ] **P2.** Decidir a homologação: sair do DBaaS da Magalu para ter PG18 nos dois ambientes, ou nivelar tudo na 17.12 e pagar a busca `_ci` com coluna normalizada.
- [ ] **P3.** Medir, num PostgreSQL 18 real, o outbox com `SKIP LOCKED` e os cenários de deadlock das inquiries 0031 e 0032 em `READ COMMITTED`, com citação da doc oficial sobre o modelo de locks.
- [ ] **P4.** Escolher a stack SQL-first junto com o engine (Skeema é só MySQL), antes de qualquer ADR.

---

## 7. Referências

- [ADR-0013](../architecture/adr/0013-mysql-database-engine.md) · [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) · [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) · [ADR-0026](../architecture/adr/0026-mysql-read-write-split-connection.md)
- [Inquiry-0008](./0008-postgres-driver-pg-vs-postgres.md) · [Inquiry-0010](./0010-mysql-engine-correction.md) · [Inquiry-0031](./0031-deadlock-na-reserva-atomica-de-remessa.md) · [Inquiry-0032](./0032-titulo-remetido-fronteira-do-agregado.md)
- PostgreSQL: [versionamento](https://www.postgresql.org/support/versioning/) · [18 released](https://www.postgresql.org/about/news/postgresql-18-released-3142/) · [19 released](https://postgresql.org/about/news/postgresql-19-released-3449) · [release notes 19.0](https://www.postgresql.org/docs/release/19.0/) · [pattern matching (18)](https://www.postgresql.org/docs/18/functions-matching.html) · [collation (18)](https://www.postgresql.org/docs/18/collation.html)
- AWS: [calendário RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html) · [calendário Aurora PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html)
- Magalu: [versões do DBaaS PostgreSQL](https://docs.magalu.cloud/docs/dbaas/postgres/security-monitoring/versions)
- Drizzle: [PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql) · [generated columns](https://orm.drizzle.team/docs/generated-columns)
