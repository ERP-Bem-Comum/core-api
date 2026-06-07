# W1 — Implementação · HTTP-SEC-HARDENING

**Agente:** security-backend-expert · **Outcome:** GREEN

## Mudanças

- **F3** `src/shared/http/reply.ts` — em `status >= 500`, envelope genérico (`code:'internal'`,
  `message:'An internal error occurred'`) + log do code real no servidor (`reply.request.log.error`).
  4xx mantém o code interno (informativo). Alinha com o handler central `errors.ts`.
- **F4** `src/shared/http/app.ts` — `genReqId` aceita `x-request-id` só se `^[A-Za-z0-9_-]{1,128}$`;
  senão gera UUID. Bloqueia log/header injection (newline) e payloads gigantes.
- **F5** `src/modules/auth/adapters/http/users-plugin.ts` — `WRITE_RATE_LIMIT = 30/min` aplicado via
  `config.rateLimit` nas 4 rotas de escrita (POST/PUT/PATCH×2). Reads no teto global.

## Verde

```
sec-hardening:   tests 5 · pass 5
rate-limit:      tests 1 · pass 1
```

Sem regressão: suíte completa 2376 pass / 0 fail. Os testes de inject de users (create/update/status)
fazem < 30 escritas por app → não disparam o novo limite.
