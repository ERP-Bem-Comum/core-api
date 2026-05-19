# Estado do Ticket CTR-ADAPTER-DRIZZLE-DUAL

| Wave | Status |
| :--- | :--- |
| W0 — RED | ✅ done — suites de contrato reutilizáveis (20 cenários) |
| W1 — GREEN | ✅ done — adapter Drizzle/SQLite funcional, mesmas 20 cenários passam (283/283) |
| W2 — REVIEW | ✅ APPROVED_WITH_NOTES — boundary respeitado, simetria 100%, espelhamento 100%, lista normativa cumprida |
| W3 — QUALITY | ✅ done — 3 notes do W2 endereçadas, handbook + migrations + Dockerfile entregues, 283/283 verdes |

## ADR

✅ [ADR-0018](../../../../handbook/architecture/adr/0018-persistence-dual-dialect-drizzle.md) — **Accepted** (2026-05-14).

## W1 entregue

### Arquivos criados

```
src/modules/contracts/adapters/persistence/
├── drivers/
│   └── sqlite-driver.ts                       # openSqlite(path) → handle Drizzle pronto
├── schemas/
│   ├── sqlite.ts                              # sqliteTable + SQLITE_DDL inline
│   └── mysql.ts                               # mysqlTable (stub, driver não wired)
├── mappers/
│   ├── money.mapper.ts                        # cents (integer/bigint)
│   ├── date.mapper.ts                         # unix-ms / datetime(3)
│   ├── period.mapper.ts                       # decomposição em 3 colunas
│   ├── contract.mapper.ts                     # Contract ↔ row + tabela junção
│   └── amendment.mapper.ts                    # Amendment ↔ row (todos os kinds)
└── repos/
    ├── contract-repository.drizzle.ts         # implements ContractRepository
    └── amendment-repository.drizzle.ts        # implements AmendmentRepository

tests/modules/contracts/adapters/persistence/
└── drizzle-sqlite.test.ts                     # invoca as MESMAS suites do W0
```

### Decisões técnicas

| # | Decisão | Justificativa |
| :- | :--- | :--- |
| 1 | `SQLITE_DDL` inline (não migrations versionadas) | Bootstrap de testes em `:memory:` precisa ser síncrono e sem deps. Migrations versionadas via `drizzle-kit` ficam em ticket separado quando precisarmos de produção. |
| 2 | `:memory:` por teste + `teardown` fecha conexão | SQLite `:memory:` é por-conexão; cada teste tem DB isolado. |
| 3 | `safe()` wrapper: `try/catch → Result` | Boundary explícito conforme CLAUDE.md raiz. `better-sqlite3` lança em I/O e FK violations. |
| 4 | `onConflictDoUpdate` para idempotência | Lista normativa ADR-0018 permite. Não usamos `ON DUPLICATE KEY UPDATE` (MySQL-only) ou `INSERT OR REPLACE` (SQLite-only). |
| 5 | Tabela de junção `contract_homologated_amendments` | Conforme ADR. Save em transação: delete + insert all-or-nothing. |
| 6 | Factory de testes ganhou `seedContract(contractId)` | FK do SQLite exigia contrato pai. InMemory: no-op. Drizzle: INSERT mínimo via SQL direto. |
| 7 | `eslint-disable-line prefer-readonly-parameter-types` em `handle: SqliteHandle` | `BetterSQLite3Database<>` do Drizzle tem interface internamente mutável (insert/update/delete). Handle é usado read-only — comentário documenta o motivo. |

### Resultado dos 4 gates

| Gate | Resultado |
| :--- | :--- |
| `pnpm format:check` | ✓ |
| `pnpm lint` | ✓ |
| `pnpm typecheck` | ✓ |
| `pnpm test` | **283/283** verdes (era 263; +20 cenários idênticos rodando contra Drizzle/SQLite) |

### Sentinelas de paridade testadas e aprovadas

1. ✅ `Money` em `MAX_SAFE_INTEGER − 7` round-tripa exato (sentinela de futuro `bigint` MySQL).
2. ✅ `signedAt` com milissegundos preservados (`integer` unix-ms ↔ `Date`).
3. ✅ `Period.Indefinite` com `period_end` nullable (decomposição em 3 colunas validada).
4. ✅ `Homologated` round-trip completo (`signedDocumentRef` + `homologatedAt` + `homologatedBy`).
5. ✅ Save idempotente via `onConflictDoUpdate` (sem violar lista normativa).
6. ✅ `findBySequentialNumber` usa índice `UNIQUE` (sem busca linear).

### Deps adicionadas

```json
{
  "dependencies": {
    "drizzle-orm": "^0.45.2",
    "better-sqlite3": "^12.10.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.10",
    "@types/better-sqlite3": "^7.6.13"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["better-sqlite3"]
  }
}
```

### Notas técnicas

- **Binário nativo**: `better-sqlite3` requer toolchain C++. Build local funcionou via `npx node-gyp rebuild --release`. Para CI/Docker, documentar no W3.
- **MySQL schema stubado**: definições em `schemas/mysql.ts` existem e compilam, mas driver MySQL não está wired. Ativação fica para `CTR-ADAPTER-DRIZZLE-MYSQL-WIRE`.
- **Migrations versionadas**: `SQLITE_DDL` cobre o bootstrap. `drizzle-kit generate` será habilitado no W3 com `pnpm db:generate:sqlite`.

## W2 — Resultado da auditoria (APPROVED_WITH_NOTES)

### Cinco dimensões auditadas

| # | Dimensão | Resultado |
| :- | :--- | :--- |
| 1 | Boundary `try/catch → Result` | ✅ todos os `throw` confinados em `safe()` |
| 2 | Result propagado sem swallowing | ⚠️ erro original do mapper engolido (NOTE 1) |
| 3 | Lista normativa da ADR-0018 | ✅ zero features proibidas (controvérsia documentada em NOTE 3) |
| 4 | Simetria bidirecional dos mappers | ✅ 100% — Contract (12 campos) + Amendment (12 × 4 variantes) |
| 5 | Espelhamento SQLite ↔ MySQL | ✅ 100% — 0 colunas divergentes |

### 3 NOTES para o W3 endereçar

| # | Onde | O que |
| :- | :--- | :--- |
| **NOTE 1** | `contract-repository.drizzle.ts:18`, `amendment-repository.drizzle.ts:16` | `safe()` apaga `error` original (corrupção de DB fica invisível). Adicionar `console.error` ou hook de telemetria antes de `return err(...)`. |
| **NOTE 2** | `sqlite-driver.ts:19-35` | `openSqlite` pode lançar via `new Database(path)`. Comentário fala em conversão "no repositório" mas o repo só envolve operações pós-handle. Decidir: envolver em Result ou documentar contrato explícito. |
| **NOTE 3** | `*-repository.drizzle.ts` (linhas do `onConflictDoUpdate`) | Drizzle traduz `onConflictDoUpdate` para `ON CONFLICT DO UPDATE` (SQLite — OK) e `ON DUPLICATE KEY UPDATE` (MySQL — proibido pela ADR). Redação da ADR-0018 é ambígua. Clarificar e adicionar nota explícita aceitando a abstração do Drizzle. |

### 5 STRENGTHS preservadas

- Transação atômica em `persistContract` sincroniza tabela de junção sem janela inconsistente.
- `Period` decomposto em 3 colunas — zero JSON, queries triviais.
- Mappers detectam corrupção semântica (`missing-impact-value`, `missing-new-end-date`) no boundary.
- `homologatedAmendmentIds` como tabela de junção real (não JSON array).
- 100% paridade entre `schemas/sqlite.ts` e `schemas/mysql.ts`.

## W3 — entregue

### NOTE 1 — logging do erro original

`safe(ctx, op)` agora recebe contexto e registra o erro real via `process.stderr.write` antes de substituir pelo código do port. Exemplo de saída:

```
[contract-repo:save] Error: UNIQUE constraint failed: contracts.sequential_number
[contract-repo:mapper] contract-mapper-invalid-money
[amendment-repo:findById] amendment-mapper-missing-impact-value
```

Aplicado em ambos os repos. Não afeta a API do port (que continua retornando apenas `contract-repo-unavailable` / `amendment-repo-unavailable`).

### NOTE 2 — `openSqlite` retorna Result

`openSqlite` agora retorna `Result<SqliteHandle, SqliteDriverError>`. Erros possíveis:

- `sqlite-driver-open-failed` (path inválido, permissão negada)
- `sqlite-driver-pragma-failed` (PRAGMA não suportado)
- `sqlite-driver-ddl-failed` (DDL inválido)

Cada caso fecha o handle antes de retornar `err()`. Fixtures de teste usam `openOrThrow` (que joga o programmatic error pra cima — falha em setup é responsabilidade do teste).

### NOTE 3 — ADR-0018 clarificada

Status: **Proposed → Accepted**. Lista normativa atualizada:

> Escrita SQL bruta de `ON DUPLICATE KEY UPDATE` / `INSERT OR REPLACE` continua **proibida**. `drizzle.insert(...).onConflictDoUpdate(...)` é **permitido** — Drizzle traduz por dialeto. Validação obrigatória: teste `save é idempotente` precisa passar em ambos os dialetos.

### Migrations versionadas

- `drizzle.config.ts` na raiz aponta para `schemas/sqlite.ts`.
- `pnpm db:generate:sqlite` gera SQL versionado em `src/modules/contracts/adapters/persistence/migrations/sqlite/`.
- Migration `0000_fearless_spyke.sql` gerada (3 tabelas, 1 UNIQUE INDEX, 3 FKs, 6 CHECK constraints) — confere com `SQLITE_DDL` inline.
- Pasta `migrations/` ficará versionada no git.

### Handbook + Dockerfile

- [`handbook/architecture/06-persistence-strategy.md`](../../../../handbook/architecture/06-persistence-strategy.md) — guia operacional (mapeamentos canônicos, topologia, migrations, build do binário nativo, boundary).
- [`Dockerfile`](../../../Dockerfile) — estágio `deps` com `apk add python3 make g++ libc6-compat` para `better-sqlite3`, estágio `runtime` minimalista, usuário não-root.

### Resultado final dos 4 gates

| Gate | Resultado |
| :--- | :--- |
| `pnpm format:check` | ✓ |
| `pnpm lint` | ✓ (com 4 `eslint-disable-line prefer-readonly-parameter-types` documentados para `BetterSQLite3Database` e `Database.Database` — interfaces nativas mutáveis usadas em modo leitura) |
| `pnpm typecheck` | ✓ |
| `pnpm test` | **283/283** verdes |

## 🎉 Ticket FECHADO

Entrega de ponta a ponta:

| Camada | Arquivos |
| :--- | :--- |
| Driver | `drivers/sqlite-driver.ts` |
| Schemas | `schemas/sqlite.ts`, `schemas/mysql.ts` (stub) |
| Mappers | `mappers/{money,date,period,contract,amendment}.mapper.ts` |
| Repos | `repos/{contract,amendment}-repository.drizzle.ts` |
| Migrations | `migrations/sqlite/0000_fearless_spyke.sql` |
| Testes | `tests/modules/contracts/adapters/persistence/{contract,amendment}-repository.suite.ts` + `inmemory.test.ts` + `drizzle-sqlite.test.ts` |
| Docs | `handbook/architecture/06-persistence-strategy.md` + ADR-0018 Accepted + CHANGELOG |
| Infra | `Dockerfile`, `drizzle.config.ts`, `pnpm db:generate:sqlite`, `pnpm.onlyBuiltDependencies: [better-sqlite3]` |

**Sucessores naturais (não bloqueados)**: `CTR-ADAPTER-DRIZZLE-MYSQL-WIRE` (wire MySQL real), `CTR-CLI-DRIVER-FLAG` (`--driver memory|sqlite|mysql`), `CTR-MIGRATION-FROM-LEGACY-MYSQL` (importar dump legado).
