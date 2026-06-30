# W0 — Testes RED (CORE-OUTBOX-WORKER-GENERIC)

**Resultado:** 🔴 RED (esperado) — disciplina `tdd-strategist`.

## Teste adicionado (`tests/shared/outbox/outbox-worker.test.ts`)

`runOnce<P>`/`runLoop<P>` genérico, com fakes de `WorkerOutboxOps`, `EventDelivery<P>` e `rowToProcessed`:

- **CA1** delivery ok → `markProcessed`; `delivered=1`.
- **CA2** delivery err, `attempts+1 < maxAttempts` → `markFailed`; `failed=1`.
- **CA3** delivery err, `attempts+1 >= maxAttempts` → `moveToDeadLetter`; `movedToDeadLetter=1`.
- **CA4** `rowToProcessed` err → DLQ direto, **sem** `deliver`.
- **CA5** `deliver` que lança → tratado como err (markFailed), não aborta o batch.
- **CA6** `runLoop` com `AbortSignal` abortado → retorna stats zerado sem processar.

## RED verificado

```
node --test tests/shared/outbox/outbox-worker.test.ts
→ ERR_MODULE_NOT_FOUND: '#src/shared/outbox/index.ts' (1 fail / 0 pass)
```

A API genérica (`src/shared/outbox/`) não existe — RED por inexistência, conforme fail-first.
Os tipos (`OutboxRow`, `WorkerOutboxOps`, `OutboxBatchOps`, `EventDelivery`, `WorkerConfig`)
e as funções (`runOnce`/`runLoop`/`deliveryUnavailable`) serão extraídos no W1 a partir dos
workers idênticos de contracts/partners; as suítes atuais desses workers são a rede de segurança (CA7).
