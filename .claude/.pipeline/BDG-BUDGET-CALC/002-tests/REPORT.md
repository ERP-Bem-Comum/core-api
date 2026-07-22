# W0 — RED · BDG-BUDGET-CALC (#317)

**Skill:** `tdd-strategist` · **Runner:** node:test + `--experimental-strip-types`

## Escopo do RED (núcleo de domínio puro)

`tests/modules/budget-plans/domain/budget-result/calc-model.test.ts` — exercita a API ainda
inexistente `#src/modules/budget-plans/domain/budget-result/calc-model.ts`:

- **CA1 — paridade das 4 fórmulas** (valores calculados à mão a partir do legado, ver `001-research/LEGACY-FORMULAS.md`):
  - `IPCA` → 104500 · `CAED` → 150000 · `DESPESAS_PESSOAIS` → 658400 · `DESPESAS_LOGISTICAS` → 972000.
  - **arredondamento**: `151.5 → 152` (trava `Math.round`, política de paridade com o `bigint` do MySQL).
  - **qtd é metadado**: `numberOfFinancialDirectors` **não** entra no input de cálculo (folha).
- **CA2 — `calc-model-mismatch`**: guard puro `ensureMatchesLaunchType(input, launchType)` → `Result`.

## Resultado (RED)

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../domain/budget-result/calc-model.ts'
✖ tests 1 · fail 1
```

Falha por **inexistência da API** (RED correto do fail-first). CA2/persistência de aplicação
(use case `add-budget-result`, repos, borda `POST/GET/DELETE /budget-results`) seguem como
incrementos red-green dentro do W1 (precedente da #316: W0 = domínio puro; W1 = domínio + persistência + borda).
