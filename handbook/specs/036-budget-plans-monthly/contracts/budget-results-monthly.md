# Contrato HTTP — Orçamento mensal (#413)

> Fase 1 do `/speckit-plan`. Borda Fastify + Zod (ADR-0025 / ADR-0027).
> **Rotas existentes, verificadas no código** — nenhuma rota nova. A mudança é **um campo no alvo**.

## Resumo

| Rota                                               | Método | Muda?                                        |
| :------------------------------------------------- | :----- | :------------------------------------------- |
| `/budget-plans/budget-results/ipca`                | POST   | ✅ `+month` no body                          |
| `/budget-plans/budget-results/caed`                | POST   | ✅ `+month` no body                          |
| `/budget-plans/budget-results/personal-expenses`   | POST   | ✅ `+month` no body                          |
| `/budget-plans/budget-results/logistics-expenses`  | POST   | ✅ `+month` no body                          |
| `/budget-plans/budget-results/by-budget/:budgetId` | GET    | ✅ `+month` na response · `?month=` opcional |

## A mudança (uma linha, herdada por 4 rotas)

`src/modules/budget-plans/adapters/http/schemas.ts`

```ts
const budgetResultTargetSchema = z.object({
  budgetId: z.uuid(),
  subcategoryId: z.uuid(),
  month: z.int().min(1).max(12).meta({ description: 'Mês do exercício (1..12)' }), // ← NOVO
});

// Herdam sem alteração própria:
export const ipcaBudgetResultBodySchema = budgetResultTargetSchema.extend({
  baseValueInCents,
  ipca,
});
export const caedBudgetResultBodySchema = budgetResultTargetSchema.extend({
  numberOfEnrollments,
  baseValueInCents,
});
export const personalExpensesBudgetResultBodySchema = budgetResultTargetSchema.extend({
  /* folha */
});
export const logisticsExpensesBudgetResultBodySchema = budgetResultTargetSchema.extend({
  /* viagem */
});
```

**`z.int()`, não `z.coerce`:** o body é JSON — o front envia número. Coerção aceitaria `"banana"` → `NaN` e mascararia o erro. Na **query** (`?month=`) usa-se `z.coerce.number().int().min(1).max(12)`, seguindo `listBudgetPlansQuerySchema`.

## POST — escrita (os 4 modelos)

**Request** (exemplo, `ipca`):

```json
{
  "budgetId": "<uuid>",
  "subcategoryId": "<uuid>",
  "month": 3,
  "baseValueInCents": 367092,
  "ipca": 4.5
}
```

**Response 201** — inclui o `month`:

```json
{
  "id": "<uuid>",
  "budgetId": "<uuid>",
  "subcategoryId": "<uuid>",
  "month": 3,
  "model": "IPCA",
  "valueCents": 383611
}
```

**Idempotente por `(budgetId, subcategoryId, month)`:** repetir o POST **atualiza** o valor do mês (o `id` da linha é preservado) — não cria segunda linha. É o que destrava os 4 formulários de "Calculando Gastos", hoje órfãos porque 12 POSTs colidiriam na mesma chave (#454).

**Status:**

| Código | Quando                                                | Slug                                         |
| :----- | :---------------------------------------------------- | :------------------------------------------- |
| `201`  | criado ou atualizado                                  | —                                            |
| `400`  | `month` ausente / não-inteiro / fora de 1..12         | validação Zod (borda)                        |
| `403`  | plano `Aprovado` (FR-006)                             | `budget-plan-not-editable`                   |
| `404`  | budget ou subcategoria inexistente                    | `budget-not-found` · `subcategory-not-found` |
| `422`  | modelo ≠ `launchType` da subcategoria (guard vigente) | `calc-model-mismatch`                        |

> `month` fora de 1..12 é barrado **na borda** (Zod) antes do domínio. O VO `ExerciseMonth` é a segunda linha de defesa (rehydrate de row) e o `CHECK` do banco, a terceira.

## GET — leitura do grid

`GET /budget-plans/budget-results/by-budget/:budgetId`

**Response 200:**

```json
{
  "budgetResults": [
    {
      "id": "<uuid>",
      "subcategoryId": "<uuid>",
      "month": 1,
      "model": "IPCA",
      "valueCents": 367092
    },
    {
      "id": "<uuid>",
      "subcategoryId": "<uuid>",
      "month": 2,
      "model": "IPCA",
      "valueCents": 367092
    },
    {
      "id": "<uuid>",
      "subcategoryId": "<uuid>",
      "month": 12,
      "model": "IPCA",
      "valueCents": 367092
    }
  ]
}
```

**Sem filtro obrigatório de mês.** O grid é **por rede** (uma de cada vez) → pior caso realista = 158 subcategorias × 12 = **~1.9k itens**. Uma ida traz o ano inteiro e o **passador de mês (US2) é navegação client-side**, sem round-trip. Filtro opcional `?month=` disponível para quem quiser recorte.

**Ausência de linha = mês não orçado** (FR-011). `valueCents: 0` = orçado zero, explicitamente. O front renderiza célula vazia vs. `R$ 0,00`.

**Total anual = soma dos meses** (FR-007) — derivado, nunca armazenado. Quem consome o anual (Por Rede, Consolidado, Planejado do Insight) agrega `SUM(value_cents)`.

## Compatibilidade

**Breaking** — `month` é obrigatório nos 4 POSTs. **Aceito sem versionamento:**

- **Zero dado a preservar:** medido — nenhum plano em dev nem QA, e o módulo sequer persiste em produção (#374). Não há cliente com estado.
- **O front já espera** (#454: _"o mês precisa entrar no contrato, não só no armazenamento"_).
- Versionar (`/v2/budget-results`) seria cerimônia sobre o vazio, e deixaria uma rota morta a limpar.

## Fora deste contrato

- Rotas de `cost-structure`, `budgets`, `budget-plans`, `insights`, `consolidated-result`: **inalteradas**.
- `DELETE /budget-plans/:id` (#453) e editar/desativar estrutura (#454 gap 3): escopo próprio.
