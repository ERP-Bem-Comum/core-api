---
name: last-resort-stack-trace-fix
description: String(cause) perde stack em last-resort.ts; padrão correto é cause instanceof Error ? cause.stack ?? cause.message : String(cause)
metadata:
  type: feedback
---

Em handlers de último recurso (uncaughtException/unhandledRejection), usar `cause instanceof Error ? (cause.stack ?? cause.message) : String(cause)` ao logar.

**Why:** `String(cause)` produz `"Error: mensagem"` sem frames. O stack trace é o único diagnóstico disponível num crash fora da cadeia de promise — perdê-lo torna o post-mortem impossível.

**How to apply:** Todo `write(String(cause))` em contexto de error handler deve passar pela guarda instanceof antes de escrever. Aplicado em src/shared/runtime/last-resort.ts linha ~47.

Links: [[shutdown-idempotency-pattern]]
