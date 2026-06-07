# W2 — Code Review (read-only) — AUTH-HTTP-CREATE-USER

**Wave:** W2 · **Outcome:** APPROVED · **Round:** 1 · **Data:** 2026-06-07

| Item | Veredito |
|------|----------|
| Adapter consome só `notifications/public-api` (ADR-0006); `try/catch→Result` | ✅ |
| `recipientName` escapado no HTML (anti-XSS); token/link nunca logado | ✅ |
| `buildInviteMailer` espelha `buildResetMailer` (no-op seguro sem SMTP) | ✅ |
| `unusablePasswordHash` = `dummyPasswordHash` (mesma técnica, reuso correto) | ✅ |
| Rota: `adminId` do JWT (`req.userId`), NUNCA do body; RBAC `user:create` | ✅ |
| Mapeamento de erros completo (409 dup, 422 VOs, 502 mail, 503 repo) | ✅ |
| Validação de querystring/body Zod na borda + VOs no use case (defesa em profundidade) | ✅ |

**Resultado:** APPROVED. US3 entregue end-to-end.
