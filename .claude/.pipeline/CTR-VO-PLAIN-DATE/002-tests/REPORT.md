# W0 — Testes (RED)

- `tests/shared/kernel/plain-date.test.ts` — CA1–CA4 (from/round-trip, rejeições, compare/equals, fromDate, imutabilidade).
- `tests/shared/adapters/clock-today.test.ts` — CA5 (`ClockReal.today`, `ClockFixed.today`).

## RED

```
ERR_MODULE_NOT_FOUND: '#src/shared/kernel/plain-date.ts'
```

Ambos falham por inexistência do módulo. 2 arquivos, fail-first satisfeito.
