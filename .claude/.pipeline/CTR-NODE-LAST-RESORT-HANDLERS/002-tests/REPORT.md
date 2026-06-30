# W0 — Testes (RED)

`tests/shared/runtime/last-resort.test.ts` — 3 casos, deps injetáveis (sem mexer no `process` global).

## RED

```
ERR_MODULE_NOT_FOUND: '#src/shared/runtime/last-resort.ts'
```

## Cobertura

| CA | Teste |
| --- | --- |
| CA1 | registra listener de `uncaughtException` e `unhandledRejection` |
| CA2 | em fatal: loga tipo+causa, chama `shutdown` 1×, sai com `exit(1)` |
| CA3 | `exit` ocorre **depois** de `shutdown` resolver (ordem `['shutdown','exit']`) |

CA4 (wiring nos `main.ts`) e CA5 (caminho normal) cobertos pelos E2E de CLI existentes (suíte completa verde em W3) — sem novo teste de spawn (YAGNI; o helper é a parte não-trivial).
