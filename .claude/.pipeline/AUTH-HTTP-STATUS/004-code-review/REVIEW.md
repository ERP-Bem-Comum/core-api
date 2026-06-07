# W2 — Code Review · AUTH-HTTP-STATUS

**Agente:** code-reviewer · **Round:** 1 · **Veredito:** APPROVED

## Checklist

- **Rotas isoladas** no plugin; preHandler `[requireAuth, authorize('user:activate'|'user:deactivate')]`
  (authn antes de authz, fail-closed, permissions distintas por operação). ✅
- **`actorId` do JWT** (`req.userId`), nunca do body → proteção `cannot-deactivate-self` confiável. ✅
- **Idempotência** preservada pela borda: use case retorna 200 mesmo em no-op. ✅
- **Result na borda**: erros mapeados (`cannot-deactivate-self`→422, `user-not-found`→404, etc.). ✅
- **Resposta 200 = detalhe** (reusa `getUser`), shape consistente com GET/PUT. ✅
- **Wiring** completo: composition (memory+mysql), server, 4 testes irmãos. ✅

## Observações (não-bloqueantes)

- Permissions `user:activate`/`user:deactivate` provisórias — alinhar com `006-gestao-acessos` (T048).
- Cada PATCH faz uma leitura extra (`getUser`) p/ a resposta — aceitável; mantém shape única.

Sem issues bloqueantes.
