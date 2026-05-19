[← Voltar para ADRs](./README.md)

# ADR-0018: Persistência Dual-Dialect — Drizzle com MySQL (produção) e SQLite (dev/CI)

- **Status:** Superseded by [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) em 2026-05-15
- **Date:** 2026-05-14
- **Deciders:** Arquiteto técnico + Gabriel Aderaldo
- **Relacionado:** [ADR-0013](./0013-mysql-database-engine.md) (engine de produção), [ADR-0006](./0006-modular-monolith-core-api.md) (modular monolith), [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) (runtime)

> ⚠️ **AVISO:** A premissa central deste ADR — *"a infra MySQL prometida pela Codebit ainda não está provisionada"* — deixou de ser verdade em **2026-05-15** quando o [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) materializou Docker Compose como infraestrutura local oficial do projeto, eliminando a fricção que justificava o SQLite. O [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) adota MySQL como único dialeto em todo o ciclo de vida. O conteúdo abaixo permanece como evidência histórica do raciocínio que era válido em 2026-05-14.

---

## Contexto

O [ADR-0013](./0013-mysql-database-engine.md) estabeleceu **MySQL 8** como engine único de banco de dados para legado e `core-api`, com `mysql2 + drizzle-orm/mysql2 + drizzle-kit`. Essa decisão **continua válida e não é alterada por este ADR**.

No entanto, hoje (2026-05-14) o módulo `contracts` do `core-api` está em fase de implementação inicial:

- Domínio (`Contract`, `Amendment`, `Money`, `Period`, `ContractId`) está pronto e testado (243 testes verdes).
- Use cases (`createContract`, `createAmendment`, `homologateAmendment`, `attachSignedDocument`, `listContracts`, `getContract`) estão implementados.
- CLI MVP entregue, validada via suite E2E (16 cenários).
- **Repositórios são InMemory + state file JSON** — sem banco real, sem queries, sem índices.

A infra MySQL prometida pela Codebit (operadora) **ainda não está provisionada**. Esperar quebra o ritmo de entrega; rodar Docker MySQL localmente cria fricção para devs (precisa subir container, manter migrations entre versões, lidar com volumes). Pior: subir MySQL local **sem rede de testes que rodem contra ele** invalida o ganho — vira apenas overhead operacional.

A pergunta arquitetural: **como adicionar persistência real sem bloquear no provisionamento e sem violar o ADR-0013?**

### Forças em jogo

| Força | Direção |
| :--- | :--- |
| Honrar ADR-0013 (MySQL como produção) | Engine alvo é MySQL — toda decisão precisa preservar o caminho. |
| Não bloquear desenvolvimento na infra | Precisamos de algo que rode local hoje, sem fornecedor externo. |
| Testes rápidos e reprodutíveis | CI roda em segundos; subir container MySQL para cada job custa minutos. |
| Honestidade de paridade | Se o ambiente dev mente, bugs aparecem só em produção — pior dos mundos. |
| Manter `ContractRepository` (port) intocado | Já estabilizado, não pode ser comprometido por escolha de adapter. |

### Realidade que viabiliza a decisão

- **Drizzle ORM** suporta **MySQL** (`drizzle-orm/mysql2`) e **SQLite** (`drizzle-orm/better-sqlite3`) como dialetos primários, com **API de queries praticamente idêntica** (where, select, joins, transactions).
- A diferença real entre dialetos está **na definição de schema** (tipos de coluna) e em **algumas features SQL** (JSON, ON DUPLICATE KEY UPDATE, FULLTEXT, etc.).
- A arquitetura ports & adapters do `core-api` ([ADR-0006](./0006-modular-monolith-core-api.md)) já abstrai o domínio do mecanismo de persistência: o domínio só conversa com `type ContractRepository = Readonly<{ findById, findBySequentialNumber, list, save }>`.

---

## Decisão

Adotamos uma **estratégia dual-dialect via Drizzle**: **MySQL** continua sendo o engine de produção (ADR-0013); **SQLite** é adicionado **exclusivamente como ambiente de desenvolvimento, testes e CI** — com paridade controlada por disciplina explícita.

### Princípio condutor

> **1 port, 1 repositório, 2 schemas espelhados, 2 conjuntos de mappers, 1 lista canônica de features permitidas.**

| Camada | Quantidade | Por quê |
| :--- | :---: | :--- |
| Port (type `ContractRepository`) | 1 | Domínio não muda. |
| Implementação do repositório (Drizzle) | 1 | Lógica de query é portável; aceita schema + db como argumentos. |
| Definição de schema | 2 | `sqliteTable` e `mysqlTable` têm tipos diferentes; não dá pra unificar sem mágica frágil. |
| Mappers (domain ↔ row) | 2 | Money/Date têm representação diferente por dialeto. |
| Lista de features permitidas | 1 | Disciplina precede mágica. |

### Mapeamentos canônicos

Toda divergência entre dialetos é confinada nos mappers. Valores de domínio têm representação **canônica e auditável** em cada dialeto:

| Tipo de domínio | SQLite | MySQL | Justificativa |
| :--- | :--- | :--- | :--- |
| `Money` (cents inteiro) | `integer` | `bigint` | SQLite suporta inteiros até 2^63-1 nativamente; MySQL precisa de `bigint` para não estourar com valores acima de `int.MAX`. `Money.fromCents` já valida `<= MAX_SAFE_INTEGER`. |
| `Date` (timestamp) | `integer` (unix-ms) | `datetime(3)` | SQLite não tem tipo nativo; unix-ms é portável, ordenável e preserva milissegundos. `datetime(3)` no MySQL preserva a mesma precisão. |
| `Period` (Fixed \| Indefinite) | 3 colunas: `period_kind` (`text`), `period_start` (`integer`), `period_end` (`integer` nullable) | 3 colunas: `period_kind` (`varchar(16)`), `period_start` (`datetime(3)`), `period_end` (`datetime(3)` nullable) | Decompor em 3 colunas evita JSON (proibido pela lista abaixo). Reidratação reusa `Period.create` / `Period.createIndefinite`. |
| `AmendmentKind` / `AmendmentStatus` (string literal union) | `text` + CHECK constraint | `varchar(16)` + CHECK constraint | Evita `ENUM` nativo (MySQL-only). Validação em runtime via smart constructors do domínio. |
| `ContractId` / `AmendmentId` (UUID v4) | `text` PK | `varchar(36)` PK | Sem `BINARY(16)` — legibilidade > 16 bytes de economia. |
| `homologatedAmendmentIds` (array) | Tabela de junção `contract_homologated_amendments` | Mesma | Evita JSON array. Permite `JOIN` natural e cardinality real. |

### Lista de features SQL permitidas e proibidas

Esta lista é **normativa**. Toda PR que adicione SQL fora deste contrato exige novo ADR.

#### ✅ Permitidas (paridade garantida)

- DML: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- Filtros: `WHERE`, `ORDER BY`, `LIMIT` / `OFFSET`
- Joins: `INNER JOIN`, `LEFT JOIN`
- Agregações simples: `COUNT(*)`, `SUM`, `MAX`, `MIN`, `AVG`
- Índices: `UNIQUE`, `INDEX` simples e compostos
- Foreign keys (no SQLite, precedidas de `PRAGMA foreign_keys = ON` no driver)
- Transações: `BEGIN` / `COMMIT` / `ROLLBACK` (via `db.transaction(...)` do Drizzle)
- CHECK constraints simples (`status IN ('Pending','Homologated')`)

#### ❌ Proibidas (incompatíveis, semantica divergente ou portabilidade frágil)

- Colunas JSON nativas e funções `JSON_EXTRACT`, `JSON_OBJECT`, `JSON_ARRAY` — modelar como tabelas relacionais ou colunas separadas.
- **Escrita SQL bruta** de `ON DUPLICATE KEY UPDATE` (MySQL) ou `INSERT OR REPLACE` (SQLite) — semântica divergente entre dialetos quando escritos à mão. Para upsert, usar:
  - **`select-then-decide`** (recomendado para casos com lógica condicional), OU
  - **`drizzle.insert(...).onConflictDoUpdate(...)`** — Drizzle traduz para a sintaxe nativa de cada dialeto (`ON CONFLICT DO UPDATE` no SQLite, `ON DUPLICATE KEY UPDATE` no MySQL). A abstração do ORM conta como "tradução portável" para os fins desta ADR — o que está proibido é escrever esse SQL à mão. **Validação obrigatória**: o teste de contrato `save é idempotente (upsert)` (`contract-repository.suite.ts` e `amendment-repository.suite.ts`) precisa passar em ambos os dialetos como sentinela de paridade.
- `FULLTEXT INDEX` / `MATCH ... AGAINST` — sem equivalente em SQLite vanilla.
- Stored procedures, triggers, eventos agendados.
- Window functions (`ROW_NUMBER() OVER`, `LAG`, `LEAD`) — emular em código TS.
- CTEs recursivas — emular com loop no use case.
- `ENUM` nativo do MySQL — usar `varchar` + CHECK.
- Tipos espaciais (`POINT`, `POLYGON`, `GEOMETRY`).
- `AUTO_INCREMENT` / `INTEGER PRIMARY KEY AUTOINCREMENT` — IDs são UUIDs gerados no domínio.
- Isolation level explícito por transação (`SET TRANSACTION ISOLATION LEVEL`) — usar o default `REPEATABLE READ` (MySQL) / `SERIALIZABLE` (SQLite) e desenhar o domínio para tolerar.

### Topologia de execução

| Ambiente | Driver | Onde |
| :--- | :--- | :--- |
| Testes unitários e de contrato | `better-sqlite3` em `:memory:` | CI + dev local |
| Testes E2E da CLI (opt-in) | `better-sqlite3` em arquivo `.db` temporário | CI + dev local |
| Desenvolvimento manual da CLI | `better-sqlite3` em arquivo `./contracts.db` (opt-in via `--driver sqlite`) | Dev local |
| Staging / produção | `mysql2` apontando para MySQL 8 gerenciado | Cloud SQL / RDS |

A CLI segue **backward compatible**: `--driver memory` (default) preserva o comportamento atual com state file JSON; `--driver sqlite` ativa o adapter Drizzle/SQLite; `--driver mysql` será habilitado em ADR/ticket posterior quando a infra existir.

---

## Consequências

### Positivas

- **Desbloqueio imediato.** Persistência real (com índices, FK, transações) sem esperar provisionamento de MySQL.
- **Testes rápidos.** SQLite `:memory:` roda em microssegundos por teste; suite cresce sem custo de container.
- **`findBySequentialNumber` deixa de ser linear** — passa a usar índice `UNIQUE`.
- **Mesmo código de query** roda contra dois engines — quando MySQL subir, é só trocar o driver.
- **Lista normativa de features** previne dívida técnica disfarçada (alguém usando JSON_EXTRACT e quebrando paridade silenciosamente).
- **Exercita o port** com implementação real, validando que a abstração não vazou MySQL no domínio.

### Negativas

- **Paridade não é automática** — depende de disciplina. Uma feature MySQL-only entrar sem revisão deste ADR quebra a estratégia.
- **Dois schemas para manter.** Adicionar uma coluna exige editar `schemas/sqlite.ts` E `schemas/mysql.ts`. Mitigado por: review obrigatório + (opcional) lint rule que detecta drift.
- **Mappers duplicados** (`money.mapper.ts` precisa de ramos por dialeto). Aceitável — código é trivial e isolado.
- **`better-sqlite3` é binário nativo.** Build precisa de toolchain C++. Mitigação: `npm rebuild better-sqlite3` no Dockerfile + documentar no handbook de onboarding.
- **Recursos avançados do MySQL ficam fora de uso** — `JSON_TABLE`, window functions, full-text. Se algum requisito de domínio exigir, abrimos novo ADR para abrir exceção ou descartar SQLite.

### Neutras

- O estilo de código (Drizzle, Result, ports/adapters) é **idêntico** entre os dois dialetos.
- A escolha não tem impacto em frontend, BFF, integrações externas ou autenticação.
- Não altera a estratégia de outbox ([ADR-0015](./0015-mysql-outbox-pattern.md)) — outbox vive em MySQL quando a infra subir; SQLite não exercita outbox no dev (event bus continua in-memory).

---

## Alternativas Consideradas

### A. Esperar MySQL provisionado

**Rejeitada porque:**

- Cronograma de infra é externo e fora do nosso controle.
- Bloqueia entrega do módulo `contracts` por tempo indefinido.
- Continuar com InMemory + state file JSON significa que `findBySequentialNumber` permanece linear e `Defeito #5` (unicidade) só foi testado contra implementação trivial.

### B. Docker MySQL local

**Rejeitada porque:**

- Acrescenta dependência operacional (container precisa estar de pé) e fricção (volumes, portas, migrations entre versões da imagem).
- CI fica mais lento (subir container por job custa 10–30s extras).
- Não elimina o problema de "testes batem no banco" — sem fixtures decentes, testes ficam frágeis.
- O ganho de "paridade total com produção" só vale se houver testes que **exercitam features MySQL-only** — e nossa lista normativa proíbe essas features justamente para manter SQLite no jogo.

### C. PGlite (PostgreSQL embedded) ou DuckDB

**Rejeitada porque:**

- Engine de produção é MySQL ([ADR-0013](./0013-mysql-database-engine.md)). Adotar engine embedded de outro dialeto introduz uma terceira família de comportamentos para conferir.
- Drizzle suporta os três, mas a discrepância semantica (tipos, NULL handling, ordenação) entre SQLite e MySQL já é menor que entre PostgreSQL e MySQL.

### D. ORM de mais alto nível (TypeORM, Prisma) com migrations multi-dialect "mágicas"

**Rejeitada porque:**

- Tanto TypeORM quanto Prisma escondem dialeto sob abstração, mas falham em casos sutis (tipos, índices parciais, ordering de joins) — quando falham, debug é caro.
- Drizzle expõe SQL explicitamente, o que **encoraja** a usar a lista normativa em vez de esconder violações.
- ADR-0013 já decidiu Drizzle como o ORM.

### E. Implementação dual-dialect — **ESCOLHIDA**

Único caminho que respeita simultaneamente:

- ADR-0013 (MySQL é produção, sem deriva).
- ADR-0006 (modular monolith — adapter trocável sem tocar o domínio).
- Realidade operacional (infra MySQL ainda não pronta).
- Pragmatismo de CI (testes rápidos sem container).
- Honestidade técnica (paridade é responsabilidade humana, não mágica do ORM).

---

## Quando Re-avaliar

Esta decisão deve ser revisitada (gerando novo ADR que `supersedes` este) se:

- **MySQL gerenciado** for provisionado e estabilizado por 3+ meses **e** o esforço de manter SQLite ultrapassar o ganho em velocidade de testes.
- Surgir requisito de domínio que **exija** feature da lista proibida (JSON queries, full-text, window functions). Nesse caso, ou removemos SQLite ou particionamos: testes integration → MySQL real, testes unit → InMemory.
- Conflitos de paridade aparecerem em produção (bug que passa no SQLite mas quebra no MySQL) com frequência > 1 por trimestre.
- Drizzle introduzir camada de compatibilidade que torne a lista normativa obsoleta.

---

## Conformidade e auditoria

| Mecanismo | Como aplica este ADR |
| :--- | :--- |
| Code review obrigatório | Toda PR que toca `adapters/persistence/` precisa de revisão arquitetural. |
| Suite de contrato compartilhada | `ContractRepositorySuite(makeRepo)` roda os mesmos cenários contra InMemory e Drizzle/SQLite — qualquer divergência semântica falha o build. |
| (Opcional) ESLint rule customizada | Detecta uso de `mode: 'json'` no Drizzle, `sql\`ON DUPLICATE KEY UPDATE\``, `MATCH AGAINST`, etc. Ticket separado se valer. |
| Migrations geradas por dialeto | `pnpm db:generate:sqlite` e `pnpm db:generate:mysql` — diff entre as duas exposta em CI. |
| Property-based round-trip tests | `domain → row → domain` para cada agregado, em ambos os dialetos (quando MySQL subir). |

---

## Referências

- [ADR-0013](./0013-mysql-database-engine.md) — Engine de produção é MySQL 8.
- [ADR-0014](./0014-mysql-database-isolation.md) — Isolamento por database em MySQL.
- [ADR-0015](./0015-mysql-outbox-pattern.md) — Outbox em MySQL (não exercitado em SQLite).
- [ADR-0006](./0006-modular-monolith-core-api.md) — Modular monolith e ports & adapters.
- [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) — Runtime e versão do TS.
- Ticket [CTR-ADAPTER-DRIZZLE-DUAL](../../../ERP-CONTRACTS/.claude/.pipeline/CTR-ADAPTER-DRIZZLE-DUAL/000-request.md) — implementação que materializa este ADR.
- [Drizzle ORM docs — Dialects](https://orm.drizzle.team/docs/get-started-sqlite) — referência técnica de suporte multi-dialect.
