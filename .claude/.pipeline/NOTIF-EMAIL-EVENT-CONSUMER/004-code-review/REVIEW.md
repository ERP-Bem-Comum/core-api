# W2 — Code Review (read-only) · NOTIF-EMAIL-EVENT-CONSUMER

> Skill: `code-reviewer` (revisão conduzida na sessão principal após assumir o ticket) · Outcome: **APPROVED**

- **Sem duplicação de envio (CA5):** `request-password-reset.ts` e `create-user-by-admin.ts` **não**
  chamam mailer/EmailSender — as únicas menções são comentários explicando que o envio é do consumidor.
  Verificado por grep em `application/use-cases/`.
- **Cross-módulo (ADR-0006):** o `notifications` consome o contrato de eventos via `auth/public-api/email-events.ts`;
  o worker `email-dispatch` decodifica via public-api e envia via `EmailSender` (`buildEmailSender`).
- **Outbox (ADR-0015):** `auth_outbox` Drizzle ganhou claim `SKIP LOCKED` + retry/DLQ (molde partners);
  idempotência/at-least-once herdadas do worker genérico.
- **Código morto inerte:** mailers/`EmailOutbox`/`notifications_email_outbox` presentes mas não referenciados
  no fluxo de envio (limpeza = 02b). Sem DROP de tabela nesta fatia.
- Estilo: `Result` nas bordas; `import type` + `.ts` + `#src/*`; sem `class`/`throw`/`this` em domínio.

Veredito: APPROVED.
