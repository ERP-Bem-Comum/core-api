# W3 — Quality Gate (GREEN) · PAR-PARTNER-BANK-PIX (US1)

**Outcome:** GREEN · agente: ts-quality-checker

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ 0 erros |
| `pnpm run format:check` (`prettier --check .`) | ✅ All matched files use Prettier code style |
| `pnpm run lint` (`eslint .`) | ✅ 0 problemas |
| `pnpm test` (suite completa) | ✅ **2689 tests · 2671 pass · 0 fail · 18 skipped** (integração gated por env) |

## Cobertura nova (US1)
- `tests/modules/partners/domain/shared/payment-target-agency.test.ts` — regex de agency (4 díg + DV) + `invalid-bank-agency`.
- `tests/modules/partners/adapters/http/financiers-bank-pix.routes.test.ts` — POST 201, GET retorna banco/PIX (seed), agency inválida → 422, opcional → 201.
- `tests/modules/partners/adapters/http/collaborators-bank-pix.routes.test.ts` — idem para Collaborator.

## Regressão zero
Suite inteira verde (incl. supplier/act/financier/collaborator + contracts/contractor-composition que reusa o VO promovido). Integração MySQL real (`test:integration:partners`) recomendada antes do merge para exercitar a migration `0010` + checks de bloco.
