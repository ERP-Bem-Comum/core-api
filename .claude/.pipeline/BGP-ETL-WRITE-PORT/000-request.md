# BGP-ETL-WRITE-PORT — escopo (fatia 2/3 do ETL-BUDGET-PLANS)

> Size **M**. A "porta de escrita" do ETL no módulo `budget-plans`: `buildBudgetPlansEtlPort`.
> Molde direto: [`src/modules/partners/public-api/etl.ts`](../../../src/modules/partners/public-api/etl.ts)
> e [`src/modules/financial/public-api/etl.ts`](../../../src/modules/financial/public-api/etl.ts).

## Depende de

**`BGP-ETL-LEGACY-ID`** (fatia 1) — o port escreve `legacy_id` e o usa para decidir `alreadyExists`.
Sem a coluna, o port não tem como ser idempotente.

## Contexto

O ETL não pode importar `budget-plans/domain/` nem `application/` (**ADR-0006** — cross-módulo só via
`public-api/`). Os 3 módulos já migrados expõem um port de ETL na public-api; `budget-plans` não tem.

## Escopo (in)

`src/modules/budget-plans/public-api/etl.ts`:

- `buildBudgetPlansEtlPort({ connectionString }) → Result<BudgetPlansEtlPort, BuildError>`
- Boot-scoped: abre o pool **uma vez**, devolve `close()`. **Nunca** abrir pool por operação —
  causa estrutural do incidente `handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`.
- Operações de escrita por entidade (plano, budget, cost center, categoria, subcategoria, lançamento),
  cada uma devolvendo `Result` e sinalizando **`already-exists`** quando o `legacy_id` já está gravado
  — é o que alimenta o `countAlreadyExists` do reconcile.
- Ordem de gravação respeita as FKs: plano → cost center → categoria → subcategoria → budget →
  lançamento.

## Fora de escopo

- Ler o legado, mapear campo, orquestrar → fatia 3.
- Mudar o domínio de budget-plans. O port **escreve o que o mapper mandar**; a validação de invariante
  de domínio que já existir continua valendo.

## Critérios de aceite

- **CA1** — `buildBudgetPlansEtlPort` abre o pool 1× e `close()` o encerra (teste conta aberturas).
- **CA2** — Gravar entidade nova → `ok`, linha no banco com `legacy_id` preenchido.
- **CA3** — Gravar a MESMA entidade (mesmo `legacy_id`) 2× → 2ª devolve **`already-exists`**, sem
  duplicar e **sem** erro de UNIQUE vazando.
- **CA4** — Nenhum import de `budget-plans/domain/` ou `application/` a partir de `scripts/etl/`
  (grep limpo — ADR-0006).
- **CA5** — Erro de conexão → `Result` err com slug kebab EN, nunca `throw` cruzando a borda.

## DoD

Gate W3 verde + os 5 CAs + integração contra MySQL local.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — idempotência (CA3) + pool 1× (CA1) |
| W1 | `ports-and-adapters` (par `drizzle-orm-expert`) | port + repo drizzle |
| W2 | `code-reviewer` | audit read-only (foco: ADR-0006, pool) |
| W3 | `ts-quality-checker` | gate + integração MySQL |
