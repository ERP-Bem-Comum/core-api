# W1 — GREEN — FINANCIERS-HTTP-V1

> Skill: `ports-and-adapters`. CRUD de Financiadores (fatia única) espelhando o épico de Fornecedores.

## Arquivos criados
- `public-api/permissions.ts` (M) — FINANCIER_PERMISSION.
- `application/ports/financier-reader.ts`; `adapters/persistence/repos/financier-reader.{in-memory,drizzle}.ts`.
- `application/use-cases/list-financiers.ts` (M) — FinancierListFilter + financierMatchesFilter (search/active).
- `adapters/http/financier-{schemas,dto,list-query,plugin}.ts`.

## Arquivos editados
- `adapters/http/composition.ts` — financier reader + writer repo + use cases (register/deactivate/reactivate) + getFinancierById/listFinancierRecords + PartnersSeed.financiers.
- `public-api/http.ts` — exporta financiersHttpPlugin + FINANCIER_PERMISSION.
- `src/server.ts` — registra financiersHttpPlugin sob /api/v1.
- `tests/.../financiers.routes.test.ts` — describe reads passou a usar `seed.financiers` (read-after-write em memory é store distinto; reflexão real só no smoke MySQL); lint `ReadonlyArray`→`readonly[]`.

## Saída literal do gate (encadeado, exit 0)
```
$ tsc --noEmit / prettier --check / eslint  → todos verdes
ℹ tests 2073 · pass 2056 · fail 0 · skipped 17
```
Teste financier isolado: 8 · pass 8 · fail 0.
→ GREEN: zero regressão (2056 = 2048 + 8 novos).

## Próximo passo
W2 (REVIEW).
