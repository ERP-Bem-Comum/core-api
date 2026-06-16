# W0 — Testes RED (FIN-CANCEL-OPTIMISTIC-LOCK)

**Disciplina**: tdd-strategist · **Resultado**: 🔴 RED.

## Arquivo

`tests/modules/financial/adapters/http/cancel-optimistic-lock.http.test.ts` — e2e `fastify.inject` (driver memory).

## Execução

```
node --test cancel-optimistic-lock.http.test.ts
ℹ tests 3 · pass 1 · fail 2
```

| Caso | Hoje | Por quê |
|------|:----:|---------|
| CA3 DELETE sem version → 400 | 🔴 fail | hoje DELETE não tem body schema → cancela (204) |
| CA1 DELETE version corrente → 204 + removido | ✅ pass | guard — cancela mesmo hoje (ignora version) |
| CA2 DELETE version defasada → 409 + permanece | 🔴 fail | hoje ignora version → cancela (204), documento some |

Os 2 RED falham por inexistência do optimistic lock no cancel. Viram GREEN no W1 (port/drizzle/in-memory/use case/http). Cobertura adicional (use case InMemory + contrato de repo + integração MySQL) entra no W1 junto com a impl.
