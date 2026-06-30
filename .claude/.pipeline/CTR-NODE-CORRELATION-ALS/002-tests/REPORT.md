# W0 — Testes (RED)

`tests/shared/observability/correlation.test.ts` — 6 casos cobrindo CA1–CA3.

## Resultado RED

```
✖ correlation (AsyncLocalStorage)
  ERR_MODULE_NOT_FOUND: '#src/shared/observability/correlation.ts'
```

Falha por inexistência do módulo sob teste — fail-first satisfeito.

## Cobertura

| CA | Teste |
| --- | --- |
| CA1 | `currentCorrelationId()` === `undefined` fora de escopo |
| CA2 | id visível dentro de `runWithCorrelation`, inclusive após `await`; valor de retorno propagado |
| CA3 | `withNewCorrelation` gera UUID v4 distinto; escopos aninhados não vazam |

CA4/CA5 (wiring do worker): cobertos por `outbox-worker.test.ts` (comportamento/stats inalterados) — sem novo teste de captura de stderr (YAGNI; o primitive é a parte não-trivial).
