# W0 — Testes RED · HTTP-SWAGGER-GUARD

**Agente:** tdd-strategist · **Outcome:** RED

## Suíte

`tests/shared/http/swagger-guard.test.ts` — CA1/CA2 (production → 404) + CA3 (development → 200).

## RED verificado

```
tests 3 · pass 1 · fail 2  (CA1/CA2 falham; CA3 ja correto)
```

CA1/CA2 falham porque `/docs` e `/docs/json` são registrados incondicionalmente (200 mesmo em
production). CA3 já passa e deve permanecer (preserva a doc em dev).
