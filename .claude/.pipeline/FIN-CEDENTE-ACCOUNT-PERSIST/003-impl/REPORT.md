# W1 — GREEN · FIN-CEDENTE-ACCOUNT-PERSIST

**Agente:** drizzle-schema-author + ports-and-adapters · **Resultado:** 🟢 GREEN (mapper 4/4) · **Branch:** `016-fin-remessa-cnab240`

## Arquivos

- `schemas/mysql.ts` — + tabela `fin_cedente_accounts` (9 cols, PK, 2 CHECKs) + coluna `fin_documents.debit_account_ref` + exports `CedenteAccountRow`/`NewCedenteAccountRow`.
- `migrations/mysql/0004_freezing_nekra.sql` — gerada por `pnpm run db:generate:financial` + **CHARSET/COLLATE manual** (id/debit_account_ref em `utf8mb4_bin`; tabela `ENGINE=InnoDB … utf8mb4_unicode_ci`).
- `mappers/cedente-account.mapper.ts` — `toRow`/`toDomain` (valida status/id) — **testado no gate**.
- `repos/cedente-account-store.drizzle.ts` — `createDrizzleCedenteAccountStore` (SELECT + ON DUPLICATE KEY UPDATE).
- `tests/.../cedente-account-store.drizzle-mysql.test.ts` — integração gated por `MYSQL_INTEGRATION` (+ no script `test:integration:financial`).

## `db:generate` — incidente NÃO recorreu ✅

Usei **`pnpm run db:generate:financial`** (config específica `drizzle.config.financial.ts`), **não** o
genérico `db:generate` (que aponta p/ contracts — provável causa do incidente `repos-dir-moved`).
`git status` pós-generate mostrou só: `_journal.json`+`schemas/mysql.ts` modificados, `0004_*.sql`+
`0004_snapshot.json` novos. **Nada de `repos/` movido, contracts intacto.** Diff do SQL inspecionado.

## Prova (gate)

```
▶ cedente-account.mapper   ✔ 4/4 (round-trip, status inválido, id inválido, toRow)
typecheck ✅ · lint ✅ (após `Readonly<CedenteAccountRow>` no param do toDomain — prefer-readonly-parameter-types)
```

## ✅ Integração VERIFICADA (Docker + MySQL real)

`pnpm run test:integration:financial` rodado nesta sessão (Docker disponível):

```
▶ CedenteAccountStore — Drizzle + MySQL (integração)  ✔ (393ms)
ℹ tests 23 · pass 23 · fail 0 · skipped 0   (suíte financial completa)
```

A migration `0004` (com CHARSET/COLLATE manual) **aplicou limpa** (sem erro de SQL) e o adapter Drizzle
(save / findById / upsert via ON DUPLICATE KEY UPDATE) funciona ponta-a-ponta contra MySQL real.
O gate W3 (typecheck+format+lint+test) **não** executa este teste (auto-skipa sem `MYSQL_INTEGRATION` —
"pulando integração"); ele roda em `test:integration:financial` (CI/pre-merge), agora **verde**.

## Próxima wave

W2 (skill `code-reviewer`) — audit read-only (schema/migration/mapper/adapter + a pendência de integração).
