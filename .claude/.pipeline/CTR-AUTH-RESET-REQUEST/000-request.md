# CTR-AUTH-RESET-REQUEST — Solicitação de reset de senha (BE-REC-003, 3/4)

> **Size:** M · **Épico:** `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md`.

## Escopo

Minter do token + use case `requestPasswordReset` + entrega por e-mail (EmailPort) + rota
`POST /forgot-password`. Decisão (épico): token entregue via EmailPort/Nodemailer (auth consome
`notifications/public-api`, ADR-0006/0010).

## Critérios de aceite

- [x] Minter `PasswordResetTokenMinter` (port + node adapter: randomBytes+sha256, espelha refresh).
- [x] Port `PasswordResetMailer` + adapter `makeEmailPasswordResetMailer` (consome `notifications/public-api`).
- [x] Use case `requestPasswordReset`: **anti-enumeração** (email malformado/inexistente/desabilitado → ok sem enviar); invalida tokens pendentes; emite novo (TTL); monta URL de **origem confiável** (config, nunca header Host).
- [x] Rota `POST /forgot-password`: **sempre 202** (uniforme), rate-limit dedicado; erro só logado.
- [x] Config `AUTH_RESET_BASE_URL` (server.ts) + `resetTtlSeconds`/`resetBaseUrl` no composition.
- [x] typecheck + lint + format + testes auth verdes.

## Pendência

- Mailer real (Nodemailer) não fiado: composition usa **no-op seguro** sem SMTP (adapter pronto; ligar via config SMTP é follow-up).
- Integração MySQL não exercida (porta 3306 ocupada).
