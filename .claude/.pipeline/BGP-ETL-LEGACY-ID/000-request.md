# BGP-ETL-LEGACY-ID — escopo (fatia 1/3 do ETL-BUDGET-PLANS)

> Size **S**. Só migration: `legacy_id` + UNIQUE nas 6 tabelas `bgp_*`. Zero lógica, zero regra de
> negócio. **Destrava as fatias 2 e 3** — sem esta coluna, nada do ETL é seguro de rodar duas vezes.

## Contexto

`auth`, `partners` e `financial` **todas** têm `legacy_id` com UNIQUE, e o comentário no schema é
explícito:

> "Idempotência da ETL: UNIQUE em legacy_id (múltiplos NULL permitidos no InnoDB)."
> — `src/modules/auth/adapters/persistence/schemas/mysql.ts:151`

`bgp_*` **não tem nenhuma**. Sem ela:

1. Rodar o ETL 2× **duplica tudo** (não há como saber que a linha já veio).
2. O `alreadyExists` do `scripts/etl/reconcile.ts` não tem como funcionar → o invariante
   `read = migrated + quarantined + alreadyExists` (`isBalanced`) quebra.

## Escopo (in)

`legacy_id INT NULL` + `uniqueIndex` nas **6** tabelas:

| Tabela | Origem legada |
| :-- | :-- |
| `bgp_budget_plans` | `budget_plans.id` |
| `bgp_budgets` | `budgets.id` |
| `bgp_cost_centers` | `cost_centers.id` |
| `bgp_categories` | `cost_centers_categories.id` |
| `bgp_subcategories` | `cost_centers_sub_categories.id` |
| `bgp_budget_results` | `budget_results.id` |

**Nullable** porque linha nativa (criada na tela) não tem legado. O InnoDB permite múltiplos NULL sob
UNIQUE — é exatamente o que o padrão dos outros módulos explora.

## Fora de escopo

Reader, mapper, write port, qualquer leitura do legado → fatias 2 e 3.

## Critérios de aceite

- **CA1** — As 6 tabelas têm `legacy_id INT NULL` + UNIQUE. Migration versionada via
  `pnpm run db:generate` (nunca SQL à mão — ADR-0020).
- **CA2** — Duas linhas nativas (`legacy_id = NULL`) convivem na mesma tabela sem violar o UNIQUE.
- **CA3** — Duas linhas com o **mesmo** `legacy_id` na mesma tabela → erro de UNIQUE.
- **CA4** — Regressão zero: os CRUDs atuais de budget-plans seguem verdes (a coluna é aditiva e
  nullable; nenhum insert existente precisa mudar).

## DoD

Gate W3 verde + migration aplicada no MySQL local (OrbStack) + os 3 CAs de constraint provados em
teste de integração.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — os 3 CAs de constraint |
| W1 | `drizzle-schema-author` | schema + `db:generate` |
| W2 | `code-reviewer` | audit read-only |
| W3 | `ts-quality-checker` | gate + integração MySQL |
