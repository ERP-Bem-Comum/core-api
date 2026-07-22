# W0 — RED · BGP-ETL-LEGACY-ID (fatia 1/3 do ETL-BUDGET-PLANS)

> Objetivo da wave: escrever os testes que provam o contrato de constraint `legacy_id INT NULL` +
> UNIQUE nas **6** tabelas `bgp_*`, **falhando** por inexistência da coluna. Sem tocar em `src/`,
> sem gerar migration, sem `db:generate` (tudo isso é W1).

## O que foi testado (CAs do `000-request.md`)

| CA | Descrição | Onde |
| :-- | :-- | :-- |
| **CA1** | as 6 tabelas têm `legacy_id INT NULL` + UNIQUE | Bloco estrutural (schema Drizzle) **+** bloco integração (`information_schema`) |
| **CA2** | duas linhas nativas (`legacy_id = NULL`) convivem sob o UNIQUE (múltiplos NULL no InnoDB) | Bloco integração |
| **CA3** | duas linhas com o **mesmo** `legacy_id` → `ER_DUP_ENTRY` | Bloco integração |
| **CA4** | regressão zero: CRUD nativo (sem informar `legacy_id`) segue verde | Bloco integração |

As 6 tabelas cobertas: `bgp_budget_plans`, `bgp_budgets`, `bgp_cost_centers`, `bgp_categories`,
`bgp_subcategories`, `bgp_budget_results`.

## Arquivos criados / editados

- **Novo** `tests/modules/budget-plans/adapters/persistence/legacy-id.drizzle-mysql.test.ts`
  — molde `budget-result.drizzle-mysql.test.ts` (estrutural sempre-roda + bloco `if (integrationEnabled())`,
  `MYSQL_INTEGRATION=1`, `openBudgetPlansMysql`, `VALID_CONN`, `before/after` com `handle.close()`) e
  `fin-outbox-schema.drizzle-mysql.test.ts` (introspecção via `information_schema` + cast
  `as unknown as [{...}[]]` do `db.execute`).
- **Editado** `scripts/ci/test-integration.ts` — registrei o novo arquivo na suíte `budget-plans`
  para que o bloco de integração rode em `pnpm run test:integration:budget-plans` (W3). Não é `src/`.

## Desenho dos testes (duas camadas)

1. **Estrutural (sempre roda, sem DB)** — introspecta o schema Drizzle com `getTableColumns` +
   `getTableConfig` e, por tabela, exige: coluna `legacyId` presente, `columnType === 'MySqlInt'`,
   `notNull === false`, e um `uniqueIndex` de coluna única sobre `legacy_id`. É o RED que aparece
   no `pnpm test` puro — **não depende de MySQL**.
2. **Integração (opt-in `MYSQL_INTEGRATION=1`)** — prova os CAs contra MySQL real:
   CA1 via `information_schema.columns`/`.statistics`; CA2/CA3 via `INSERT` cru (`db.execute(sql`...`)`)
   com a cadeia de FKs semeada (`seedChain`) e chave natural distinta por linha, isolando o UNIQUE de
   `legacy_id`; CA4 semeia a cadeia nativa **sem** `legacy_id`. Os `INSERT`s de integração usam SQL cru
   (não o insert tipado do Drizzle) de propósito: assim o arquivo **typecheck-a limpo mesmo antes** de a
   coluna existir, e o RED em runtime é "Unknown column 'legacy_id'".

## Prova do RED (saída literal — `pnpm test` puro, sem MySQL)

Comando:

```
node --test --experimental-strip-types --no-warnings \
  tests/modules/budget-plans/adapters/persistence/legacy-id.drizzle-mysql.test.ts
```

Stats:

```
ℹ tests 12
ℹ suites 7
ℹ pass 0
ℹ fail 12
ℹ skipped 0
```

Motivo (correto) das falhas — amostra, uma por tabela × 2 asserts:

```
AssertionError: bgp_budget_plans: coluna legacyId ausente no schema Drizzle
AssertionError: bgp_budget_plans: UNIQUE index em legacy_id ausente no schema Drizzle
AssertionError: bgp_budgets: coluna legacyId ausente no schema Drizzle
AssertionError: bgp_budgets: UNIQUE index em legacy_id ausente no schema Drizzle
AssertionError: bgp_cost_centers: coluna legacyId ausente no schema Drizzle
AssertionError: bgp_cost_centers: UNIQUE index em legacy_id ausente no schema Drizzle
AssertionError: bgp_categories: coluna legacyId ausente no schema Drizzle
AssertionError: bgp_categories: UNIQUE index em legacy_id ausente no schema Drizzle
AssertionError: bgp_subcategories: coluna legacyId ausente no schema Drizzle
AssertionError: bgp_subcategories: UNIQUE index em legacy_id ausente no schema Drizzle
AssertionError: bgp_budget_results: coluna legacyId ausente no schema Drizzle
AssertionError: bgp_budget_results: UNIQUE index em legacy_id ausente no schema Drizzle
```

> 12 = 6 tabelas × 2 asserts (coluna + UNIQUE). Os **19** testes do bloco de integração
> (CA1 ×6, CA2 ×6, CA3 ×6, CA4 ×1) estão **gated** por `MYSQL_INTEGRATION=1` e não rodam no `pnpm test`
> puro — serão exercidos em W3 via `pnpm run test:integration:budget-plans` (sobem MySQL via Docker).

## Typecheck

`pnpm run typecheck` — **verde** para o arquivo novo (0 erros). Um ajuste foi necessário: o narrowing de
`IndexColumn` (`Column | SQL`) para ler `.name` foi feito com cast defensivo `as { name?: string }`.

## Riscos / observações para W1 (drizzle-schema-author)

- **Não é SQL à mão** (ADR-0020): a coluna + UNIQUE entram no schema `src/.../schemas/mysql.ts` e a
  migration sai de `pnpm run db:generate:budget-plans`.
- **Nullable é obrigatório** — o InnoDB só permite múltiplos NULL sob UNIQUE se a coluna for nullable;
  CA2 quebra se W1 marcar `notNull`.
- **Nome do índice**: o teste estrutural exige um `uniqueIndex` de **coluna única** sobre `legacy_id`
  em cada tabela (não aceita `legacy_id` como parte de um índice composto). Seguir o molde de
  `auth`/`partners`/`financial` (`..._legacy_id_uq`).
- **CA4 já passa hoje** (é sentinela de regressão aditiva, não RED) — só roda sob integração; W1 não
  deve quebrá-lo ao introduzir a coluna.
- Registro do arquivo no runner (`scripts/ci/test-integration.ts`) já feito — W3 pega automaticamente.

## Próximo passo

W1 (GREEN) com a skill **`drizzle-schema-author`**: adicionar `legacy_id: int('legacy_id')` (nullable) +
`uniqueIndex('..._legacy_id_uq').on(t.legacyId)` nas 6 tabelas em
`src/modules/budget-plans/adapters/persistence/schemas/mysql.ts`, rodar `pnpm run db:generate:budget-plans`,
e provar GREEN (estrutural + `pnpm run test:integration:budget-plans`).
