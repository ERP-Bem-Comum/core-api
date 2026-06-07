# W0 — Testes RED · AUTH-USECASE-ACTIVATE-DEACTIVATE

**Agente:** tdd-strategist · **Outcome:** RED

## Suíte

`tests/modules/auth/application/use-cases/activate-deactivate-user.test.ts` — 7 casos (2 suites:
`deactivateUser` CA1/CA3/CA5/CA6 + `activateUser` CA2/CA4/CA6).

## RED verificado

```
ERR_MODULE_NOT_FOUND: src/modules/auth/application/use-cases/activate-deactivate-user.ts
tests 1 · fail 1
```

Falha por inexistência da API. Cobre transição (CA1/CA2), idempotência sem `save` (CA3/CA4),
proteção de auto-desativação (CA5) e not-found (CA6).
