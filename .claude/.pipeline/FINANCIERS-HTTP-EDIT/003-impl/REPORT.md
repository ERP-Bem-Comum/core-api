# W1 — GREEN — FINANCIERS-HTTP-EDIT

> Skill: `ports-and-adapters` (+ domínio). Piloto de edição (PUT) com RBAC elevado p/ campo vital.

## Arquivos criados
- `domain/financier/financier.ts` (M) — `edit(financier, input, at)` (valida 6 campos + cnpj; preserva id+estado).
- `domain/financier/events.ts` (M) — `FinancierEdited`; `types.ts` (M) — `EditFinancierInput`.
- `application/use-cases/edit-financier.ts` — regra do vital (cnpj mudou + !canEditSensitive → sensitive-forbidden; re-checa duplicate).
- `auth/adapters/http/auth-hook.ts` (M) — `makeHasPermission` (checagem consultável, boolean).

## Arquivos editados
- `auth/adapters/http/composition.ts` — `AuthHttpDeps.hasPermission`; `auth/public-api/http.ts` — export `makeHasPermission`.
- `partners/adapters/http/financier-schemas.ts` — `updateFinancierBodySchema` (= create).
- `partners/adapters/http/composition.ts` — expõe `editFinancier`.
- `partners/adapters/http/financier-plugin.ts` — `FinanciersHttpHooks.hasPermission`; `PUT /:id` (canEditSensitive via hasPermission); FORBIDDEN_CODES → 403.
- `src/server.ts` — passa `authDeps.hasPermission` ao financiersHttpPlugin.
- `tests/.../financiers.routes.test.ts` — makeApp passa `hasPermission` (hook agora obrigatório).

## Decisões
- **Regra do vital no use case** (não na borda): usa o financier do writer (findById) — evita inconsistência reader/writer do driver memory. Borda só fornece `canEditSensitive`.
- `makeHasPermission` reusável: espelha `makeAuthorize` mas retorna boolean (nega por padrão).
- PUT total (substituição); preserva estado de soft-delete.

## Saída literal do gate (encadeado, exit 0)
```
$ tsc --noEmit / prettier / eslint → verdes
ℹ tests 2082 · pass 2065 · fail 0 · skipped 17
```
Teste edit isolado: 9 · pass 9 · fail 0.
→ GREEN: zero regressão (2065 = 2056 + 9 novos).

## Próximo passo
W2 (REVIEW).
