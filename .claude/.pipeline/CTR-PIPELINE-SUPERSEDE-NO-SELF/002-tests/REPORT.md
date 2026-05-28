# W0 (RED) — CTR-PIPELINE-SUPERSEDE-NO-SELF

**Skill:** tdd-strategist · **Data:** 2026-05-27 · **Resultado:** 🔴 RED

CA-S4 (`tests/pipeline/state-cli.test.ts`): `supersede <ticket> --by <ticket>` (mesmo id) deve
falhar com `EXIT=2` e não alterar o status. Hoje grava `superseded` com `supersededBy` = o próprio
ticket (auto-referência) → RED.

```
node --test --test-name-pattern="CA-S4" tests/pipeline/state-cli.test.ts  → tests 1 · pass 0 · fail 1
```

**Mapa W1:** guarda em `cmdSupersede` (`state-cli.ts`): `if (winner === ticket) exitFail(2, ...)`
antes de aplicar o novo estado.
