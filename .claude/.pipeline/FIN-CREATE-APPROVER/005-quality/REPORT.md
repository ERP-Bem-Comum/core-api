# W3 — Gate de qualidade (FIN-CREATE-APPROVER)

Skill: `ts-quality-checker`.

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✓ verde |
| `pnpm run lint` | ✓ verde |
| `pnpm run format:check` | ✓ verde (após `prettier --write` no snapshot 0016) |
| `pnpm test` | ✓ **3053 pass / 0 fail / 18 skipped** |

Baseline pré-ticket: 3050. Delta: +3 (HTTP), 0 regressão.

**Gate: GREEN.**
