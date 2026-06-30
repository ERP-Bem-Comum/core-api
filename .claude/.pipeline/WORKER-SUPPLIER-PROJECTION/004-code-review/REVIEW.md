# W2 — Code Review (WORKER-SUPPLIER-PROJECTION)

**Veredito:** ✅ APPROVED · **Disciplina:** code-reviewer (read-only) · **Round:** 1/3
**Blocker:** 0 · **Major:** 0 · **Minor:** 0

## Escopo

Composition root `src/workers/supplier-view-projection/` (delivery + run.ts) + script + export.

## Conformidade

- **Isolamento (ADR-0006/0014).** O delivery cola `par_outbox` → `applySupplierEvent` (financial
  **public-api**); nenhum módulo importa o outro. A ligação cross-módulo vive no **composition root**
  (fora de `src/modules/`), análogo a `server.ts` — local canônico para código que cruza fronteiras.
  Infra (drivers/outbox repo) importada na montagem; lógica via public-api. ✅
- **Reuso do genérico (CORE-OUTBOX-WORKER-GENERIC).** `run.ts` usa o `runLoop` de `shared/outbox`
  com `rowToProcessed` (payload opaco) + delivery próprio — sem copiar mais um worker. ✅
- **Runtime (ADR-0041 / Node 24).** Entrypoint dedicado, 2 pools, graceful shutdown via `AbortSignal`
  (SIGTERM/SIGINT), `finally` fecha ambos os pools; exit codes (`EX_CONFIG`=78). Migrations não
  aplicadas (responsabilidade do release). ✅
- **At-least-once.** Falha de aplicação (payload inválido/store indisponível) → `DeliveryError` →
  o `runLoop` genérico incrementa attempts e roteia para DLQ ao atingir `maxAttempts`. ✅
- **Boundary.** `deliver` retorna `Result<void, DeliveryError>`; sem `throw` cruzando. ✅

## Verificação (validado contra MySQL real)

```
delivery.test.ts → 4/4
test:integration:financial → 20/20, inclui e2e: SupplierRegistered no par_outbox → fin_supplier_view
typecheck / lint → verde
```

Sem achados. A topologia decidida na pesquisa (ASYNC-MESSAGING-STRATEGY) está implementada e
comprovada ponta a ponta.
