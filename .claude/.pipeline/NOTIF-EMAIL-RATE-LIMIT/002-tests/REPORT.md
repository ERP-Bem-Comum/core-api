# W0 — REPORT (NOTIF-EMAIL-RATE-LIMIT, #133)

> **RED** — `withRateLimit` não existe (`ERR_MODULE_NOT_FOUND`).

`tests/modules/notifications/adapters/email/rate-limit.test.ts` — decorator com clock injetado + fake sender contador:
- **CA1** excede no mesmo destinatário → `err rate-limited`, inner não chamado.
- **CA2** destinatários distintos independentes · **CA2b** case-insensitive.
- **CA3** após janela expirar (clock avança) → envia de novo.
- **CA4** dentro do limite → delega ao inner.

```
ℹ tests 1 · pass 0 · fail 1  (ERR_MODULE_NOT_FOUND)
```

W1: `EmailError += 'rate-limited'`, `rate-limit.ts` (decorator sliding window in-memory), `email-event-delivery.ts`
(rate-limited → `ok`/descarte), `build-email-sender.ts` (wiring por env). Teste do delivery no W1.
