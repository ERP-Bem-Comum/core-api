# W0 — Testes RED · FIN-MANUAL-PAYMENT-PAIDAT-CMD (#232)

**Agente:** tdd-strategist · **Resultado:** RED ✅

## Testes adicionados

`tests/modules/financial/application/use-cases/register-manual-payment.test.ts` — novo describe `paidAt (#232)` com spy que captura os eventos do `save` para inspecionar o `paidAt` do `PayableManuallyPaid`.

| Teste | CA | Estado RED | Por quê |
| --- | --- | --- | --- |
| `paidAt` retroativo gravado no evento | CA1 | ✖ FALHA | command ignora `paidAt`; grava `clock.now()` (2026-07-15) em vez de 2026-07-12 |
| sem `paidAt` → fallback `clock.now()` | CA2 | ✔ passa | já é o comportamento atual (preserva compat) |
| `paidAt` futura → `paid-at-in-future` | CA3 | ✖ FALHA | use-case não valida data futura; retorna `ok` |

## Saída

```
▶ registerManualPayment paidAt (#232)
  ✖ CA1: paidAt retroativo do command é gravado no evento PayableManuallyPaid
  ✔ CA2: sem paidAt → fallback clock.now()
  ✖ CA3: paidAt futura → paid-at-in-future
```

RED legítimo: as duas capacidades novas (aceitar `paidAt`, rejeitar futura) falham por inexistência da API. CA2 verde comprova que o fallback não regride.

**Próximo (W1):** `fastify-server-expert` + `zod-expert` — add `paidAt` ao `manualPaymentBodySchema`, ao `RegisterManualPaymentCommand`, usar `cmd.paidAt ?? clock.now()` + validação não-futura (`paid-at-in-future`), propagar no handler.
