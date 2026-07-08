# W1 — REPORT (NOTIF-EMAIL-RATE-LIMIT, #133)

> **GREEN.** Decorator 5/5 + delivery CA5 + typecheck ✅.

## Implementado
- `domain/email/types.ts`: `EmailError += { tag: 'rate-limited'; reason }`.
- `adapters/email/rate-limit.ts`: `withRateLimit(sender, policy, now)` — sliding window in-memory por
  destinatário (lowercased); excede → `err rate-limited` sem delegar. `rateLimitPolicyFromEnv(env)`
  (`EMAIL_RATE_LIMIT_MAX` + `EMAIL_RATE_LIMIT_WINDOW_MS`, default 1h; ausente/inválido = desligado).
- `adapters/event-delivery/email-event-delivery.ts`: `rate-limited` → `ok(undefined)` (descarte, não retry/DLQ).
- `adapters/email/build-email-sender.ts`: rate-limit é o decorator **mais externo** (conta o destinatário
  real, antes do sandbox reescrever o `to`); ligado por env.

## Testes
- `rate-limit.test.ts` 5/5 (CA1 excede · CA2 independência · CA2b case-insensitive · CA3 janela expira · CA4 delega).
- `email-event-delivery.test.ts` CA5 (rate-limited → ok/descarte).

## Próximo (W2 — auditoria de segurança, por pedido do dono)
Auditar via `security-backend-expert` + skill `web-security-backend` + MCP `mcp__security`: janela sem
bypass/off-by-one, anti-enumeração, sem vazar em log, sem efeito cruzado, e **crescimento do Map in-memory**
(destinatários que não reenviam nunca são podados — possível leak/DoS a verificar).
