# W2 — Code Review (read-only) · NOTIF-INVITE-OUTBOX

> Skill: `code-reviewer` · Outcome: **APPROVED** (round 1/3)

- Adapters consomem só `notifications/public-api` (ADR-0006); sem `class`/`throw`/`this`; `Result` nas bordas.
- Templates preservados (texto/HTML, `escapeHtml` anti-XSS); link de ativação/autocadastro mantido.
- Deep imports nos composition roots seguem o precedente já aceito do piloto reset (`NOTIF-EMAIL-OUTBOX`).
- Precedência de remetente do partners preservada; `makeCapturingCollaboratorInviteMailer` intacto.

**Observação (fora de escopo):** os adapters síncronos `invite-mailer.email.ts`,
`collaborator-invite-mailer.email.ts` (e o `password-reset-mailer.email.ts` do ticket anterior) ficaram
órfãos no wiring de produção → registrado como issue de limpeza. Veredito: APPROVED.
