# FIN-MANUAL-PAYMENT-PAIDAT-CMD — baixa manual aceita `paidAt` no body

**Feature:** [025-fin-go-live-1-nucleo](../../../specs/025-fin-go-live-1-nucleo/) · **US1** · **Size:** S
**🎯 Goal:** fechar a issue **[#232](https://github.com/ERP-Bem-Comum/core-api/issues/232)** — *manual-payment deve aceitar a data de pagamento (paidAt) no body*.

## Contexto

A baixa manual (`POST /financial/documents/:id/payables/:payableId/manual-payment`, #224/#228) hoje grava o `paidAt` como `clock.now()` (`register-manual-payment.ts:60`) — o command **não aceita** a data de pagamento. Para a conciliação, a data precisa ser a **data da saída bancária** (normalmente retroativa); com `clock.now()` o `paidAt` fica sempre "hoje", quebrando o match.

## 📋 Definition of Done (critérios de aceite da #232 — fonte da verdade)

- [ ] **CA1** — `paidAt` (ISO `YYYY-MM-DD`) opcional no `manualPaymentBodySchema` e no `RegisterManualPaymentCommand`.
- [ ] **CA2** — use-case usa `cmd.paidAt` quando informado; **fallback `clock.now()`** quando ausente (compat).
- [ ] **CA3** — `paidAt` futura é rejeitada (validação).
- [ ] gate **W3** verde (`typecheck` + `format:check` + `lint` + `test`), regressão zero.
- [ ] **issue #232 fechada** referenciando o PR.

## Não-objetivos

- Expor `paidAt` na leitura (`GET /payable-titles`) — é o ticket irmão `FIN-PAYABLE-PAIDAT-READ` (#231, exige migration `fin_payables.paid_at`).
- Caminho automático (remessa) — fora deste ticket.

## Escopo técnico (do plan.md)

- `schemas.ts:776` `manualPaymentBodySchema` → add `paidAt: z.iso.date().optional()` (revisão `zod-expert`).
- `register-manual-payment.ts:22` `RegisterManualPaymentCommand` → add `paidAt?: string`.
- `register-manual-payment.ts:60` → `at: cmd.paidAt ? new Date(cmd.paidAt) : deps.clock.now()` + validação não-futura (`err('paid-at-in-future')`).
- `plugin.ts:402` handler → propaga `req.body.paidAt`.
