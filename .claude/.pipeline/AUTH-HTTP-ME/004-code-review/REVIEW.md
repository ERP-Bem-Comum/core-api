# W2 — Code Review · AUTH-HTTP-ME

**Agente:** code-reviewer · **Round:** 1 · **Veredito:** APPROVED

## Checklist

- **Self por construção**: rotas operam só em `req.userId` (JWT); sem `:id` → impossível agir sobre
  terceiros. Edição de terceiros permanece exclusiva da rota admin `PUT /users/:id` (user:update). ✅
- **Menor privilégio**: `PUT /me` restrito a `name`/`telephone` (`meUpdateBodySchema`); autosserviço
  não altera `collaboratorId`/status/roles. ✅
- **password-reset**: email da identidade autenticada (nunca do body); resposta 202 constante; erro de
  envio não vaza (consistência anti-enumeração). ✅
- **Reuso sem duplicação**: nenhum use case/domínio novo; só borda. ✅
- **Result na borda**, idioma EN/PT correto, sem PII em log. ✅

Sem issues bloqueantes.
