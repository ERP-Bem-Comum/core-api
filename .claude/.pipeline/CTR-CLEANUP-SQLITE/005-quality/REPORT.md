# W3 — QUALITY — CTR-CLEANUP-SQLITE

**Wave:** W3 (QUALITY)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — todos os gates clean

## Gates

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Cleanup CAs | `node --test tests/cleanup/sqlite-removal.test.ts` | ✅ 18/18 GREEN |
| Typecheck | `pnpm run typecheck` | ✅ exit 0 |
| Lint | `pnpm run lint` | ✅ exit 0 |
| Format check | `pnpm run format:check` | ✅ All files use Prettier code style |
| Suite default | `pnpm test` | ✅ 431 tests / 420 pass / 0 fail / 11 skipped |
| Suite integration | `pnpm test:integration` | ✅ 47 / 47 pass em 4.0s |

## Variação na suite default

Antes (#4): 447 tests / 436 pass / 11 skipped.
Depois (#5): 431 tests / 420 pass / 11 skipped.

Diferença: **−16 testes** = exatamente o `drizzle-sqlite.test.ts` (16 testes na suíte contratual SQLite). O `contracts.cli.sqlite.test.ts` foi deletado mas tinha tests que rodavam por subprocess `runCli` — não eram contados como `tests` do node:test runner, apenas como steps internos.

## CAs do `000-request.md` × resultado

| CA | Status |
| :--- | :---: |
| CA-1: sqlite-driver.ts deletado | ✅ |
| CA-2: schemas/sqlite.ts deletado | ✅ |
| CA-3: migrations/sqlite/ deletada | ✅ |
| CA-4: cli/drivers/sqlite.ts deletado | ✅ |
| CA-5: drizzle-sqlite.test.ts deletado | ✅ |
| CA-6: contracts.cli.sqlite.test.ts deletado | ✅ (decisão de cleanup, não rename — ver S-1 do REVIEW) |
| CA-7: helpers/temp-db.ts deletado | ✅ |
| CA-8: drizzle.config.ts (canônico) com dialect:mysql | ✅ |
| CA-9: mappers/contract.mapper.ts canônico | ✅ |
| CA-10: mappers/amendment.mapper.ts canônico | ✅ |
| CA-11: mappers/period.mapper.ts canônico | ✅ |
| CA-12: repos/contract-repository.drizzle.ts canônico | ✅ |
| CA-13: repos/amendment-repository.drizzle.ts canônico | ✅ |
| CA-14: parse-driver-flags sem sqlite | ✅ |
| CA-15: package.json sem better-sqlite3 e @types/better-sqlite3 | ✅ |
| CA-16: db:generate sem sufixo :mysql, sem db:generate:sqlite | ✅ |
| CA-17: .npmrc sem public-hoist-pattern do drizzle-orm | ✅ |
| CA-18: nenhuma referência a SQLite em src/ | ✅ |

## Pós-condições estabelecidas

- `package.json` é minimal: 2 deps runtime (`drizzle-orm`, `mysql2`), devDeps sem `@types/better-sqlite3` ou `onlyBuiltDependencies`.
- CLI da P.O. tem 2 drivers: `--driver memory` (default) e `--driver mysql --connection-string ...`. Flag `--db` e `--in-memory` deixaram de existir.
- Nenhum arquivo em `src/` ou `tests/` (exceto comentários históricos em `reports-2026-05-15.test.ts:394` documentando que o REGR #5 foi deletado) menciona `better-sqlite3`, `SqliteHandle`, `SqliteDriverError`, `sqlite-driver-*`, `openSqlite`, `createDrizzleSqlite*`, `buildSqliteContext`.
- `drizzle.config.ts` (canônico) é o único config Drizzle e aponta para `schemas/mysql.ts` + `migrations/mysql/`.

## Conteúdo do commit semântico sugerido

```
refactor(contracts): remove SQLite (cleanup pós-ADR-0020)

- delete 14 arquivos SQLite (driver, schema, mappers, repos, cli driver, migrations, tests)
- rename 5 arquivos MySQL paralelos para canônicos (sem sufixo .mysql./- mysql)
- refactor call sites: context, main, parse-driver-flags, formatters/error, cli driver mysql
- refactor tests: parse-driver-flags, regression #5/#6, integração imports
- config: package.json (drop better-sqlite3 + @types + onlyBuiltDependencies),
         .npmrc (drop public-hoist-pattern drizzle-orm),
         tsconfig.json (drop drizzle.config.ts legado include),
         drizzle.mysql.config.ts → drizzle.config.ts,
         db:generate:mysql → db:generate
- cleanup tests: 18/18 GREEN no tests/cleanup/sqlite-removal.test.ts
- gates: typecheck + lint + format ✅; pnpm test 420/0/11; pnpm test:integration 47/47

Pipeline: W0→W1→W2 (APPROVED self-review)→W3
Closes ticket CTR-CLEANUP-SQLITE (#5 da sequência ADR-0020).
```

## Próximo ticket

**`CTR-DOCKERFILE-MYSQL` (#6)**: o Dockerfile atual provavelmente tem toolchain C++ por causa do `better-sqlite3` (compilação nativa). Sem `better-sqlite3`, pode sair de uma imagem mais magra (ex.: `node:24-alpine` sem `build-base`). Verificar e atualizar.
