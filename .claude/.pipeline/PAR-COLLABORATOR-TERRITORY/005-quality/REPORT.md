# W3 — Quality Gate (GREEN) · PAR-COLLABORATOR-TERRITORY (US3)

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm run lint` | ✅ 0 problemas |
| `pnpm test` | ✅ **2711 tests · 2693 pass · 0 fail · 18 skipped** |

## Cobertura nova (US3)
- `domain/collaborator/territory.test.ts` — VO (UF válida/null/inválida).
- `adapters/http/collaborators-territory.routes.test.ts` — POST 201, detalhe (seed) retorna território, uf inválida → 422, + preservação em deactivate (CA4).

## Integração
`test:integration:partners` para exercitar a migration `0012` no MySQL real.
