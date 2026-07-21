# BGP-READ-PORT — W0 (RED)

> Skill: `tdd-strategist`. Fatia 1/3 de `REPORTS-REALIZED-VS-PLANNED`. **Nenhuma linha de `src/`
> tocada** — verificado pelo orquestrador (`git status`: só o teste novo + o registro no runner).

## Arquivos

| Arquivo | O quê |
| :-- | :-- |
| `tests/modules/budget-plans/public-api/budget-plans-read-port.integration.test.ts` | **novo** — 2 camadas: estrutural (3, sempre roda) + integração gated (14) |
| `scripts/ci/test-integration.ts` | registro no grupo `budget-plans` |

## Decisão de contrato travada: saída **PLANA** (confirmada após ler o ticket pai)

Uma linha por `(subcategoria, mês)`, com os 3 níveis desnormalizados:

```ts
{ budgetPlanId, costCenterId, costCenterName, categoryId, categoryName,
  subcategoryId, subcategoryName, month, plannedCents }
```

**Por quê (4 razões, todas do ticket pai):**
1. O pai costura **3 medidas** e só depois monta a árvore — devolver árvore obrigaria a desmontá-la.
2. O realizado vem por `(budgetPlanRef, categoryRef, mês)` — grão plano. Casar plano com plano é `Map`
   por chave; casar árvore com plano é walk recursivo.
3. **CA7b** ("Sem orçamento previsto") exige **acrescentar** linhas ao resultado — trivial em lista,
   invasivo em árvore imutável.
4. O CSV do legado (5.040 linhas = 420 nós × 12 meses) **já é** essa forma achatada — o W3 compara
   lista com lista.

**Acréscimo ao proposto:** `budgetPlanId` na linha. Sem filtro de plano a consulta cruza planos, e o
contrato do legado carrega `budgetPlanId` no nível de centro de custo.

### Outras decisões travadas

- **Grade de 12 meses materializada pelo port** (CA3): sempre 12 linhas por subcategoria **do plano**,
  com `plannedCents = 0` nos meses sem lançamento — e a subcategoria aparece mesmo **sem nenhum**
  lançamento. A árvore vem do **plano**, não do `bgp_budget_results` (CA7 do pai). É `LEFT JOIN` da
  estrutura × calendário, nunca `GROUP BY` só dos resultados.
- **`plannedCents` SOMA as Redes**: um plano tem N `bgp_budgets` (Redes) e a árvore do relatório não
  tem essa dimensão → `SUM(value_cents)` por `(subcategoria, mês)`; o filtro estado/município
  restringe **quais** budgets entram na soma.
- **Ordenação** `month` 1..12 asseverada com `deepEqual` — determinismo é barato no SQL e caro no consumidor.

## Assinatura que o W1 deve implementar

```ts
listPlannedAmounts(filter: {
  programRef?, budgetPlanId?, year?, partnerStateRef?, partnerMunicipalityRef?
}) => Promise<Result<readonly PlannedAmountRow[], BudgetPlansReadError>>
close(): Promise<void>

buildBudgetPlansReadPort({ connectionString }) => Promise<Result<BudgetPlansReadPort, BuildError>>
```
Erros: kebab EN com prefixo `budget-plans-` (o teste casa `/^budget-plans-[a-z-]+$/`). Filtros
opcionais montados com spread condicional (`exactOptionalPropertyTypes`). Filtros são **AND**
(teste explícito: plano de 2046 + `year: 2047` → `[]`).

## Mapa CA → asserção (17 testes)

- **CA1** pool 1× (3 leituras reusam) · após `close()` → `Result` err, não abre pool novo.
- **CA2** os 3 níveis com `id`/`name` · escopo por plano (nó de outro plano não vaza) · subcategoria
  **sem nenhum** lançamento vem com 12 linhas zeradas.
- **CA3** grade de 12 (lançamento em 3 e 7 → 12 linhas, meses `[1..12]`, 10 zerados) · **soma das
  Redes** (estado 200 + município 50 → 250) · unicidade `(sub, mês)` (2 subs × 12 = 24 linhas).
- **CA4** ano · programa · estado (700 de 1.000) · município (300) · **AND combinado** (coerente →
  111,00; contraditório → `[]`) · sem filtro (2×2×12 = 48).
- **CA5** conn malformada → `Result` err kebab, sem `throw` (**estrutural, sem DB**).
- **CA6** linha é objeto plano (protótipo `Object`/`null`, valores `string|number`) · **fronteira
  ADR-0006**: o fonte de `read.ts` não casa `/from '\.\.\/domain\//` (estrutural, lê o fonte).
- **CA7** regressão zero.

## Prova do RED (verificada pelo orquestrador)

| | Baseline | Com a suíte |
| :-- | :-- | :-- |
| tests | 4246 | 4247 |
| pass | **4227** | **4227** (idêntico) |
| fail | 0 | **1** |
| skipped | 19 | 19 |

RED pelo motivo certo: `ERR_MODULE_NOT_FOUND` de
`src/modules/budget-plans/public-api/read.ts` — o módulo não existe, o import de topo não resolve.
Pass do arquivo = **0**: nenhuma asserção passou por acidente.

`typecheck` e `lint` (120 erros `no-unsafe-*`) vermelhos **pela mesma causa única**, todos no arquivo
novo — filtrando-o, zero erro no resto do repo. O W1 devolve os três ao verde sem tocar no teste.

## Notas para o W1

1. **Query:** `LEFT JOIN` da estrutura (`plans → cost_centers → categories → subcategories`) ×
   calendário 1..12, `LEFT JOIN bgp_budget_results ON (subcategory_id, month)` com
   `SUM(COALESCE(value_cents, 0))`. Calendário via `UNION ALL` de 12 literais ou CTE recursiva (ambos
   permitidos, ADR-0020). **Não** criar tabela de calendário.
2. **⚠️ O filtro de Rede entra no `ON` do LEFT JOIN, não no `WHERE`** — no `WHERE` ele apaga as linhas
   zeradas e mata o CA3.
3. `bgp_budget_results` **não tem FK** para budgets/subcategories (D1 do #317) — join por identidade.
4. Índices a aproveitar: `bgp_budget_results_budget_subcategory_month_uq` (prefixo `budget_id`) e
   `bgp_budget_results_subcategory_id_idx`. `EXPLAIN` no W3.
5. `applyMigrations: false` — leitura pura (molde `programs`/`partners`).
6. Erros: reusar `BudgetPlansMysqlDriverError` + um slug de leitura (ex.: `budget-plans-read-query-failed`).
7. **O port NÃO filtra por status nem escolhe versão vigente** — quem escolhe o plano é o consumidor,
   via `budgetPlanId`. Se o W1 achar necessário, **é escopo novo** → issue, não decidir no ticket.
8. Só `bgp_*` (ADR-0014). `partnerStateRef`/`partnerMunicipalityRef` chegam como **ref opaco**.

## Próximo passo
W1 (GREEN) — `ports-and-adapters` + par `drizzle-orm-expert`.
