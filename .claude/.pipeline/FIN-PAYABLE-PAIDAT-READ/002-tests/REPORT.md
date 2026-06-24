# W0 — Testes RED · FIN-PAYABLE-PAIDAT-READ (#231)

**Agente:** tdd-strategist · **Resultado:** RED ✅

`manual-payment.http.test.ts` — novo teste end-to-end (in-memory): cria → aprova → baixa com `paidAt='2026-06-10'` → `GET /payable-titles` exige `paidAt` no título pai e `null` no filho não-pago.

RED: `Payable` não carrega `paidAt` e `payableSummarySchema` não o expõe → `parent['paidAt']` undefined (3 testes: 2 pass, 1 fail).

**Próximo (W1):** `drizzle-schema-author` + `ts-domain-modeler` — `Payable.paidAt` + `payPayableManually` + migration `fin_payables.paid_at` + persistência + read path. Cobertura Drizzle real via `test:integration`.
