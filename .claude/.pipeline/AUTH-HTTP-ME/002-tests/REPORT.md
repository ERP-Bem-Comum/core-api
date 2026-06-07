# W0 — Testes RED · AUTH-HTTP-ME

**Agente:** tdd-strategist · **Outcome:** RED

## Suíte

`tests/modules/auth/adapters/http/me-account.route.test.ts` — 6 casos (CA1–CA6), inject, driver memory.

## RED verificado

```
SyntaxError: módulo public-api/http.ts não exporta 'meHttpPlugin'
tests 1 · fail 1
```

Cobre: 401 sem token (CA1/CA4), GET /me self (CA2), PUT /me edita nome/telefone (CA3),
password-reset 202 (CA5), e self-only reforçado (CA6: comum em PUT /users/:id → 403).
