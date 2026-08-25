---
name: shutdown-idempotency-pattern
description: makeShutdownOnce extraído para módulo testável; padrão validado em CTR-DEVOPS-HARDENING
metadata:
  type: feedback
---

Extrair `makeShutdownOnce` para `src/shared/runtime/shutdown-once.ts` em vez de inline em `server.ts`.

**Why:** `server.ts` registra shutdown em SIGTERM, SIGINT e (via installLastResortHandlers) em uncaughtException/unhandledRejection. Sem guard, app.close()/deps.shutdown() podem rodar 2× no mesmo ciclo. O inline da CLI (main.ts) não era testável isoladamente.

**How to apply:** Sempre que um entrypoint (server.ts, CLI main) registrar shutdown em múltiplos handlers (sinais + last-resort), usar `makeShutdownOnce(fn)` do módulo compartilhado. Testar com node:test injetando mocks para contar chamadas.

Links: [[last-resort-stack-trace-fix]]
