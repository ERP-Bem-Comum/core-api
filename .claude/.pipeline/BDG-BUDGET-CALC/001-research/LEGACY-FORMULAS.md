# BDG-BUDGET-CALC — Paridade das 4 fórmulas (fonte: legado)

> Research W0. Fonte primária: `../../ERP-BACKEND/src/common/utils/calc-total-value-result.ts`
> função `calcTotalValueInCents(releaseType, item)` (linhas 5–59). O "Apêndice B" citado no
> 000-request não existe como arquivo — a fonte de verdade é o código legado transcrito abaixo.
> O legado NÃO tem módulo `budget-results` separado: tudo vive no módulo `budgets`.

## Clarification RESOLVIDA (decide o contrato)

**`DESPESAS_PESSOAIS` NÃO multiplica por quantidade.** O campo `numberOfFinancialDirectors`
(a "Qtd de {subcategoria}" da UI) é **metadado puro**: nunca é lido por `calcTotalValueInCents`
(prova: `calc-total-value-result.ts:39` sem fator; grep sem uso no cálculo; em `import-excel`
sempre hard-coded `= 1`). → o core-api **não** multiplica a folha por quantidade.

## Política de arredondamento (decisão de design)

Legado calcula em `float` e grava em coluna `bigint valueInCents` → MySQL arredonda para o inteiro
mais próximo na inserção (não há `Math.round`/`toFixed` em nenhuma das fórmulas — grep zero).
Como `Money` no core-api exige centavos inteiros, aplicamos **`Math.round(resultadoFloat)`** ao
converter para `Money`. Valores são custos positivos → round-half-up (JS) ≡ round-half-away-from-zero
(MySQL). **Invariante de paridade** — documentar no código.

## As 4 fórmulas (centavos)

### IPCA — `calc-total-value-result.ts:10-11`
```
baseValueInCents * (ipca / 100) + baseValueInCents   ≡  baseValueInCents * (1 + ipca/100)
```
Inputs: `baseValueInCents` (int centavos), `ipca` (percentual, ex. 4.5). `justification?` = metadado.

### CAED — `calc-total-value-result.ts:13-14`
```
numberOfEnrollments * baseValueInCents
```
Inputs: `numberOfEnrollments` (contagem int), `baseValueInCents` (unitário centavos). Produto inteiro.

### DESPESAS_PESSOAIS — `calc-total-value-result.ts:16-39`
```
totalSalary    = salaryInCents * (1 + salaryAdjustment/100)
totalCharges   = totalSalary * (inssEmployer + inss + fgtsCharges + pisCharges)/100
totalBenefits  = foodVoucherInCents + transportationVouchersInCents + healthInsuranceInCents + lifeInsuranceInCents
totalProvisions= holidaysAndChargesInCents + allowanceInCents + thirteenthInCents + fgtsInCents
resultado      = totalSalary + totalCharges + totalBenefits + totalProvisions
```
Percentuais: `salaryAdjustment`, `inssEmployer`, `inss`, `fgtsCharges`, `pisCharges`.
Demais campos já em centavos. `numberOfFinancialDirectors` = metadado (ver acima).

### DESPESAS_LOGISTICAS — `calc-total-value-result.ts:40-55`
```
totalTripsOfPeople       = numberOfPeople * totalTrips
totalAirfareInCents      = totalTripsOfPeople * airfareInCents                          # passagem: SEM diária
totalAccommodationInCents= totalTripsOfPeople * dailyAccommodation * accommodationInCents
totalExpenses            = totalTripsOfPeople * dailyFood      * foodInCents
                         + totalTripsOfPeople * dailyTransport * transportInCents
                         + totalTripsOfPeople * dailyCarAndFuel* carAndFuelInCents
resultado                = totalAirfareInCents + totalAccommodationInCents + totalExpenses
```
⚠️ Paridade: **passagem** multiplica só por `totalTripsOfPeople`; hospedagem/alimentação/transporte/
carro multiplicam **também** pela respectiva diária (`daily*`).
⚠️ 2ª cópia da mesma matemática (para o GET de relatório): `budget-results.service.ts:149-174` — manter em paridade.

## Endpoints legados (base `budget-results`)

| Rota | releaseType injetado no controller | Request | Response |
| --- | --- | --- | --- |
| `POST /budget-results/ipca` | IPCA | `{ budgetId, costCenterSubCategoryId, months[1..12] }` + campos do modelo | 201 void |
| `POST /budget-results/caed` | CAED | idem | 201 void |
| `POST /budget-results/personal-expenses` | DESPESAS_PESSOAIS | idem | 201 void |
| `POST /budget-results/logistics-expenses` | DESPESAS_LOGISTICAS | idem | 201 void |
| `GET /budget-results/logistics-expenses/:budgetId/:categoryId` | — | — | `{ totalExpensesInCents, totalAirfareInCents, totalAccommodationInCents }` |
| `GET /budget-results/all-by-budget-and-sub-category/:budgetId/:subCategoryId` | — | — | `{ budgetResults[] }` |
| `GET /budget-results/all-last-year/:budgetId/:subCategoryId` | — | — | ano anterior; casa subcategoria por nome+categoria |
| `DELETE /budget-results/:id` | — | — | void |

`releaseType` NÃO vem do body — é setado pela rota. No core-api, `model` deve validar contra o
`launchType` da subcategoria alvo → `calc-model-mismatch` (400) se divergir (CA2).
Agregações legadas = `SUM(valueInCents)` filtrando `active = TRUE`, sem rounding.
