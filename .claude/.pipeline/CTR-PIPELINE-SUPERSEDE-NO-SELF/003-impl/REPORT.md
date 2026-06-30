# W1 (GREEN) — CTR-PIPELINE-SUPERSEDE-NO-SELF

**Skill:** main-session · **Data:** 2026-05-27 · **Resultado:** 🟢 GREEN

Guarda em `cmdSupersede` (`scripts/pipeline/state-cli.ts`): `if (winner === ticket) exitFail(2, …)`
logo após `requireFlag('by')` — antes de qualquer load/aplicação. Auto-referência (`--by == ticket`)
rejeitada com `EXIT=2`, status inalterado.

## Gate

```
node --test --test-name-pattern="CA-S[1234]" tests/pipeline/state-cli.test.ts → 4/4
typecheck / lint / format:check → OK
```

CA-S1/S2/S3 (regressão do supersede) seguem verdes.
