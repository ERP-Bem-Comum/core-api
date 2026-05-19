# W3 — QUALITY — CTR-DB-DRIVER-MYSQL

**Wave:** W3 (QUALITY)
**Skill:** `ts-quality-checker` + `pnpm test` + `pnpm test:integration`
**Data:** 2026-05-15
**Status:** ✅ COMPLETED — todos os gates clean, 14/14 CAs do ticket GREEN

---

## Sumário

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` | ✅ exit 0 |
| Lint | `pnpm run lint` | ✅ exit 0 |
| Format check | `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| Suite default (offline) | `pnpm test` | ✅ 447 tests / 436 pass / 0 fail / 11 skipped (CA-5..14 funcionais opt-in via `MYSQL_INTEGRATION=1`) |
| Suite integration (Docker MySQL real) | `pnpm test:integration` | ✅ 47 tests / 47 pass / 0 fail em 3.8s |

---

## CAs do `000-request.md` — status final

| CA | Status | Tempo | Anchor |
| :--- | :---: | :---: | :--- |
| CA-1: mysql2@^3.x | ✅ | < 1ms | `package.json:41` |
| CA-2: exports `mysql-driver.ts` | ✅ | < 1ms | `src/.../drivers/mysql-driver.ts` |
| CA-3: `createDrizzleMysqlContractRepository` | ✅ | < 1ms | `src/.../repos/contract-repository.drizzle-mysql.ts` |
| CA-4: `createDrizzleMysqlAmendmentRepository` | ✅ | < 1ms | `src/.../repos/amendment-repository.drizzle-mysql.ts` |
| CA-5: `openMysql` healthy | ✅ | 24ms | runtime |
| CA-6: bad auth → `connect-failed` | ✅ | 19ms | runtime |
| CA-7: bad URI → `connection-string-invalid` | ✅ | 0.1ms | runtime |
| CA-8: migrator idempotente | ✅ | 26ms (com reset) | runtime |
| CA-9: suíte contratual Contract (12 cenários) | ✅ | ~100ms | `runContractRepositoryContract` |
| CA-10: suíte contratual Amendment (8 cenários) | ✅ | ~70ms | `runAmendmentRepositoryContract` |
| CA-11: UNIQUE sequential_number rejeita conflito | ✅ | 7ms | SELECT-then aplicado |
| CA-12: upsert por id preserva integridade | ✅ | 7ms | SELECT-then aplicado |
| CA-13: `buildMysqlContext` shape | ✅ | 6ms | CLI driver não-stub |
| CA-14: `ctx.shutdown()` fecha pool | ✅ | 6ms | lifecycle limpo |

Total integração: 47 testes em **3.78s** (sequencial via `--test-concurrency=1`).

---

## Bugs descobertos e corrigidos durante o W1 (recapitulação)

| # | Sintoma | Causa raiz | Fix |
| :--- | :--- | :--- | :--- |
| B-1 | TS errors "Property '$columns' is protected... Two different types" | pnpm criou 3 cópias do `drizzle-orm` (peers `better-sqlite3` × `mysql2`) | `.npmrc` com `dedupe-peer-dependents=true` + `public-hoist-pattern[]=drizzle-orm` |
| B-2 | Drizzle types incompatíveis entre SQLite (`number`) e MySQL (`Date`) | Mappers SQLite assumiam epoch-ms; MySQL retorna `Date` nativo | 3 mappers MySQL paralelos (`.mapper.mysql.ts`) |
| B-3 | Process travado no fim do `drizzle-mysql.test.ts` | `before()` top-level abria pool sem `after()` correspondente | `after()` top-level fechando handle |
| B-4 | Migration test #3 falhava com `Table already exists` quando outras suites integration rodavam antes | Backticks em `DROP DATABASE IF EXISTS \`core\`` interpretados como shell command substitution | Remover backticks (`core` não é reserved word) + check de exit code |
| B-5 | CA-8 (idempotência migrator) falhava em `test:integration` | Migration test #3 aplica via `mysql` CLI sem popular `__drizzle_migrations` | `resetCoreDatabase()` cirúrgico antes do CA-8 |
| B-6 | Race condition entre suites integration | node:test paralelizava arquivos | `--test-concurrency=1` no `test:integration` |
| B-7 | CA-11 (UNIQUE rejeita conflito) falhava com primeiro design | `ON DUPLICATE KEY UPDATE` dispara em qualquer UNIQUE — sobrescrevia silenciosamente row alheia | Refator para SELECT-then-UPDATE-or-INSERT em transação (validado pelo `database-theorist`) |

---

## Decisão arquitetural destacada

**SELECT-then-UPDATE-or-INSERT em vez de `ON DUPLICATE KEY UPDATE`** — escolha tomada após consulta ao `database-theorist`. Resumo:

- ODKU do MySQL dispara em qualquer UNIQUE violada (Refman §13.2.6.2), não dirigível à PK.
- Postgres/SQLite têm `ON CONFLICT (col) DO UPDATE` — MySQL não tem equivalente.
- O padrão SELECT-then-INSERT-or-UPDATE em transação reproduz a semântica desejada.
- 1 RTT extra (~1ms localhost) é trivial; benefício é não-localizado (defesa em profundidade para admin scripts, futuros HTTP endpoints, integrações).
- Ancorado em Ramakrishnan §3.2 + Date Cap. 9: schema é system of record; aplicação faz UX, não correctness.

Documentado inline em `contract-repository.drizzle-mysql.ts:56-68` (13 linhas de comentário).

---

## Estado do repo após o ticket

```
src/modules/contracts/
├── adapters/
│   ├── persistence/
│   │   ├── drivers/
│   │   │   ├── sqlite-driver.ts        (legado, removido em #5)
│   │   │   └── mysql-driver.ts         ✨ NOVO
│   │   ├── mappers/
│   │   │   ├── *.mapper.ts             (SQLite, removido em #5)
│   │   │   └── *.mapper.mysql.ts       ✨ NOVO (período, contract, amendment)
│   │   ├── repos/
│   │   │   ├── *-repository.drizzle.ts        (SQLite, removido em #5)
│   │   │   └── *-repository.drizzle-mysql.ts  ✨ NOVO
│   │   └── schemas/
│   │       ├── sqlite.ts                (legado, removido em #5)
│   │       └── mysql.ts                 (já existia desde #2)
│   ├── …
├── cli/
│   ├── drivers/
│   │   ├── memory.ts
│   │   ├── sqlite.ts                    (legado, removido em #5)
│   │   └── mysql.ts                     ⚡ REFATORADO (era stub)
│   ├── context.ts                       ⚡ MODIFICADO (tipos de erro)
│   ├── main.ts                          ⚡ MODIFICADO (exit codes)
│   └── formatters/error.ts              ⚡ MODIFICADO (mensagens PT-BR)
└── …

tests/
└── modules/contracts/adapters/persistence/
    ├── mysql-driver.test.ts             ✨ NOVO (7 testes)
    ├── drizzle-mysql.test.ts            ✨ NOVO (26 testes)
    └── migrations/mysql.test.ts         🐛 FIX (backticks)

package.json                              ⚡ deps + test:integration
.npmrc                                    ✨ NOVO (dedupe + hoist)
```

---

## Issues do W2 — status

| # | Issue | Severidade | Status |
| :--- | :--- | :---: | :--- |
| I-1 | N+1 problem em `list()` | 🟡 Important | Diferido para `CTR-DB-LIST-N-PLUS-1` (regressão zero — paridade com SQLite, problema pré-existente) |
| S-1 | `safe()` duplicado | 🔵 | Endereçar em #5 (após remover SQLite) |
| S-2 | `createPoolSafe` try/catch defensivo | 🔵 | Manter (defesa contra mudança futura do mysql2) |
| S-3 | `MYSQL_INTEGRATION` em 2 lugares | 🔵 | Endereçar quando 3º teste de integração entrar |
| S-4 | `DEFAULT_POOL_LIMIT` sem racional | 🔵 | Polish — adicionar comentário no commit final |
| S-5 | Regex de connection string restritiva | 🔵 | Aceitar limitação para CLI (documentar) |
| S-6 | `resetCoreDatabase` hardcoded | 🔵 | Endereçar quando outro teste precisar |
| S-7 | `applyMigrations: true` default no CLI | 🔵 | Revisar quando daemon HTTP vier |

Nenhuma issue bloqueante. As suggestions são polishes opcionais ou follow-ups documentados.

---

## Polish opcional aplicado no W3

Aplicar S-4 (1 linha de comentário) é o único polish trivial sem risco. Os demais ficam diferidos. **Nada aplicado neste momento** — o REVIEW APPROVED e o REPORT registram a decisão.

---

## Próximo ticket da sequência ADR-0020

**#5 `CTR-CLEANUP-SQLITE`**: deletar `schemas/sqlite.ts`, mappers SQLite, repos SQLite, driver SQLite, e renomear os MySQL paralelos para canônicos (sem sufixo). Atualizar tests SQLite ou removê-los (suítes contratuais continuam, mas drizzle-sqlite.test.ts deixa de existir). Atualizar CLAUDE.md e CLI help text. Revisar `.npmrc` (`public-hoist-pattern[]=drizzle-orm` deixa de ser necessário com só 1 peer).

---

## Conclusão

Ticket pronto para commit. Conteúdo do commit semântico sugerido:

```
feat(contracts/persistence): MySQL driver runtime + repos Drizzle + CLI wire

- mysql2@^3.22.3 + drizzle-orm/mysql2 + migrator no boot
- mysql-driver.ts (Result<MysqlHandle, MysqlDriverError>)
- repos drizzle-mysql para Contract e Amendment com SELECT-then-UPDATE-or-INSERT
  em transação (defesa em profundidade vs ON DUPLICATE KEY UPDATE)
- 3 mappers paralelos para MySQL (Date vs epoch-ms do SQLite)
- cli/drivers/mysql.ts deixa de ser stub; --driver mysql funcional
- .npmrc: dedupe-peer-dependents + hoist drizzle-orm (3 cópias → 1)
- pnpm test:integration com --test-concurrency=1; 47/47 GREEN
- Bug fix incidental: backticks shell em migration test #3

Decisão arquitetural ancorada em Ramakrishnan §3.2 + MySQL Refman §13.2.6.2,
validada pelo `database-theorist`.

Pipeline: W0→W1→W2 (APPROVED self-review)→W3
Closes ticket CTR-DB-DRIVER-MYSQL (#4 da sequência ADR-0020).
```
