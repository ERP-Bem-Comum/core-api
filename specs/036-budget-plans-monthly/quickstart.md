# Quickstart — Feature 036: Orçamento mensal (#413)

> Como exercitar a feature de ponta a ponta depois de implementada.

## Pré-requisitos

| Requisito                                                       | Por quê                                                                                                                                     |
| :-------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **`BUDGET_PLANS_DRIVER=mysql` + `BUDGET_PLANS_DATABASE_URL`**   | Sem as duas, o módulo degrada para `memory` **em silêncio** e tudo some no restart (**#374**). É a dependência de **entrega** desta feature |
| Permissões `budget-plan:read` / `budget-plan:write` no ambiente | Sem elas → **403 mudo**. O seed de permissões é one-shot e não roda no deploy                                                               |
| Um `Program` ATIVO                                              | `POST /budget-plans` exige `programRef` válido                                                                                              |

## Fluxo

```bash
# 1. Plano (nasce Rascunho v1.0)
POST /api/v2/budget-plans
{ "year": 2031, "programRef": "<uuid-programa-ativo>" }

# 2. Estrutura de custo (árvore per-plano — já existe, #316)
POST /budget-plans/:id/cost-structure/cost-centers      { "name": "Pessoal", "direction": "A PAGAR" }
POST /budget-plans/:id/cost-structure/categories        { "costCenterId": "...", "name": "Consultoria" }
POST /budget-plans/:id/cost-structure/subcategories     { "categoryId": "...", "name": "Assessoria Jurídica",
                                                          "launchType": "DESPESAS_PESSOAIS" }

# 3. Orçamento por Rede
POST /budget-plans/:id/budgets   { "partnerKind": "state", "partnerRef": "CE" }

# 4. ⭐ Calcular o gasto DE UM MÊS (o que esta feature entrega)
POST /budget-plans/budget-results/personal-expenses
{ "budgetId": "<uuid>", "subcategoryId": "<uuid>", "month": 1, "salaryInCents": 367092, ... }
# → 201 { ..., "month": 1, "valueCents": 367092 }

# 5. Repetir para os 12 meses (mesmos inputs) — cada um é uma linha própria
#    month: 2 … month: 12

# 6. Ler o grid do ano
GET /budget-plans/budget-results/by-budget/:budgetId
# → 12 itens, um por mês
```

## O que provar

| #   | Verificação                                            | Esperado                                                       | FR              |
| :-- | :----------------------------------------------------- | :------------------------------------------------------------- | :-------------- |
| 1   | **Recalcular** o mesmo `(budget, subcategoria, month)` | **atualiza** — segue 1 linha, `id` preservado. **Não** duplica | D2              |
| 2   | Alterar março                                          | fevereiro e abril **intactos**                                 | FR-004          |
| 3   | `month: 0` · `13` · `-1` · `3.5`                       | **400** na borda (Zod)                                         | FR-005          |
| 4   | Plano `Aprovado` → tentar calcular                     | **403** `budget-plan-not-editable`                             | FR-006          |
| 5   | **12 meses × R$ 3.670,92** → total anual               | **R$ 44.051,04** (= ×12) — a prova da P.O. na #454             | SC-005          |
| 6   | Mês sem linha vs `valueCents: 0`                       | distinguíveis: ausência ≠ zero                                 | FR-011          |
| 7   | Anual no "Por Rede" / Consolidado / Insight            | = soma dos 12, sem divergir entre telas                        | FR-007 · SC-002 |
| 8   | **Criar → reiniciar o processo → ler**                 | sobrevive (com o driver correto — #374)                        | SC-001          |

## Teste de paridade (o que não pode regredir)

Os 4 modelos devem continuar reproduzindo a **fórmula** legada (spec 030 `:74`). O que muda é o **grão** (subcategoria × mês), não o cálculo.

> 🔴 **Bloqueia o W1 de `DESPESAS_PESSOAIS`:** a clarification pendente da 030 (`:37` — a UI mostra "Qtd de {subcategoria}" mas a fórmula legada **não multiplica por quantidade**) precisa ser respondida **antes**. Agora o cálculo persiste 12× por conta — divergência de fórmula corrompe dado real, não é mais cosmética. Ver `research.md` §D6.

## Verificação no banco

```sql
-- 12 linhas, uma por mês
SELECT month, model, value_cents FROM bgp_budget_results
 WHERE budget_id = ? AND subcategory_id = ? ORDER BY month;

-- anual derivado (nunca armazenado)
SELECT subcategory_id, SUM(value_cents) AS anual FROM bgp_budget_results
 WHERE budget_id = ? GROUP BY subcategory_id;

-- a chave que impede o dobro (deve existir após a migration)
SHOW INDEX FROM bgp_budget_results WHERE Key_name LIKE '%month_uq';
```

## Ambiente

Validação com MySQL real: **x99** quando online; senão OrbStack local ou QA (`docker compose config --quiet` → `up -d --wait`).
⚠️ `pnpm test:integration:*` **destrói a infra dev** (`down -v`) — usar MySQL avulso ou o QA.
