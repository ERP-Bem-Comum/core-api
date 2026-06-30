# W2 — Code Review (read-only) · PARTNERS-INVITE-DOMAIN-EVENT

> Skill: `code-reviewer` · Outcome: **APPROVED**

- **Sem colisão com o `par_outbox` de integração:** `CollaboratorInvited` vai num outbox **dedicado**
  `par_email_outbox` (single-consumer: só o `email-dispatch`); o `supplier-view-projection` segue
  consumindo o `par_outbox` sem interferência.
- **Sem duplicação:** `issueCollaboratorInvite` não chama mais o mailer (verificado por grep) — envio só pelo consumidor.
- **email-dispatch multi-fonte:** lê `auth_outbox` + `par_email_outbox` (degradação graciosa).
- **Cross-módulo (ADR-0006):** consumidor decodifica `CollaboratorInvited` via `partners/public-api`.
- Atomicidade (ADR-0015) via `saveWithEvents`; ADR-0014/0020 nas tabelas; `Result` nas bordas.

Veredito: APPROVED.
