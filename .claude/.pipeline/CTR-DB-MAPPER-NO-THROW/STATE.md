# Estado do Ticket CTR-DB-MAPPER-NO-THROW

> Substituir 4 `throw new Error(...)` em `default` exaustivo por `return _exhaustive;` nos mappers Drizzle.
> Warm-up da sequência de tickets pós-audit `handbook/reviews/0002-...` (§H2, §3).

## ⚠️ Skills obrigatórias

- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md)
- 📚 [`clean-code-theorist`](../../skills/clean-code-theorist/SKILL.md)

## Waves

| Wave | Status | REPORT |
| :--- | :--- | :--- |
| W0 — baseline RED + grep dos throws | ✅ completed | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — patch dos 4 defaults | ✅ completed | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — review read-only | ✅ completed (APPROVED) | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — quality gate | ✅ completed | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- 2026-05-18: Ticket aberto e concluído em 1 sessão (W0→W3 fechados, 1 round em W2 — APPROVED).
- **Antes:** 4 `throw new Error` em `default` exaustivo (violação Anti-padrão #7 do `CLAUDE.md`).
- **Depois:** 0 `throw` no diretório `src/modules/contracts/adapters/persistence/mappers/`. Forma canônica `default: { const _exhaustive: never = X; return _exhaustive; }` aplicada 4×.
- Gates W3: `pnpm run typecheck` ✅ · `pnpm run format:check` ✅ · `pnpm test` ✅ (433 pass / 0 fail / 11 skipped — skipped = MySQL integration guard, pré-existente).
- Sequência completa do audit a executar **após** este ticket: `CTR-DB-DRIVER-POOL-TUNING` → `CTR-DB-REPO-LIST-N1` → `CTR-DB-SCHEMA-HARDENING`.

## Arquivos afetados

- `src/modules/contracts/adapters/persistence/mappers/period.mapper.ts` (2 trechos)
- `src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts` (2 trechos)
