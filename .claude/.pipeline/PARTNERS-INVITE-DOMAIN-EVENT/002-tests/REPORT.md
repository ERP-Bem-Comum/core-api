# W0 — Testes RED · PARTNERS-INVITE-DOMAIN-EVENT

> Skill: `tdd-strategist` · Outcome: **RED**

Testes (fail-first) cobrindo CA1–CA8: schema/helpers de claim do `par_email_outbox`; decoder de
`CollaboratorInvited` (`partners/public-api`); emissão atômica no `issueCollaboratorInvite`; delivery do
template de autocadastro → `EmailSender`; use case não chama mailer; retry/DLQ; `auth_outbox` intacto
(email-dispatch multi-fonte). Falham por inexistência da API.
