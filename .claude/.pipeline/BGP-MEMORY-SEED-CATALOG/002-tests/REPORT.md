# BGP-MEMORY-SEED-CATALOG — W0 (RED) — REPORT

> Ticket #330 · branch `feat/377-330-budget-plans-hardening` · size S · agente `tdd-strategist`.
> Objetivo W0: fixar em RED o contrato do parser de seed (`parseE2eBudgetPlansSeed`, espelho de
> `parseE2eAuthSeed`) e ancorar o caminho feliz local do driver `memory` (#330). **NÃO tocou `src/`.**

## Arquivos criados

| Arquivo | Camada | Papel |
| :-- | :-- | :-- |
| `tests/modules/budget-plans/adapters/http/e2e-seed.test.ts` | unit | **RED principal** — importa `parseE2eBudgetPlansSeed` (inexistente). Guarda dupla (CA4), malformado/shape inválido → throw (CA3), válido → seed. |
| `tests/modules/budget-plans/adapters/http/seed-catalog.routes.test.ts` | HTTP (`fastify.inject`) | **GREEN** — injeta `seed` direto na composition. SEM seed → 404 (sintoma #330); COM seed → 201 RASCUNHO (CA1) + `GET /options` mostra programa/redes (CA2). |

## Mapa CA → teste

| CA | Onde | Asserção |
| :-- | :-- | :-- |
| **CA4** (guarda dupla / inerte em prod) | `e2e-seed.test.ts` | `CORE_API_E2E` ausente → `undefined`; `="0"` → `undefined`; flag ligada sem `BUDGET_PLANS_SEED_JSON` → `undefined`; `=""` → `undefined`. |
| **CA3** (boot fail em malformado) | `e2e-seed.test.ts` | JSON inválido → `SyntaxError`; falta `programs`/`ref`/`abbreviation`/`active` não-boolean → throw claro. |
| **válido** | `e2e-seed.test.ts` | `programs`+`partnerStates`+`partnerMunicipalities` → seed; `programs` só → seed. |
| **CA1** (POST 201) | `seed-catalog.routes.test.ts` | COM seed → `POST /budget-plans` (programRef semeado) → 201 RASCUNHO v1.0; SEM seed → 404. |
| **CA2** (options) | `seed-catalog.routes.test.ts` | COM seed → `GET /budget-plans/options` → programa em `programs`; CE + município em `redes`. |

> CA4 do 000-request (promover coleção Bruno) = follow-up, fora do W0/backend.

## Assinatura EXATA pinada para o W1

`src/modules/budget-plans/adapters/http/e2e-seed.ts` (novo):

```ts
import type { BudgetPlansSeed } from './composition.ts';
export const parseE2eBudgetPlansSeed = (
  env: Readonly<Record<string, string | undefined>>,
): BudgetPlansSeed | undefined
```

Contrato (espelho literal de `parseE2eAuthSeed`): `CORE_API_E2E !== '1'` → `undefined`; `BUDGET_PLANS_SEED_JSON`
ausente/`''` → `undefined`; `JSON.parse` deixa vazar `SyntaxError`; type guard exige `programs[]` de
`{ ref, name, abbreviation, active:boolean }` (+ `partnerStates`/`partnerMunicipalities` de `{ ref, name, uf }` se
presentes; `plans?` opcional); shape inválido → `throw` (mensagem casa `/shape inválido|programs/i`). Re-exportar
via `budget-plans/public-api/http.ts` (o `server.ts` importa `parseE2eAuthSeed` da public-api).

## Saída REAL do RED

```
# unit do parser (RED intencional):
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../e2e-seed.ts' imported from e2e-seed.test.ts
ℹ tests 1 · pass 0 · fail 1

# HTTP seed-catalog (GREEN — composition já aceita seed):
  ✔ SEM seed: POST /budget-plans → 404 program-not-found
  ✔ CA1: COM seed → POST /budget-plans → 201 RASCUNHO v1.0
  ✔ CA2: COM seed → GET /budget-plans/options mostra programa + redes
ℹ tests 3 · pass 3 · fail 0

# suíte completa:
ℹ tests 4039 · pass 4019 · fail 1 · skipped 19
```

**1 fail = exatamente o RED intencional** (`parseE2eBudgetPlansSeed` inexistente). 19 skips alheios (integração
gated). `typecheck` 1 erro (TS2307) + 22 lint `no-unsafe-*` no unit — todas cascatas do MESMO símbolo faltante,
resolvem no W1. O HTTP test é lint/prettier-clean.

## Notas para o W1

- Espelhar `auth/adapters/http/e2e-seed.ts` 1:1 (guardas, `JSON.parse`, type guards, mensagem).
- Re-exportar em `budget-plans/public-api/http.ts`; wire no ramo memory do `server.ts:229-232`:
  `const budgetPlansSeed = parseE2eBudgetPlansSeed(process.env)` → `...(budgetPlansSeed !== undefined ? { seed: budgetPlansSeed } : {})`.
- Ramo mysql: ignora o seed (lê `prg_*`/`par_*` real).
