# W2 — Code Review (read-only) · NOTIF-INVITE-FALLBACK-SYNC

> Skill: `code-reviewer` · Outcome: **APPROVED** (round 1/3)

- Paridade estrutural com `buildResetMailer` confirmada: mesma forma `senderR.ok && from → adapter
  síncrono`; provider inválido → throw; sem remetente → no-op seguro.
- Callers de produção passam só `process.env`; o seam `emailSender?` é injetado apenas em teste.
- Caminho assíncrono (outbox Drizzle) inalterado. ADR-0006/0010 respeitados.

Veredito: APPROVED.
