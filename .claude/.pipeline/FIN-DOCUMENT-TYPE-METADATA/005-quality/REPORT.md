# Quality Check — FIN-DOCUMENT-TYPE-METADATA

**Skill:** ts-quality-checker · **Data:** 2026-06-30T23:14Z · **Veredito:** ✅ ALL GREEN

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | `tsc --noEmit` | ✅ | 0 erros |
| 2 | `prettier --check .` | ✅ | All matched files use Prettier code style! |
| 3 | `eslint .` | ✅ | exit 0 |
| 4 | `pnpm test` | ✅ | 3314 · 3296 pass · **0 fail** · 18 skip |

Baseline pré-ticket = 3305; +9 = catálogo domínio (7) + rota (2). Zero regressão (refatoração da
fonte única no agregado validada). DoD #292 atendido: catálogo dos 7 tipos exposto read-only sob
`reference:read`, sem migration, sem divergência de `ALLOWED_RETENTIONS` (CA7 por construção).
