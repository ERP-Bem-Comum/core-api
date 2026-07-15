# BGP-MEMORY-SEED-CATALOG — W1 (implementação até GREEN) — REPORT

> Ticket #330 · par `fastify-server-expert` + `nodejs-runtime-expert` (env/boot). Objetivo: fazer o RED do
> W0 (parser inexistente) ficar GREEN com o mínimo. **Sem migration, sem MySQL** (driver memory). Espelho
> literal de `parseE2eAuthSeed`.

## Arquivos criados / alterados

| Arquivo | Ação | Papel |
| :-- | :-- | :-- |
| `src/modules/budget-plans/adapters/http/e2e-seed.ts` | **criado** | `parseE2eBudgetPlansSeed(env): BudgetPlansSeed \| undefined` — espelho de `auth/adapters/http/e2e-seed.ts`. Guarda dupla (`CORE_API_E2E==='1'` + `BUDGET_PLANS_SEED_JSON`), `JSON.parse` deixa vazar `SyntaxError`, type guards → throw claro. |
| `src/modules/budget-plans/public-api/http.ts` | alterado (+1) | Re-exporta `parseE2eBudgetPlansSeed` (ADR-0006: o `server.ts` importa da public-api). Espelha `auth/public-api/http.ts:16`. |
| `src/server.ts` | alterado | Import via public-api; `const budgetPlansSeed = parseE2eBudgetPlansSeed(process.env)`; ramo memory recebe `...(budgetPlansSeed !== undefined ? { seed: budgetPlansSeed } : {})`; ramo mysql inalterado. |

Test files do W0 **não tocados**.

## Decisões (espelho do molde AUTH)

- **Guarda dupla (CA4):** `CORE_API_E2E !== '1'` → `undefined`; `raw` ausente/`''` → `undefined`. Inerte em
  produção — seed jamais lido, catálogo memory nasce vazio (comportamento real de prod).
- **Boot fail em malformado (CA3):** `JSON.parse` deixa vazar `SyntaxError`; shape inválido → `throw` (mensagem
  casa `/shape inválido|programs/i`). No `server.ts` o throw propaga para `main().catch` → `process.exit(1)`,
  idêntico ao `parseE2eAuthSeed`.
- **Type guards:** `programs` obrigatório = `{ ref, name, abbreviation, active:boolean }[]`; `partnerStates`/
  `partnerMunicipalities` = `{ ref, name, uf }[]` se presentes; `plans?`/`budgetsExisting?`/`subcategoryLaunchTypes?`
  validados minimamente. `import type { BudgetPlansSeed }` de `./composition.ts`.

## Prova do GREEN

```
# 15 testes alvo (unit parser CA3/CA4/válido + HTTP CA1/CA2):
ℹ tests 15 · pass 15 · fail 0

$ pnpm run typecheck   → tsc --noEmit (sem saída; TS2307 do W0 sumiu)
$ pnpm run lint        → eslint . (sem saída; 22 cascatas no-unsafe do W0 sumiram)
$ pnpm run format:check → All matched files use Prettier code style!
$ pnpm test            → tests 4050 · pass 4031 · fail 0 · skipped 19
```

0 fail. O RED do W0 virou GREEN. 19 skips integração gated (alheios). Testes do #377 (uncommitted na worktree)
seguem verdes.

## Mapa CA → verde

| CA | Onde | Status |
| :-- | :-- | :-- |
| **CA1** POST 201 no memory com seed | `seed-catalog.routes.test.ts` | ✔ |
| **CA2** GET /options mostra programa + redes | `seed-catalog.routes.test.ts` | ✔ |
| **CA3** boot fail em malformado | `e2e-seed.test.ts` + propaga no `server.ts` | ✔ |
| **CA4** guarda dupla / inerte em produção | `e2e-seed.test.ts` | ✔ |

## O que o W2 deve auditar

1. **Guarda dupla (CA4):** `undefined` sempre que `CORE_API_E2E !== '1'` OU `BUDGET_PLANS_SEED_JSON` ausente/vazio.
2. **Boot fail (CA3):** `SyntaxError` não capturado (vaza); shape inválido → throw; no `server.ts` propaga → exit.
3. **Cross-módulo via public-api (ADR-0006):** `server.ts` importa de `budget-plans/public-api/http.ts`, não do
   adapter direto.
4. **Ramo mysql intocado:** só o memory consome o seed; nenhuma mudança de composition/InMemory.
5. Sintaxe TS: `import type`/`.ts`; sem citar ticket; docstring só de "porquê".

> Fora de escopo: promover a coleção Bruno (CA4 do 000-request) — follow-up (`.bru` + `bruno-all.sh`).
