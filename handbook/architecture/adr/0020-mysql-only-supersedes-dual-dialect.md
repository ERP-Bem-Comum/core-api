[← Voltar para ADRs](./README.md)

# ADR-0020: MySQL como Único Dialeto de Persistência (supersedes ADR-0018)

- **Status:** Accepted
- **Date:** 2026-05-15
- **Deciders:** Arquiteto técnico + Gabriel Aderaldo
- **Supersedes:** [ADR-0018](./0018-persistence-dual-dialect-drizzle.md)
- **Relacionado:** [ADR-0013](./0013-mysql-database-engine.md) (engine MySQL), [ADR-0014](./0014-mysql-database-isolation.md) (isolamento por database), [ADR-0011](./0011-supply-chain-hardening.md) (supply chain), [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) (precedente Docker compose para serviço externo)

---

## Contexto

O [ADR-0018](./0018-persistence-dual-dialect-drizzle.md) estabeleceu **dual-dialect Drizzle** (MySQL produção + SQLite dev/CI) com lista normativa de features SQL permitidas/proibidas para garantir paridade entre dialetos. A justificativa foi explícita:

> *"A infra MySQL prometida pela Codebit ainda não está provisionada. Esperar quebra o ritmo de entrega; rodar Docker MySQL localmente cria fricção para devs (precisa subir container, manter migrations entre versões, lidar com volumes). Pior: subir MySQL local sem rede de testes que rodem contra ele invalida o ganho — vira apenas overhead operacional."* — ADR-0018 §"Contexto"

Em **2026-05-15** (este ADR), o [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) materializou Docker Compose como infraestrutura local oficial do projeto. O `compose.yaml` na raiz do `core-api` já habilita MinIO (S3 dev) e tem MySQL 8.4 como serviço opcional (profile `db`). A fricção do "Docker MySQL local" — que era a única razão técnica para manter SQLite — **deixou de existir**.

Com isso, a premissa central do ADR-0018 colapsa: SQLite virou complexidade sem ganho.

### Forças em jogo

| Força | Direção |
| :--- | :--- |
| Premissa do ADR-0018 (sem MySQL local) | **Não é mais verdade** — compose já provisiona MySQL local |
| Honestidade de paridade (ADR-0018 §"Forças") | Dual-dialect exige disciplina humana contínua para manter paridade — ônus eliminado por usar o mesmo engine em dev e prod |
| ADR-0013 (MySQL como engine) | Reforçado — agora único dialeto em todo o ciclo de vida |
| Custo cognitivo de schemas espelhados, mappers duplicados, lista de features proibidas | Eliminado |
| Binário nativo `better-sqlite3` exigindo toolchain C++ no Docker build | Eliminado — `mysql2` é JavaScript puro |
| Suite de contrato compartilhada (`*.contract.ts`/`*.suite.ts`) | Preservada — continua rodando contra InMemory + Drizzle/MySQL (em vez de InMemory + Drizzle/SQLite) |
| Adapter `InMemory` (driver `memory` da CLI) | Preservado — uso primário continua sendo demo da P.O. e testes unitários/use case |

### Realidade que viabiliza a decisão

- **MySQL 8.4 LTS via Docker Compose** é tão simples quanto SQLite para começar (`docker compose up -d mysql`), com paridade 100% com produção.
- O CI já habilitou service containers via ADR-0019 (pattern com MinIO) — adicionar MySQL service container é replicar o mesmo padrão.
- `mysql2` é o driver oficial Node.js para MySQL, Promise-based, JavaScript puro, sem binding nativo — build Docker fica mais simples (sai `python3`/`make`/`g++` do estágio `deps`).
- Drizzle ORM suporta MySQL nativamente com `drizzle-orm/mysql2`, mesma API conceitual que o de SQLite (sem retrabalho do código de aplicação).

---

## Decisão

Adotamos **MySQL 8.4 como único dialeto de persistência relacional** em todo o ciclo de vida do `core-api` (dev local, CI, staging, prod). SQLite é removido em todas as suas formas — schemas, drivers, migrations, dependências, testes específicos, drivers da CLI.

### Princípio condutor

> **1 port, 1 adapter Drizzle, 1 schema, 1 conjunto de mappers, 1 dialeto SQL.**

| Camada | Antes (ADR-0018) | Depois (este ADR) |
| :--- | :--- | :--- |
| Port (type `ContractRepository`) | 1 | 1 (sem mudança) |
| Implementação repo (Drizzle) | 1, parametrizado por dialeto | 1, atado a MySQL |
| Definição de schema | 2 (`schemas/sqlite.ts` + `schemas/mysql.ts`) | **1** (`schemas/mysql.ts`) |
| Mappers (domain ↔ row) | 2 (ramo por dialeto onde necessário) | **1** conjunto sem ramos |
| Lista normativa de features SQL | Necessária para paridade | **Reduzida** — só features proibidas com razão própria (ver §"Lista normativa atualizada") |
| Drivers da CLI | `memory` \| `sqlite` \| `mysql`-stub | `memory` \| `mysql` |

### Mapeamentos canônicos preservados (de ADR-0018)

Como agora só temos MySQL, o que era "mapeamento que precisava espelhar" vira simplesmente o tipo MySQL canônico, **sem mais discussão de paridade**:

| Tipo de domínio | MySQL | Justificativa preservada de ADR-0018 |
| :--- | :--- | :--- |
| `Money` (cents inteiro) | `BIGINT` | Suporta valores até 2^63-1; `Money.fromCents` já valida `<= MAX_SAFE_INTEGER` |
| `Date` (timestamp) | `DATETIME(3)` | Preserva milissegundos; UTC enforçado por `default-time-zone=+00:00` |
| `Period` (Fixed \| Indefinite) | 3 colunas (`period_kind VARCHAR(16) + CHECK`, `period_start DATETIME(3)`, `period_end DATETIME(3) NULLABLE`) | Decompor em 3 colunas em vez de JSON |
| `AmendmentKind` / `AmendmentStatus` | `VARCHAR(16) + CHECK` | Evita `ENUM` nativo (ver §"Lista normativa atualizada") |
| `ContractId` / `AmendmentId` | `VARCHAR(36)` PK | Legibilidade > 16 bytes de economia |
| `homologatedAmendmentIds` | Tabela de junção `ctr_contract_homologated_amendments` (PK composta `(contract_id, amendment_id)`) | Evita array; permite JOIN |

### Lista normativa atualizada (substitui §"Features permitidas/proibidas" de ADR-0018)

Com paridade fora da equação, algumas regras **deixam de existir** e outras **continuam por razão própria**. A lista a seguir é a vigente:

#### ✅ Permitidas (sem mudança vs ADR-0018)

- DML: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- Filtros: `WHERE`, `ORDER BY`, `LIMIT` / `OFFSET`
- Joins: `INNER JOIN`, `LEFT JOIN`
- Agregações simples: `COUNT(*)`, `SUM`, `MAX`, `MIN`, `AVG`
- Índices: `UNIQUE`, `INDEX` simples e compostos
- Foreign keys com `ON DELETE`/`ON UPDATE` apropriados
- Transações: `BEGIN` / `COMMIT` / `ROLLBACK` (via `db.transaction(...)` do Drizzle)
- CHECK constraints simples (`status IN ('Pending','Homologated')`)

#### 🆕 Agora permitidas (eram proibidas por paridade no ADR-0018)

| Feature | Por que estava proibida | Por que agora pode |
| :--- | :--- | :--- |
| `ON DUPLICATE KEY UPDATE` (sintaxe nativa MySQL) | Paridade com SQLite (`INSERT OR REPLACE`) | Sem SQLite, é a sintaxe canônica. Continuamos **preferindo** `drizzle.insert(...).onConflictDoUpdate(...)` como tradução portável, mas SQL bruto não é mais bloqueio. |
| `FULLTEXT INDEX` / `MATCH ... AGAINST` | Paridade — SQLite vanilla não tem | Liberado para uso quando busca textual em `objective`/`title`/`description` for requisito real. Abrir ADR específico ao introduzir. |
| Window functions (`ROW_NUMBER() OVER`, `LAG`, `LEAD`) | Paridade — SQLite só suporta desde 3.25 com flag | Liberado para queries analíticas/relatórios |
| CTEs recursivas (`WITH RECURSIVE`) | Paridade — semântica divergente | Liberado quando hierarquia/grafo for exigida (ex.: aditivo de aditivo, se evoluir) |

#### ❌ Continuam proibidas (razão própria, não mais paridade)

| Feature | Razão atualizada |
| :--- | :--- |
| Colunas JSON nativas e funções `JSON_EXTRACT`/`JSON_OBJECT`/`JSON_ARRAY` | Schema é tipo. JSON arbitrário em coluna virtualiza tipos voláteis, dificulta query, esconde dependências funcionais. Modelar como tabelas relacionais ou colunas escalares — Ramakrishnan §3.1. |
| Stored procedures / triggers / eventos agendados | **Lógica de negócio vive no código TS**, não no SGBD (regra invariante do `CLAUDE.md`). Stored proc é "mágica invisível, impossível de testar" — anti-padrão da skill `database-engineer` §10. |
| `ENUM` nativo do MySQL | `ALTER TABLE` para adicionar valor é caro em tabela grande; smart constructor + discriminated union no domínio já cobrem com type safety melhor. Usar `VARCHAR(N) + CHECK`. |
| Tipos espaciais (`POINT`, `POLYGON`, `GEOMETRY`) | Sem caso de uso. Abrir ADR ao surgir. |
| `AUTO_INCREMENT` em PK de tabelas de domínio | IDs gerados no domínio como UUID v4 (branded types via `ContractId.generate`, etc.). Auto-increment leak cardinalidade + acopla geração ao DB. Permanece OK para colunas operacionais não-domínio (ex.: `id` de log/outbox interno). |
| Isolation level explícito por transação (`SET TRANSACTION ISOLATION LEVEL`) | Default InnoDB (`REPEATABLE READ`) é adequado; código de domínio desenhado para tolerar. Override seria sinal de problema de modelagem, não de SGBD. |

### Topologia de execução

| Ambiente | Driver | Conexão |
| :--- | :--- | :--- |
| Testes unitários (domínio + use case) | Adapter `InMemory` | n/a |
| Testes de contrato — InMemory side | Adapter `InMemory` | n/a |
| Testes de contrato — Drizzle side | `mysql2` | Service container MySQL (CI) ou `docker compose up -d mysql` (local) |
| Testes E2E CLI — driver `memory` | InMemory | n/a (sem mudança) |
| Testes E2E CLI — driver `mysql` (novo) | `mysql2` | Service container MySQL |
| Dev manual via CLI (rápido) | InMemory | n/a |
| Dev manual via CLI (com persistência real) | `mysql2` | `docker compose up -d mysql` |
| Staging / Produção | `mysql2` | MySQL gerenciado (RDS / Cloud SQL) |

### Convenção de nomenclatura (decisão #2 de Gabriel)

Tabelas do módulo Contracts ganham **prefixo `ctr_`** dentro do database `core`:

- `contracts` → `ctr_contracts`
- `amendments` → `ctr_amendments`
- `contract_homologated_amendments` → `ctr_contract_homologated_amendments`

Justificativa: ADR-0014 isola por database, mas o prefixo deixa **explícito** qual módulo é dono mesmo em listagens (`SHOW TABLES FROM core`). Quando módulos futuros chegarem (`fin_*` para Financeiro), a convenção já está enraizada.

### Database (decisão #1 de Gabriel)

Apenas o database `core` é provisionado por este ADR. `legacy` (do dump da prod antiga) fica para ticket futuro quando a integração legacy entrar em escopo.

---

## Consequências

### Positivas

- **Paridade 100% dev↔prod.** Mesmo engine, mesmo dialect, mesmo comportamento de tipo/locking/isolation. Bug que passa em dev quebra do mesmo jeito em prod (e vice-versa).
- **Schema único.** Sem manter `sqlite.ts` + `mysql.ts` espelhados — uma fonte de verdade.
- **Mappers sem ramos.** `money.mapper.ts`/`date.mapper.ts`/`period.mapper.ts` deixam de ter condicionais por dialeto.
- **Build Docker mais leve.** Estágio `deps` perde `python3 + make + g++` (~150MB). `mysql2` é JS puro.
- **Lista normativa menor.** 4 features liberadas (`ON DUPLICATE KEY UPDATE`, `FULLTEXT`, window functions, CTEs recursivas). 6 ainda proibidas por razão própria.
- **Disciplina de paridade eliminada.** Não precisa mais de revisão humana garantindo que features novas funcionem em ambos dialetos.
- **`mysql2` tem `connection pool` nativo.** Algo que `better-sqlite3` não precisa (single-process), mas que é padrão em servidor real.

### Negativas

- **Testes integration ficam mais lentos.** SQLite `:memory:` rodava em microssegundos por teste; MySQL container roda em ms+startup. CI compensa via service container shared.
- **Dev sem container fica restrito a InMemory.** Antes podia usar SQLite arquivo `.db` sem subir nada. Agora: ou InMemory (memória) ou `docker compose up -d mysql`.
- **`better-sqlite3` desinstalado** — qualquer ticket histórico que importava esse pacote (não há, mas auditar) quebra.
- **Migration única para MySQL** precisa ser regenerada do zero — não há `migration` SQLite reaproveitável.
- **Suite de regressão SQLite-específica** (`drizzle-sqlite.test.ts`, `contracts.cli.sqlite.test.ts`) descartada.

### Neutras

- O port `ContractRepository`/`AmendmentRepository`/`EventBus` **não muda**. Domínio e application ficam intactos.
- Adapter `InMemory` segue inalterado.
- O ADR-0019 (S3+MinIO) é independente e não é afetado.
- O ADR-0015 (Outbox MySQL) é reforçado — outbox sempre foi pensado para MySQL, agora consistente com todo o stack.

---

## Alternativas consideradas

### A. Manter dual-dialect — **Rejeitada**

**Por quê:** a única vantagem (dev sem container) foi anulada pelo compose. O custo (manutenção de 2 schemas, mappers ramificados, lista de paridade, disciplina humana, toolchain C++ no build) permanece. Custo > benefício após ADR-0019.

### B. Adicionar PostgreSQL como terceiro dialeto — **Rejeitada**

**Por quê:** ADR-0013 fixou MySQL. Introduzir Postgres seria nova decisão arquitetural pesada, não está justificada por nenhum requisito atual.

### C. Migrar para PGlite (Postgres embedded) — **Rejeitada**

**Por quê:** mesmo problema de B + PGlite é experimental + ADR-0013 manda MySQL.

### D. Manter SQLite como modo "ultrarrápido" para alguns testes — **Rejeitada**

**Por quê:** parcialidade pior que escolher um lado. Mantém o ônus de paridade (alguns testes em SQLite, alguns em MySQL — surface de bug entre dialetos continua existindo) sem o benefício pleno do dual-dialect.

### E. **MySQL único — ESCOLHIDA**

Coerente com:
- ADR-0013 (engine MySQL)
- ADR-0014 (isolamento por database)
- ADR-0015 (outbox em MySQL)
- ADR-0019 (precedente de Docker compose para serviço externo de dev)
- Realidade operacional atual (compose disponível, sem fricção)

---

## Quando re-avaliar

Esta decisão deve ser revisitada (gerando novo ADR que `supersedes` este) se:

- **Docker como dependência de dev** se tornar inviável para o time (improvável, mas ex.: política corporativa que proíba). Fallback: voltar para dual-dialect ou adotar PGlite/SQLite WASM.
- **CI** começar a ter custo proibitivo de tempo por subir MySQL service container em cada job. Mitigação intermediária: testes integration em job dedicado, não em todo PR.
- **Necessidade de embedded DB** aparecer (ex.: distribuir o CLI como standalone para uso offline pela P.O.). Cenário hoje inexistente.
- **MySQL deixar de ser viável** por questão de licença, custo, ou tecnologia (cenário muito improvável para um ERP em 2026-2032).

---

## Conformidade e auditoria

| Mecanismo | Como aplica este ADR |
| :--- | :--- |
| Code review obrigatório | Toda PR que adicione SQL fora da lista permitida exige novo ADR justificando. |
| Suite de contrato compartilhada | `ContractRepositorySuite(makeRepo)` continua rodando contra InMemory **e** Drizzle/MySQL (substitui o "SQLite + MySQL futuro" do ADR-0018). |
| Lint customizada (opcional, futura) | Bloquear uso de `mode: 'json'` no Drizzle, stored procs, ENUM nativo, AUTO_INCREMENT em PK de domínio. |
| Migrations versionadas | `pnpm db:generate:mysql` único — sem necessidade de `db:generate:sqlite`. |
| Property-based round-trip | `domain → row → domain` apenas contra MySQL — sem necessidade de duplicar para SQLite. |
| Health check no compose | `mysql -u $MYSQL_USER -p$MYSQL_PASSWORD -e "SELECT 1"` (não apenas `mysqladmin ping`) — valida conexão real, não só processo vivo. |

---

## Tickets gerados por este ADR

Esta decisão habilita (e exige) os seguintes tickets, em ordem:

1. **CTR-DB-COMPOSE-MYSQL** — `compose.yaml` com my.cnf customizado, init scripts (`/docker-entrypoint-initdb.d/`), healthcheck robusto, MySQL passa de profile `db` para serviço default.
2. **CTR-DB-SCHEMA-MYSQL-CTR-PREFIX** — `schemas/mysql.ts` com prefixo `ctr_*`, charset/collation explícito por tabela, índices `amendments(contract_id)` (F-H2 do DB audit) e `contracts(status)`/`(signed_at)` (F-M2), CHECKs compostos (F-L1, F-L2).
3. **CTR-DB-MIGRATION-MYSQL** — `drizzle.config.ts` apontando para MySQL + script `db:generate:mysql` + primeira migration completa.
4. **CTR-DB-DRIVER-MYSQL** — Wirar `mysql2` em `cli/drivers/mysql.ts` (hoje stub), resolver F-C1 (`db.transaction` async) e F-C2 (FK violation no error union).
5. **CTR-CLEANUP-SQLITE** — Remover schema SQLite, driver SQLite, migration SQLite, dep `better-sqlite3`, `@types/better-sqlite3`, `pnpm.onlyBuiltDependencies`, testes específicos SQLite, ajustar `cli/parse-driver-flags.ts` para aceitar apenas `memory|mysql`.
6. **CTR-DOCKERFILE-MYSQL** — Dockerfile sem toolchain C++ (`python3 make g++` saem do estágio `deps`); `libc6-compat` continua necessário para libs nativas restantes; revalidar tamanho final da imagem.
7. **CTR-CLI-MYSQL-SMOKE** — `--driver mysql --url mysql://...` + suite E2E que sobe MySQL via compose e exercita o ciclo `criar-contrato` → `criar-aditivo` → `anexar-documento` → `homologar-aditivo`.

### Skills/docs que precisam touch-up depois

Os seguintes arquivos referenciam ADR-0018 nas seções específicas do projeto adicionadas em 2026-05-15 e precisam ser ajustados (ticket separado de doc, baixa prioridade):

- `CLAUDE.md` na raiz — §"Hierarquia de regras"
- `.claude/skills/ports-and-adapters/SKILL.md`
- `.claude/skills/pipeline-maestro/SKILL.md`
- `.claude/skills/ts-quality-checker/SKILL.md`
- `.claude/skills/application-cli-builder/SKILL.md`
- `.claude/skills/modular-monolith/SKILL.md`
- `.claude/skills/database-tutor/SKILL.md`
- `.claude/skills/database-theorist/SKILL.md` (debate dual-dialect inteiro perde sentido — substituir por "MySQL único e o porquê")
- `.claude/skills/database-engineer/SKILL.md`

Vira **CTR-DOCS-UPDATE-FOR-ADR-0020** depois dos tickets de implementação terminarem.

---

## Referências

- [ADR-0018](./0018-persistence-dual-dialect-drizzle.md) — Superseded por este; permanece como evidência histórica.
- [ADR-0013](./0013-mysql-database-engine.md) — Decisão que reforça MySQL como engine.
- [ADR-0014](./0014-mysql-database-isolation.md) — Isolamento por database, charset utf8mb4, regra de ouro.
- [ADR-0015](./0015-mysql-outbox-pattern.md) — Outbox em MySQL.
- [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) — Precedente arquitetural de compose Docker para serviço externo.
- [ADR-0011](./0011-supply-chain-hardening.md) — Política de dependências (impacta a remoção de `better-sqlite3`).
- [`../06-persistence-strategy.md`](../06-persistence-strategy.md) — Documento operacional que precisa ser atualizado em ticket `CTR-DOCS-UPDATE-FOR-ADR-0020`.
- MySQL 8.4 Refman §"Server SQL Modes" — `STRICT_TRANS_TABLES`, `NO_ZERO_DATE`, `ERROR_FOR_DIVISION_BY_ZERO`.
- MySQL 8.4 Refman §"InnoDB File-Per-Table Tablespaces" — `innodb_file_per_table=ON`.
- MySQL 8.4 Refman §"Replication Formats" — `binlog_format=ROW`, GTID.
