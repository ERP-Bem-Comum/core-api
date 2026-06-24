# W1 — Implementação (GREEN) · FIN-MANUAL-PAYMENT-PAIDAT-CMD (#232)

**Agentes:** fastify-server-expert + zod-expert · **Resultado:** GREEN ✅

## Mudanças (mínimas, YAGNI)

| Arquivo | Mudança | CA |
| --- | --- | --- |
| `application/use-cases/register-manual-payment.ts` | `RegisterManualPaymentCommand` ganha `paidAt?: string`; `at = cmd.paidAt ? new Date(cmd.paidAt) : clock.now()`; usa `at` na chamada de domínio | CA1, CA2 |
| idem | `RegisterManualPaymentError` ganha `'paid-at-in-future'`; valida `at > clock.now()` | CA3 |
| `adapters/http/schemas.ts` | `manualPaymentBodySchema.paidAt: z.iso.date().optional()` (idioma da borda) | CA1 |
| `adapters/http/plugin.ts` | handler propaga `req.body.paidAt` (spread condicional, `exactOptionalPropertyTypes`) | CA1 |
| `adapters/http/error-mapping.ts` | `'paid-at-in-future' → 'A data de pagamento não pode ser futura.'` (422/unprocessable por default) | CA3 |

## Decisões

- `paidAt` é **date-only** (`YYYY-MM-DD`); "futura" = `new Date(paidAt) > clock.now()`. **Hoje é permitido** (00:00 do dia < agora).
- Validação no use-case (passo "validar" da sequência canônica) — precisa do `clock`; a borda Zod só garante o formato.
- Fallback `clock.now()` preserva 100% o comportamento atual (CA2) — zero regressão para chamadas sem `paidAt`.

## Testes

- `register-manual-payment.test.ts` (use-case): **3/3** CA1/CA2/CA3 ✔.
- `manual-payment.http.test.ts` (borda): **2/2** ✔ (sem regressão).

**Próximo (W2):** `code-reviewer` read-only.
