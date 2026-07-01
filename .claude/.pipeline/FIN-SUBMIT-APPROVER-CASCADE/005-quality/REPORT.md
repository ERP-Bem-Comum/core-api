# W3 — GREEN (gate final) · FIN-SUBMIT-APPROVER-CASCADE

Skill: **`ts-quality-checker`**. Política de regressão zero: tudo verde.

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" (após `--write` no import de `submit-draft.ts`) |
| `pnpm run lint` | ✅ sem erros |
| `pnpm test` | ✅ **3299 pass · 0 fail · 18 skipped** · 978 suites · ~89s |

18 skipped = integração atrás do opt-in `MYSQL_INTEGRATION`.

## Nota de processo

`format:check` pegou a linha de import de `submit-draft.ts` (multi-line após adicionar `escalate`); `prettier --write` normalizou antes do gate — mesma lição [[prettier-hook-reformats-after-commit]].

## DoD

Submit Draft→Open encaminha ao próximo aprovador apto com `ApproverEscalated`, em paridade com o create (028/PR #296); regressão zero no create (cluster 29/29). 3 CAs cobertos. **Fecha #297.**
