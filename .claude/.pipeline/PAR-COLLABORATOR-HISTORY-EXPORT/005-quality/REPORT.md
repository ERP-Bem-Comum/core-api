# W3 — Quality Gate (GREEN) · PAR-COLLABORATOR-HISTORY-EXPORT (US4)

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm run lint` | ✅ GREEN (exit 0) |
| `pnpm test` | ✅ **2719 tests · 2701 pass · 0 fail · 18 skipped** |

## Cobertura nova (US4)
- `domain/collaborator/collaborator-history.test.ts` — `diffCollaborator` (CA1, sem-mudança, multi-campo).
- `adapters/export/collaborator-history-csv.test.ts` — cabeçalho legado, `;`, dd/MM/aaaa, `programa` vazia, quoting de `;`.
- `adapters/http/collaborators-history.routes.test.ts` — captura (PUT→export reflete), CA2 (200 CSV), CA3 (503).
- `shared/utils/csv.test.ts` — confirma `separator` parametrizável sem regressão (default `,`).

## Integração
`test:integration:partners` para exercitar a migration `0013` (par_collaborator_history) no MySQL real.
