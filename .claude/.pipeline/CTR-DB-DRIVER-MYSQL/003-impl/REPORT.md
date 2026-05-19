# W1 — GREEN — CTR-DB-DRIVER-MYSQL

**Wave:** W1 (GREEN)
**Skill:** `database-engineer` + `ports-and-adapters` + consulta a `database-theorist`
**Data:** 2026-05-15
**Status:** ✅ COMPLETED — 14/14 CAs GREEN, todos os gates clean

---

## Sumário de resultados

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ exit 0 |
| `pnpm run lint` | ✅ exit 0 |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm test` (default) | ✅ 447 tests / 436 pass / 0 fail / 11 skipped |
| `pnpm test:integration` (3 arquivos sequenciais) | ✅ 47 / 47 pass / 0 fail em 3.8s |

---

## Artefatos entregues

| Arquivo | Tipo | Razão |
| :--- | :--- | :--- |
| `package.json` (dep `mysql2@^3.22.3`) | modificado | Driver runtime MySQL. |
| `package.json` (script `test:integration`) | modificado | Glob ampliado para incluir os 3 arquivos de integração com `--test-concurrency=1`. |
| `.npmrc` | novo | `dedupe-peer-dependents=true` + `public-hoist-pattern[]=drizzle-orm` — resolve drift de tipos de pnpm peer-deps. |
| `src/.../drivers/mysql-driver.ts` | novo | Pool `mysql2/promise` + Drizzle/MySQL + migrator. API: `openMysql({ connectionString, applyMigrations?, poolLimit? }) → Result<MysqlHandle, MysqlDriverError>`. |
| `src/.../mappers/period.mapper.mysql.ts` | novo | Mapper paralelo: `Date ↔ Date` (vs SQLite `Date ↔ epoch-ms`). |
| `src/.../mappers/contract.mapper.mysql.ts` | novo | Mapper paralelo usando tipos de `schemas/mysql.ts`. |
| `src/.../mappers/amendment.mapper.mysql.ts` | novo | Idem para Amendment. |
| `src/.../repos/contract-repository.drizzle-mysql.ts` | novo | SELECT-then-UPDATE-or-INSERT em transação (defesa em profundidade — ver §"Decisão arquitetural" abaixo). |
| `src/.../repos/amendment-repository.drizzle-mysql.ts` | novo | Mesmo padrão por simetria. |
| `src/.../cli/drivers/mysql.ts` | refactor | Deixou de ser stub; abre `openMysql({ applyMigrations: true })`, instancia repos, retorna `CliContext`. |
| `src/.../cli/context.ts` | modificado | `CliContextError` ganhou `MysqlDriverError`; removeu `cli-mysql-driver-not-wired`. |
| `src/.../cli/main.ts` | modificado | Exit codes para os 3 erros novos; removeu `EXIT_SOFTWARE` (não havia mais uso). |
| `src/.../cli/formatters/error.ts` | modificado | Mensagens PT-BR para os 3 códigos novos; removeu mensagem antiga do stub. |
| `tests/.../persistence/mysql-driver.test.ts` | novo | 7 testes — CA-1..2 estruturais, CA-5..8 runtime. |
| `tests/.../persistence/drizzle-mysql.test.ts` | novo | 26 testes — CA-3/4 + suítes contratuais + CA-11/12 + CA-13/14. |
| `tests/.../migrations/mysql.test.ts` | bug fix | Backticks em `core` (interpretados como shell command substitution) — substituídos por nome simples. |
| `tests/cli/contracts.cli.sqlite.test.ts` | modificado | Teste antigo do stub agora valida exit 64 (USAGE) com mensagem PT-BR nova. |

---

## Decisão arquitetural — Upsert estrito por PK via SELECT-then

A primeira tentativa do W1 usou `INSERT … ON DUPLICATE KEY UPDATE { set: row }` (sintaxe canônica do MySQL, liberada por ADR-0020 §"Agora permitidas"). Quando o `drizzle-mysql.test.ts:CA-11` rodou pela primeira vez, descobriu **divergência semântica não-trivial**:

| Operação | SQLite (`onConflictDoUpdate({target:id})`) | MySQL (`onDuplicateKeyUpdate({set})`) |
| :--- | :--- | :--- |
| Conflito em PK | Atualiza row existente | Atualiza row existente |
| Conflito em **outra** UNIQUE | **Erro** (`SQLITE_CONSTRAINT_UNIQUE`) | **Atualiza** silenciosamente — incluindo PK |

Em concreto: row existente `(id=A, sequential_number='999/2026')` + tentar INSERT `(id=B, sequential_number='999/2026')`:
- SQLite: falha. Defesa em profundidade.
- MySQL ODKU puro: `UPDATE … SET id=B, … WHERE sequential_number='999/2026'`. **Sobrescreve `id` da row alheia**. Corrupção silenciosa se o use case tiver bug.

Consultei `database-theorist` (Ramakrishnan §3.2, Date Cap. 9, MySQL Refman §13.2.6.2) para fundamentar a decisão. Conclusão: integridade pertence ao schema, não à aplicação. O `findBySequentialNumber` no use case é **TOCTOU race** sob concorrência; só a UNIQUE constraint garante. O ODKU MySQL é semanticamente menos preciso que o `ON CONFLICT (col)` do Postgres/SQLite — não tem equivalente exato.

A única alternativa idiomática que preserva semântica é **SELECT-then-UPDATE-or-INSERT em transação**. Aplicado em:

- `contract-repository.drizzle-mysql.ts:54-83` — racionalizado num comentário inline citando Refman §13.2.6.2 e o motivo do padrão.
- `amendment-repository.drizzle-mysql.ts:53-71` — mesma técnica por simetria + defesa preventiva (hoje `ctr_amendments` só tem UNIQUE na PK, mas quando uma composta `(contract_id, amendment_number)` for adicionada, o repo já está pronto).

**Trade-off:** 1 RTT extra (~1ms localhost). Operações de save de contrato são raras; latência invisível. Benefício: 100% de garantia que o repo nunca produz corrupção silenciosa por bug em código que não passe pelo use case (admin scripts, futuras integrações HTTP).

---

## Problemas resolvidos no W1

### 1. Drift de tipos no `pnpm` por peer dependencies

`drizzle-orm` tem ambos `better-sqlite3` e `mysql2` como peer-deps. Pnpm criou 3 cópias do `drizzle-orm` (cada combinação peers), e o TS tratou os tipos `MySqlTable<T>`, `SQL<T>` como classes distintas — `protected $columns` batia com erros como:

```
Property '$columns' is protected but type 'MySqlTable<T>' is not a class derived from 'MySqlTable<T>'.
Types have separate declarations of a private property 'shouldInlineParams'.
```

**Solução**: criar `.npmrc` com `dedupe-peer-dependents=true` + `public-hoist-pattern[]=drizzle-orm`. Pnpm passou a manter **1 só instância** dos types — hoist no top-level `node_modules/drizzle-orm/`.

### 2. Drift de tipos entre SQLite e MySQL nos mappers

Mappers SQLite assumiam `signedAt: number` (epoch-ms via `dateToUnixMs`). Schema MySQL usa `datetime(3) { mode: 'date' }` que retorna `Date`. O comentário antigo do mapper `"tipos compatíveis"` era falso.

**Solução**: criar mappers paralelos `period.mapper.mysql.ts`, `contract.mapper.mysql.ts`, `amendment.mapper.mysql.ts`. Sem tocar nos SQLite (deleção fica para CTR-CLEANUP-SQLITE #5).

### 3. Test do migration (ticket #3) tinha bug de shell-injection

`dockerExecRoot('DROP DATABASE IF EXISTS \`core\`', 'mysql')` — `bash -c "..."` interpretou os backticks como **command substitution**: chamada ao comando `core` (inexistente → vazio), produzindo `DROP DATABASE IF EXISTS ` (syntax error). Como `dockerExecRoot` não checava exit code, falha silenciosa. Bug latente até este ticket — quando os novos arquivos de integration rodaram ANTES do migration test, o DB chegou ao before com tabelas, e o reapply explodiu com `ER 1050: Table already exists`.

**Solução**: removidos backticks (não são necessários — `core` não é reserved word) + adicionado check de exit code com diagnóstico em stderr.

### 4. `drizzle-mysql.test.ts` segurava o processo aberto

`before()` top-level abria handle MySQL com `enableKeepAlive: true`, mas não havia `after()` correspondente. Node.js não força exit enquanto handles I/O estão ativos — todos os tests passavam mas o processo travava no fim.

**Solução**: adicionar `after()` top-level fechando o handle e setando `null`.

### 5. CA-8 (idempotência do migrator) regredia em `test:integration`

Como o migration test (ticket #3) aplica via `docker exec | mysql` direto, **não popula a tabela `__drizzle_migrations`** que o drizzle migrator gerencia. Quando o `mysql-driver.test.ts:CA-8` rodava depois e chamava `openMysql({applyMigrations: true})`, o migrator via journal vazio e tentava aplicar 0000_*.sql contra DB que já tinha as tabelas → `ER 1050`.

**Solução**: o CA-8 faz `resetCoreDatabase()` (DROP+CREATE via docker exec) antes de testar idempotência. Garante estado determinístico independente da ordem dos arquivos.

### 6. `test:integration` rodava arquivos em paralelo e suítes se destruíam

Default do node:test é `--test-concurrency = numCpus`. Múltiplas suítes integration aplicando migration + truncate sobre o mesmo database `core` em paralelo geravam race conditions.

**Solução**: `--test-concurrency=1` no script `test:integration`. Trade-off: ~3× mais lento mas determinístico.

---

## CAs do `000-request.md` × resultado

| CA | Resultado | Anchor |
| :--- | :---: | :--- |
| CA-1: `mysql2@^3.x` em deps | ✅ | `package.json:41` |
| CA-2: exports do `mysql-driver.ts` | ✅ | `src/.../drivers/mysql-driver.ts` |
| CA-3: `createDrizzleMysqlContractRepository` | ✅ | `src/.../repos/contract-repository.drizzle-mysql.ts` |
| CA-4: `createDrizzleMysqlAmendmentRepository` | ✅ | `src/.../repos/amendment-repository.drizzle-mysql.ts` |
| CA-5: `openMysql` healthy | ✅ | runtime, 24ms |
| CA-6: bad auth → `connect-failed` | ✅ | runtime, 19ms |
| CA-7: bad URI → `connection-string-invalid` | ✅ | runtime, 0.1ms (não chega ao driver) |
| CA-8: migrator idempotente | ✅ | runtime, 26ms (com `resetCoreDatabase`) |
| CA-9: suíte contratual de ContractRepository (12 cenários) | ✅ | `runContractRepositoryContract` |
| CA-10: suíte contratual de AmendmentRepository (8 cenários) | ✅ | `runAmendmentRepositoryContract` |
| CA-11: UNIQUE `sequential_number` rejeita conflito | ✅ | SELECT-then aplicado |
| CA-12: upsert por id preserva integridade | ✅ | SELECT-then aplicado |
| CA-13: `buildMysqlContext` shape | ✅ | CLI driver não-stub |
| CA-14: `ctx.shutdown()` fecha pool | ✅ | lifecycle limpo |

---

## Suggestion do W2 do ticket #3 (#3 S-1) — endereçada

S-1 do review do #3 falava sobre `assert.fail` vs `t.skip` em CAs funcionais. Já foi resolvida via opt-in `MYSQL_INTEGRATION=1` no W3 do #3. Este ticket #4 herda o padrão e amplia (todos os novos CAs funcionais skipam quando env var não está setada).

---

## Próximo passo

Avançar para **W2 — REVIEW** com `maestro:code-reviewer`. Focos críticos sugeridos para o reviewer:

1. SELECT-then-UPDATE-or-INSERT — semântica em transação `REPEATABLE READ` (default InnoDB) é equivalente ao `onConflictDoUpdate({target:id})` do SQLite?
2. Pool `mysql2` com `enableKeepAlive: true` — risco de file descriptor exhaustion em produção?
3. Mappers paralelos MySQL — riscos de drift futuro com SQLite (até ser removido em #5)?
4. `.npmrc` `dedupe-peer-dependents=true` + hoist drizzle-orm — efeito colateral em outras peers (`better-sqlite3`)?
5. Reset hard via `docker exec` no CA-8 — vaza estado/contamina outros testes?
