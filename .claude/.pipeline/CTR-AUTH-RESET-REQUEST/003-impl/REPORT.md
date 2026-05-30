# W1 — Implementação (GREEN)

- `application/ports/password-reset-token-minter.ts` + `adapters/crypto/password-reset-token-minter.node.ts` (randomBytes base64url + sha256, espelha refresh minter).
- `application/ports/password-reset-mailer.ts` + `adapters/notifications/password-reset-mailer.email.ts` (consome `notifications/public-api`: monta EmailMessage, traduz falha → `reset-mail-failed`).
- `application/use-cases/request-password-reset.ts`: anti-enumeração (email inválido/inexistente/disabled → ok sem enviar); `findUnusedByUserId` → invalida pendentes (consume); emite novo (TTL); `resetUrl = resetBaseUrl + ?token=` (origem confiável injetada).
- `adapters/http/{schemas,plugin}.ts`: `forgotPasswordBodySchema` + rota `POST /forgot-password` (rate-limit dedicado; **sempre 202**; erro logado via `req.log`).
- `adapters/http/composition.ts`: Stores ganha `resetTokenRepo` (InMemory memory / Drizzle mysql); minter node; mailer **no-op seguro** sem SMTP; defaults `resetTtl=900` / `resetBaseUrl` dev; instancia `requestPasswordReset`.
- `server.ts`: env `AUTH_RESET_BASE_URL`.
