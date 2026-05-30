# W0 — Tests (RED)

`tests/modules/auth/adapters/http/rate-limit.test.ts` (novo):

- login excedendo o limite dedicado → 429.
- refresh excedendo o limite dedicado → 429.
- register NÃO usa o limite restrito (acima do teto sensível ainda passa).

**RED observado:** login/refresh nunca retornavam 429 (só existia o limite global de 200/min, e
`buildAuthHttpDeps` não aceitava `sensitiveRateLimit`). O caso do register já passava (controle).
