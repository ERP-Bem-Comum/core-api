# W3 — Gate de qualidade (FIN-CREATE-CATEG-LISTINGS)

Skill: `ts-quality-checker`.

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✓ verde (`tsc --noEmit`) |
| `pnpm run lint` | ✓ verde (`eslint .`) — corrigido `no-unnecessary-type-conversion` no dto (refs branded atribuídos direto) |
| `pnpm run format:check` | ✓ verde (após `prettier --write` no snapshot 0014 gerado pelo drizzle-kit) |
| `pnpm test` | ✓ **3045 pass / 0 fail / 18 skipped** (integração opt-in) |

Baseline pré-ticket: 3040 pass. Delta: +5 testes (2 use-case + 3 HTTP), 0 regressão.

Integração MySQL (`test:integration:financial`) cobre o mapper drizzle do novo campo + CA3 (back-compat) — execução consolidada ao fim dos tickets de persistência do épico.

**Gate: GREEN.**
