# W2 — Code Review · AUTH-HTTP-UPDATE-USER

**Agente:** code-reviewer · **Round:** 1 · **Veredito:** APPROVED

## Checklist

- **Adapter HTTP isolado** (`users-plugin.ts`): rota PUT no escopo do plugin; preHandler
  `[requireAuth, authorize('user:update')]` (authn antes de authz, fail-closed). ✅
- **Borda só valida forma** (Zod); regra/normalização ficam nos VOs do domínio via use case. ✅
- **exactOptionalPropertyTypes**: command montado com spreads condicionais; nunca passa `undefined`. ✅
- **Result na borda**: erros do use case mapeados a status; `FIELD_VALIDATION_STATUS` compartilhado
  com POST (DRY) sem duplicar literais. ✅
- **Resposta 200 = detalhe** com a mesma shape do `GET /:id` (reusa `getUser`) — consistência de contrato. ✅
- **Wiring** completo: `composition.ts` (memory + mysql via `stores`), `server.ts`, e os 3 testes HTTP
  irmãos atualizados para o novo campo de `UsersHttpDeps`. ✅
- **Idioma**: código EN; comentários PT; sem PII em log. ✅

## Observações (não-bloqueantes)

- 200 faz uma leitura extra (`getUser`) após o `save` — aceitável numa escrita administrativa; mantém
  shape única. Otimização (mapear o user retornado) fica para quando houver pressão de performance.
- Persistência real do email atualizado (mapper Drizzle) coberta pela suíte de integração `test:integration:auth`.

Sem issues bloqueantes.
