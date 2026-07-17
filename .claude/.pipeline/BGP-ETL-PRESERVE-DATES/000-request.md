# BGP-ETL-PRESERVE-DATES — escopo (bug: ETL carimba data da migração no lugar da data do legado)

> Size **S**. Defeito encontrado em produção após o ETL de Orçamento: a coluna "Última Alteração" da
> tela mostra o horário da **migração** (17/07 21:00), não a data real do legado.

## Problema

O `budget-plans-etl-store.drizzle.ts` grava `createdAt/updatedAt` do plano com `clock.now()` (horário
da migração), em vez das datas do legado. Divergência **implementação × mapa**: o
[`ETL-BUDGET-PLANS/000-request.md`](../ETL-BUDGET-PLANS/000-request.md) especifica
`createdAt/updatedAt → direto` (migrar do legado). O W1 copiou o molde do `partners` (que carimba
clock) sem seguir essa linha do mapa.

O `updatedBy` (autor) migrou certo (Bruno/Eduardo aparecem); só a data companheira ficou errada.

## Causa-raiz

- `BudgetPlanEtlInput` **não** carrega `createdAt/updatedAt` → o store não tem de onde tirar → usa `now`.
- O reader **já lê** `bp.createdAt`/`bp.updatedAt` (reader.ts:63-64) e o `LegacyBudgetPlanRow` já os
  tem (mapper.ts:30-31) — o dado existe, o mapper só não o propaga ao `input`.
- **Só `bgp_budget_plans`** tem essas colunas; as outras 5 tabelas `bgp_*` não têm `createdAt/updatedAt`
  no schema-alvo → escopo restrito ao plano.

## Escopo (in)

1. `application/ports/legacy-entity-store.ts` — `+ createdAt: Date; updatedAt: Date` no `BudgetPlanEtlInput`.
2. `scripts/etl/budget-plans/mapper.ts` — `mapBudgetPlanRow` propaga `row.createdAt`/`row.updatedAt` ao `input`.
3. `adapters/persistence/repos/budget-plans-etl-store.drizzle.ts` — grava `input.createdAt`/`input.updatedAt`;
   remove `clock`/`now` (fica morto — só servia p/ isso), incluindo o param `clock` e o import.
4. `public-api/etl.ts` — remove o `ClockReal()` passado ao store (e o import se ficar órfão).

## Fora de escopo

Migration (as colunas já existem). Outras entidades (não têm as colunas). Re-executar o ETL na
produção — ver §Reversão.

## Critérios de aceite

- **CA1** — `mapBudgetPlanRow` propaga: `input.createdAt === row.createdAt` e `input.updatedAt === row.updatedAt`.
- **CA2** — O store grava as datas do input (integração), não `now`.
- **CA3** — Idempotência preservada: 2ª rodada segue `already-exists` (skip, não sobrescreve).
- **CA4** — Sem regressão: gate W3 verde.

## Reversão / re-aplicação em produção

O dado já migrado tem a data errada. Como o ETL é **skip-by-legacy_id** (não sobrescreve no re-run),
rodar de novo **não corrige** as linhas existentes. Para corrigir a produção, a infra: (a) `UPDATE`
pontual das 5 linhas com a data do legado, OU (b) `TRUNCATE bgp_*` + re-rodar o ETL corrigido (as
`bgp_*` são greenfield; a soma/contagem já foi validada). Documentar no runbook.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | inline | RED — teste do mapper (CA1) |
| W1 | inline | fix input + mapper + store + public-api |
| W3 | inline | gate |
