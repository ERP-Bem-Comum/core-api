# BGP-READ-PORT — escopo (fatia 1/3 de `REPORTS-REALIZED-VS-PLANNED`)

> Size **M**. Cria o **read port** (Open Host Service) do `budget-plans`: a árvore do plano + os
> valores planejados por `(nó, mês)`. **Destrava** o Realizado × Planejado e serve os próximos
> relatórios (o Relatório Geral vai precisar da mesma leitura).

## Problema

`budget-plans/public-api/` expõe `etl`, `events`, `http`, `migrate`, `permissions` — **nenhuma leitura
cross-módulo**. O `reports` precisa do orçado e não tem por onde ler sem violar o **ADR-0006**
(cross-módulo só via `public-api/`).

O ADR-0051 já define o papel: o `budget-plans` é **owner da taxonomia do planejável** e serve os
consumidores como **Open Host Service** — só falta a porta existir.

## Escopo (in)

`src/modules/budget-plans/public-api/read.ts` — molde direto dos 4 read ports que já existem
(`programs`, `partners`, `contracts`, `auth`):

```ts
buildBudgetPlansReadPort({ connectionString }) → Result<BudgetPlansReadPort, BuildError>
```

**Boot-scoped:** abre o pool **uma vez**, devolve `close()`. Nunca por requisição — causa estrutural
do incidente `handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`.

### O que o port expõe

1. **A árvore do plano** — centro de custo → categoria → subcategoria, com `id` e `name` em cada
   nível. Escopada por plano (ADR-0051: *"não há taxonomia canônica global"*).
2. **Os valores planejados** por `(subcategoria, mês)` — de `bgp_budget_results.value_cents`.
3. **Filtros:** programa (`programRef`), plano (`budgetPlanId`), ano, e Rede (estado/município via
   `bgp_budgets.partnerKind`/`partnerRef`).

### Forma da saída
Plana ou em árvore — decidir no W0. **Recomendação: plana** (`{ costCenterId, costCenterName,
categoryId, categoryName, subcategoryId, subcategoryName, month, plannedCents }`), deixando a
montagem da árvore para o consumidor. Motivo: o `reports` precisa costurar com o realizado antes de
montar a hierarquia; devolver árvore pronta obrigaria a desmontá-la.

## Fora de escopo
- Leitura do realizado/provisionado (fatia 2, no `financial`).
- A rota e a costura (fatia 3, no `reports`).
- Escrita — o port é **read-only**.
- Mudar o schema `bgp_*` (o dado já existe, migrado no `ETL-BUDGET-PLANS`).

## Critérios de aceite

- **CA1** `buildBudgetPlansReadPort` abre o pool **1×** e `close()` o encerra.
- **CA2** Devolve os nós da árvore do plano com `id`/`name` nos 3 níveis, escopados pelo plano.
- **CA3** Devolve `plannedCents` por `(subcategoria, mês)` — os 12 meses, incluindo os **zerados**
  (o nó existe no plano mesmo sem lançamento; ver CA7 do ticket pai).
- **CA4** Filtros (programa, plano, ano, estado/município) aplicam-se corretamente e são combináveis.
- **CA5** Erro de conexão → `Result` err com slug kebab EN prefixo `budget-plans-`, nunca `throw`
  cruzando a borda.
- **CA6** ADR-0006: o port vive na `public-api`; devolve **plain rows**, nunca agregados de domínio.
- **CA7** Regressão zero: nada do `budget-plans` existente muda.

## Verificação contra dado real

O `ETL-BUDGET-PLANS` migrou **5 planos, 36 centros, 38 categorias, 390 subcategorias, 4.679
lançamentos** — e o export do legado tem **5.040 linhas** (420 nós × 12 meses). O W3 pode conferir a
leitura contra esses números.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — forma da saída, filtros, meses zerados, pool 1× |
| W1 | `ports-and-adapters` (par `drizzle-orm-expert`) | port + query |
| W2 | `code-reviewer` | audit read-only (ADR-0006/0051, pool) |
| W3 | `ts-quality-checker` | gate + integração MySQL |
