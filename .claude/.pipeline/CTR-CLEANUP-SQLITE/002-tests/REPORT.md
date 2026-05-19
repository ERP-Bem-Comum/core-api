# W0 — RED — CTR-CLEANUP-SQLITE

**Wave:** W0 (RED)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — 18/18 CAs RED

## Arquivo entregue

`tests/cleanup/sqlite-removal.test.ts` (220 linhas) — 18 testes estruturais que descrevem o estado desejado pós-cleanup.

## Resultado RED

```
ℹ tests 18 / pass 0 / fail 18 — RED disciplinado
```

Cada CA tem mensagem de falha precisa apontando o que ainda existe / está pendente. Ao W1 fazer DELETE+RENAME+REFACTOR, vira GREEN incrementalmente.

## Estratégia para este ticket delete-heavy

Diferente dos tickets de feature (que falham por "API não existe"), aqui o RED é **estrutural**: arquivos SQLite ainda existem; mappers MySQL ainda têm sufixo `.mysql.`; package.json ainda lista `better-sqlite3`; etc. Os testes verificam o **estado** do filesystem/config, não comportamento runtime.

Vantagem: a suite serve como checklist exhaustivo do W1. Cada CA verde = uma operação concluída.

## Próximo passo

W1 — GREEN. Ordem sugerida:
1. RENAME (move-only, preserva imports): `.mapper.mysql.ts` → `.mapper.ts`; `*.drizzle-mysql.ts` → `*.drizzle.ts`; tipos/funções `*Mysql*` → sem sufixo.
2. REFACTOR call sites: context.ts, main.ts, parse-driver-flags.ts, formatters/error.ts.
3. REFACTOR tests: parse-driver-flags.test.ts, reports-2026-05-15.test.ts, contracts.cli.sqlite.test.ts → contracts.cli.memory.test.ts.
4. CONFIG: drizzle.mysql.config.ts → drizzle.config.ts; package.json (deps + script); .npmrc; tsconfig.json.
5. DELETE: arquivos SQLite (driver, schema, mappers SQLite, repos SQLite, cli/drivers/sqlite.ts, migrations/sqlite/, tests SQLite, helpers/temp-db.ts).
6. `pnpm install` para limpar `node_modules/better-sqlite3`.
