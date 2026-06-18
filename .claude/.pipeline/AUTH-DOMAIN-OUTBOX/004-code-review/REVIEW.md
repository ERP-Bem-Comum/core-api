# W2 — Code Review (read-only) · AUTH-DOMAIN-OUTBOX

> Skill: `code-reviewer` · Outcome: **APPROVED** (round 1/3)

- **Atomicidade real** confirmada: `saveWithEvents` = `upsertTokenInTx` + `appendOutboxInTx` na mesma
  `db.transaction` (ADR-0015). O adapter coordena a tx; o use case não a conhece (ports-and-adapters).
- **Dark-launch** confirmado: `mailer.sendResetLink` / `inviteMailer.sendInvite` permanecem; nenhum
  consumidor; nenhum e-mail duplicado.
- **Anti-enumeração** preservada: o evento só é montado após os early-returns (conta existe/ativa).
- Pureza do domínio mantida: `PasswordResetOutboxMessage` é tipo estrutural Readonly (payload opaco),
  sem import de application/infra; structural typing reconcilia com `OutboxMessage` da application.
- ADR-0006/0014/0015/0020 respeitados.

Veredito: APPROVED.
