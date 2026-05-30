# W2 — Code Review

**Resultado: APPROVED**

- **Anti-enumeração** em dois níveis: use case retorna ok sem enviar p/ conta inexistente/disabled/email inválido; rota responde **202 uniforme** ignorando o Result (erro só logado server-side). ✓
- **Host-Header-Injection evitado:** `resetUrl` montado de `resetBaseUrl` (config/env), nunca do header Host. ✓
- Token: alta entropia (randomBytes 32) + sha256 persistido / claro só no link (DD-LOGIN-02). Invalida pendentes anteriores. ✓
- Cross-módulo via `notifications/public-api` (ADR-0006); o use case depende do port `PasswordResetMailer`, não do EmailSender direto. ✓
- Rate-limit dedicado na rota (endpoint de e-mail é abusável). ✓
- **Pendências registradas:** mailer real (Nodemailer) não fiado (no-op seguro sem SMTP; adapter pronto); integração MySQL não exercida (porta 3306).
