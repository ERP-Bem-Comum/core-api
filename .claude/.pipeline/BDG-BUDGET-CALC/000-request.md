# BDG-BUDGET-CALC — escopo

> Issue **#317** (US3 · Plano Orçamentário, fatia 3/6). Módulo **`budget-plans`**. Size **L** (coração do módulo).
> Spec: `specs/030-budget-plans-reproducao/spec.md` · **Gated pós-#246**. Portar de `../../ERP-BACKEND/budgets` + `budget-results`.

## Escopo (in)

1. **Orçamento** por **Rede** (Estado|Município): `budgets` — `POST`/`GET`/`GET :id`/`DELETE`.
2. **4 modelos de cálculo** como **funções puras** (discriminated union `CalcModel`), em **centavos**, paridade 1:1 com o legado (Apêndice B):
   - `DESPESAS_PESSOAIS` (folha) · `IPCA` · `CAED` (qtd×unitário) · `DESPESAS_LOGISTICAS` (viagem).
3. **`budget-results`**: `POST /budget-results/{ipca,caed,personal-expenses,logistics-expenses}` + `GET` por budget/categoria/subcategoria/ano-anterior.

## ⚠️ Clarification (resolver ANTES do W1)
Na folha (`DESPESAS_PESSOAIS`) a UI mostra "Qtd de {subcategoria}" mas a fórmula legada **NÃO multiplica por quantidade** (qtd é metadado). Confirmar com P.O./legado — decide o contrato de cálculo.

## Fora de escopo
- Consolidado/CSV (#319); insights (#318).

## Critérios de aceite
- **CA1** cada modelo: função pura calcula em centavos batendo com o legado (teste de paridade por modelo).
- **CA2** `POST /budget-results/{modelo}` persiste o resultado; modelo ≠ `launchType` da subcategoria → `calc-model-mismatch` (`400`).
- **CA3** `GET` por budget/categoria/subcategoria/ano-anterior → alimenta "Calculando Gastos".
- **CA4** `DELETE /budgets/:id` remove orçamento e resultados dependentes.

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (paridade dos 4 modelos CA1 + mismatch CA2) | skill **`tdd-strategist`** |
| W1 | funções puras + tipos + persistência + borda | skill **`ts-domain-modeler`** + agente **`typescript-language-expert`** (union dos 4) + **`fastify`**↔**`zod-expert`** |
| W2 | audit (complexidade do cálculo + borda) | skill **`clean-code-reviewer`** + agente **`zod-expert`** |
| W3 | gate + `test:integration` | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- Apêndice B do `HANDBOOK-plano-orcamentario-mapa.md` (as 4 fórmulas — fonte primária).
- **`Explore`** sobre `../../ERP-BACKEND/budget-results` (implementação legada dos 4 modelos).
- **`acdg-skills`**: funções puras/imutabilidade/VO Money.
- **`WebSearch`/`WebFetch`**: metodologia IPCA/CAED (sanity-check da fórmula; a fonte é o legado, não a web).

## DoD
Gate W3 verde. 4 modelos com paridade legada, orçamento por Rede em centavos. Fecha #317.
