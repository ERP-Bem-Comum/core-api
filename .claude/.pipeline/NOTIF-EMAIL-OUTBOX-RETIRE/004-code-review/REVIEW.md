# W2 — Code Review (read-only) · NOTIF-EMAIL-OUTBOX-RETIRE

> Skill: `code-reviewer` · Outcome: **APPROVED**

- **CA1 (reverificado na sessão principal):** `grep` por `EmailOutbox`/`createDrizzleEmailOutbox`/`InMemoryEmailOutbox`/
  `makeOutbox*Mailer`/`makeEmail*Mailer`/`buildResetMailer`/`buildInviteMailer`/`buildPartnersInviteMailer` em `src/` → **vazio**.
- **CA2 (reverificado):** `par_email_outbox` (`EmailOutboxPort`/`createDrizzleParEmailOutboxRepository`), `email-dispatch`,
  `email-event-delivery`, `auth_outbox` e os `public-api/email-events.ts` — todos intactos.
- DROP idempotente; driver/config/migrations do notifications mantidos (necessários para aplicar o DROP no release).

## Órfãos remanescentes (judgment call → issue de limpeza, não scope-creep)
Ports de application `{password-reset,invite,collaborator-invite}-mailer.ts` + `collaborator-invite-mailer.capturing.ts`
ficaram sem importadores (dead code) — fora da lista REMOVER explícita; registrados em issue de limpeza p3.
O `notifications/.../drivers/mysql-driver.ts` **fica** (aplica a migration de DROP no deploy).

Veredito: APPROVED — nada vivo removido.
