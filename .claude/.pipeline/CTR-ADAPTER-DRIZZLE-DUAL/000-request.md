# Ticket CTR-ADAPTER-DRIZZLE-DUAL: Adapter de persistência Drizzle com dialeto duplo (SQLite + MySQL)

> Documentação PT, identificadores EN (regra invariante).

## Contexto

Hoje o projeto persiste estado via:

- **InMemory repositories** (`adapters/contract-repository.in-memory.ts`, `amendment-repository.in-memory.ts`) — fonte da verdade para testes unitários.
- **CLI state file JSON** (`cli/state.ts`) — snapshot/restore manual no fim de cada comando.

Funciona para CLI de demonstração e testes, mas:

1. `findBySequentialNumber` faz busca linear (`O(n)`) — não escala.
2. State file JSON cresce sem paginação; toda gravação reescreve o arquivo inteiro.
3. Não exercitamos transações, índices, integridade referencial.
4. Quando subir infra MySQL, vamos precisar adaptar igual — melhor já entregar o caminho.

Este ticket entrega um **único adapter de persistência genérico (Drizzle)** que opera contra **dois dialetos** — SQLite (dev/CI) e MySQL (produção) — preservando a interface dos ports `ContractRepository` e `AmendmentRepository`.

## Princípio condutor

> **1 port, 1 repositório, 2 schemas espelhados, 2 conjuntos de mappers.**

O domínio nunca sabe qual SQL roda por baixo. Os testes podem rodar contra `:memory:` SQLite (rápido) e a CLI/API contra arquivo SQLite local hoje, MySQL amanhã.

## Escopo

```
src/modules/contracts/adapters/persistence/
├── drivers/
│   ├── sqlite-driver.ts            # better-sqlite3 + drizzle (síncrono)
│   └── mysql-driver.ts             # mysql2/promise + drizzle (async)  [stub no MVP]
├── schemas/
│   ├── sqlite.ts                   # sqliteTable: contracts, amendments, etc.
│   ├── mysql.ts                    # mysqlTable: mesmos nomes/colunas, tipos do dialeto
│   └── shared-columns.ts           # Tipo `ContractRow`, `AmendmentRow` agnósticos
├── mappers/
│   ├── contract.mapper.ts          # Contract domain ↔ ContractRow
│   ├── amendment.mapper.ts         # Amendment domain ↔ AmendmentRow
│   ├── money.mapper.ts             # Money cents ↔ integer (sqlite) / bigint (mysql)
│   ├── date.mapper.ts              # Date ↔ integer unix-ms (sqlite) / datetime (mysql)
│   └── period.mapper.ts            # Period (Fixed | Indefinite) ↔ 3 colunas (kind, start, end nullable)
├── repos/
│   ├── contract-repository.drizzle.ts   # implements ContractRepository
│   └── amendment-repository.drizzle.ts  # implements AmendmentRepository
└── migrations/
    ├── sqlite/                     # geradas por drizzle-kit
    └── mysql/                      # geradas por drizzle-kit (futuro)

handbook/decisions/
└── ADR-CTR-PERSISTENCE-DUAL-DIALECT.md   # Lista de features permitidas/proibidas

tests/modules/contracts/adapters/persistence/
└── drizzle-contracts.test.ts       # Suite de contrato — roda contra SQLite :memory:
```

## Decisões de design

| # | Decisão | Justificativa |
| :- | :--- | :--- |
| D1 | **SQLite via `better-sqlite3`** (síncrono) | Sem await em testes, sem worker threads. Bate com o estilo do `state.ts` atual. |
| D2 | **MySQL via `mysql2/promise`** | Driver consolidado, integra direto com Drizzle. |
| D3 | **Dois schemas separados, NÃO genérico-com-overloads** | Tentar gerar uma única definição abstrata via TS leva a tipos infernais. Espelhar dois arquivos com mesmos nomes é mais legível e auditável. |
| D4 | **Repositório único parametrizado pelo dialeto** | `createContractRepository({ db, tables })` recebe o handle do Drizzle e o schema. Uma implementação de `findById`/`save`/etc. serve ambos. |
| D5 | **Money em centavos como `integer` (SQLite) / `bigint` (MySQL)** | SQLite suporta inteiros até 2^63-1 nativamente; MySQL precisa de `bigint`. `Money.fromCents` já garante `<= MAX_SAFE_INTEGER`. |
| D6 | **Date como `integer` unix-ms (SQLite) / `datetime(3)` (MySQL)** | SQLite não tem tipo nativo; unix-ms é portável e ordenável. MySQL `datetime(3)` preserva milissegundos. |
| D7 | **Period decomposto em 3 colunas**: `period_kind` (`'Fixed' \| 'Indefinite'`), `period_start`, `period_end` (nullable) | Evita JSON em colunas (proibido pela ADR). Reidratação reusa `Period.create` / `Period.createIndefinite`. |
| D8 | **`homologatedAmendmentIds` em tabela de junção** (`contract_homologated_amendments`) | Evita JSON array. Permite query `JOIN` natural. |
| D9 | **Migrations via `drizzle-kit`**, geradas separadas por dialeto | Schemas têm tipos diferentes; migrations precisam ser por dialeto. Comando: `pnpm db:migrate:sqlite` e `db:migrate:mysql`. |
| D10 | **CLI ganha flag `--driver`** (`memory` \| `sqlite` \| `mysql`) com default `memory` | Backward compatible. Quando passa `sqlite`, lê `--db <path>` (default `./contracts.db`). |
| D11 | **ADR documenta lista de features SQL permitidas/proibidas** | Disciplina > mágica. Sem JSON_EXTRACT, sem ON DUPLICATE KEY UPDATE, sem FULLTEXT, sem CTEs recursivas, sem window functions. |
| D12 | **Testes de contrato rodam contra SQLite `:memory:`** | Reuso da suite atual + spawn de DB efêmero. MySQL fica para CI quando o container estiver disponível. |

## Lista preliminar de features permitidas/proibidas (ADR)

### ✅ Permitidas (comuns aos dois dialetos)
- `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- `WHERE`, `ORDER BY`, `LIMIT`/`OFFSET`
- `INNER JOIN`, `LEFT JOIN`
- Índices simples e compostos (`UNIQUE`, `INDEX`)
- Foreign keys (com `PRAGMA foreign_keys = ON` no SQLite)
- Transações (`BEGIN`/`COMMIT`/`ROLLBACK`)
- `COUNT(*)`, `SUM`, `MAX`, `MIN`

### ❌ Proibidas (incompatíveis ou semantica divergente)
- `JSON_EXTRACT` / colunas JSON nativas
- `ON DUPLICATE KEY UPDATE` (MySQL-only) / `INSERT OR REPLACE` (SQLite-only)
- `FULLTEXT INDEX` / `MATCH ... AGAINST`
- Stored procedures / triggers
- Window functions (`ROW_NUMBER() OVER`)
- CTEs recursivas
- `ENUM` nativo (usar `text`/`varchar` + CHECK ou validação domain-side)
- Tipos espaciais (`POINT`, `POLYGON`)

## Critérios de aceite

### Funcionalidade
- [ ] `pnpm db:generate:sqlite` gera migrations a partir do schema SQLite.
- [ ] `pnpm db:migrate:sqlite --db <path>` aplica migrations num arquivo SQLite.
- [ ] CLI com `--driver sqlite --db <path>` cria/lê contratos de um arquivo `.db`.
- [ ] `findBySequentialNumber` usa índice `UNIQUE` no schema (não busca linear).
- [ ] Mappers cobrem todos os campos de `Contract`, `Amendment`, `AmendmentKind`, `AmendmentStatus`, `Period`, `Money`.

### Compatibilidade
- [ ] Os mesmos testes de contrato do `ContractRepository` rodam contra InMemory **e** Drizzle/SQLite.
- [ ] Todos os 243 testes atuais continuam verdes.
- [ ] Os 16 testes E2E da CLI passam com `--driver sqlite` (suite separada, opt-in).

### Documentação
- [ ] `ADR-CTR-PERSISTENCE-DUAL-DIALECT.md` finalizado com a lista permitida/proibida.
- [ ] `handbook/architecture/persistence-strategy.md` explica os mapeamentos Money/Date/Period.
- [ ] README atualizado com seção "Drivers de persistência".

### Qualidade
- [ ] 4 gates verdes: format, lint, typecheck, test.
- [ ] Lint customizada bloqueia uso de features proibidas (ex.: regra que veta `mode: 'json'` no schema). _Opcional — pode virar ticket separado._

## Plano de waves

| Wave | Entregas |
| :--- | :--- |
| **W0 RED** | Suite de contrato `ContractRepositorySuite` rodando contra adapter Drizzle/SQLite (todos os testes vermelhos por falta do adapter). |
| **W1 GREEN** | Driver SQLite + schema + mappers + repos + migrations geradas. Suite verde. |
| **W2 REVIEW** | Code review focado em: (a) zero throw fora do boundary, (b) Result respeitado, (c) mapeamento bidirecional sem perda. |
| **W3 QUALITY** | 4 gates + ADR + handbook. |

> Schema MySQL e driver MySQL ficam **stubados** no MVP (definições de tabela existem, código de conexão fica como `throw new Error('mysql driver not yet wired')`). Quando o container subir, abrimos `CTR-ADAPTER-DRIZZLE-MYSQL-WIRE`.

## Fora de escopo

- **Conexão MySQL real e migrations rodando** — depende de infra. Schema/types ficam prontos; wire fica para ticket futuro.
- **Pool de conexões, retry, circuit breaker** — não-funcional, ticket à parte.
- **Substituir o state file JSON da CLI** — `--driver memory` continua usando o caminho atual; SQLite é additive.
- **Adapter HTTP/REST** (cenários BDD 3 e 4) — independente, outro ticket.
- **Multi-tenancy / row-level security** — fora do MVP.
- **Lint rule customizada para bloquear features proibidas** — opcional, vira ticket se valer.

## Dependências novas (preliminar)

```json
{
  "dependencies": {
    "drizzle-orm": "^0.42.0",
    "better-sqlite3": "^11.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.x",
    "@types/better-sqlite3": "^7.x"
  }
}
```

MySQL driver (`mysql2`) só entra quando o stub for ativado — não cabe no MVP deste ticket.

## Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Schema SQLite e MySQL divergem ao longo do tempo | Test de contrato roda os mesmos cenários nos dois schemas (quando MySQL subir); ADR explícita. |
| Mappers escondem bugs sutis (perda de precisão, timezone) | Property-based tests no W0 cobrindo round-trip `domain → row → domain`. |
| `better-sqlite3` é binário nativo, complica CI/Docker | Documentar setup no Dockerfile; usar `npm rebuild better-sqlite3` no build. |
| Indisciplina e uso de feature proibida | ADR + revisão obrigatória de PR + (opcional) ESLint rule. |

## Tickets relacionados / sucessores

- `CTR-ADAPTER-DRIZZLE-MYSQL-WIRE` — Ativar driver MySQL real quando container existir.
- `CTR-MIGRATION-FROM-LEGACY-MYSQL` — Importar dados do dump legado de `database/.dump/` para o schema novo.
- `CTR-EVENTS-OUTBOX` — Adapter de outbox para event bus persistente (depende deste ticket).
- `CTR-CLI-OBSERVABILITY` — Flag `--verbose-events` (sem dependência forte).

## Estimativa

~4 sprints curtas:

1. Schemas + mappers + repos (~300 linhas).
2. Driver SQLite + migrations + integração com CLI (~150 linhas).
3. Suite de contrato compartilhada InMemory/Drizzle (~200 linhas).
4. ADR + handbook (~80 linhas markdown).

Total estimado: ~750 linhas de TS + docs.
