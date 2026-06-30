# W3 — Quality Gate (GREEN) · PAR-COLLABORATOR-PROFILE-FIELDS (US2)

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm run lint` | ✅ 0 problemas |
| `pnpm test` | ✅ **2704 tests · 2686 pass · 0 fail · 18 skipped** |

## Cobertura nova (US2)
- `domain/collaborator/sex.test.ts`, `civil-status.test.ts` — VOs.
- `domain/collaborator/collaborator-fields.test.ts` — completeRegistration com os 12 campos + coerência filhos.
- `adapters/http/collaborators-fields.routes.test.ts` — PATCH 200, detalhe (seed) retorna campos, sex/maritalStatus inválidos → 422.

## Integração
`test:integration:partners` recomendada/disparada para exercitar a migration `0011` no MySQL real (collaborator-repository.drizzle).
