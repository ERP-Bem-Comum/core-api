# Code Review — CTR-PIPELINE-SUPERSEDE-STATUS — Round 2

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-27
**Escopo revisado:** `scripts/pipeline/{state-schema,state-cli,dashboard,metrics,render-state-md}.ts` + suites `tests/pipeline/*.test.ts`.

---

## Resolução das issues do Round 1

| Issue | Severidade | Status |
| :--- | :--- | :--- |
| #1 `state-cli.ts:323` — array excede printWidth | 🔴 | ✅ Corrigida — `prettier --write` quebrou o array |
| #2 `metrics.test.ts:40` — import excede printWidth | 🔴 | ✅ Corrigida — import quebrado em múltiplas linhas |
| Sug. 1 — `summarize` com `else` catch-all | 🔵 | Mantida como dívida (não exige ação neste ticket) |
| Sug. 2 — auto-referência `--by` == ticket | 🔵 | Mantida como dívida |

## Gate verificado (read-only)

```
pnpm run typecheck                       → limpo
pnpm run format:check                    → All matched files use Prettier code style!
pnpm exec eslint scripts/pipeline/ tests/pipeline/  → exit 0 (sem warnings)
node --test tests/pipeline/*.test.ts     → tests 43 · pass 43 · fail 0
```

## O que está bom (mantido do Round 1)

- Retrocompat do schema v1 (`supersededBy?` opcional fora de `REQUIRED_FIELDS`; `schemaVersion` 1).
- `byStatusOf` exaustivo sem `default`; `exactOptionalPropertyTypes` respeitado.
- Decisões de design documentadas; CA1–CA7 cobertos; migração CA6 via dogfooding.
- Sem `throw`/`class`/`any`; `readState` tratado via `Result`.

## Próximo passo

**APPROVED → W3:** gate final automatizado (`typecheck` + `format:check` + `test` + `lint`). As
duas sugestões 🔵 ficam registradas como dívida de hardening, fora do escopo deste ticket.
