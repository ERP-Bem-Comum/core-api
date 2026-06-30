# W2 — Code Review (AUTH-MASS-APPROVE-SETTABLE)

**Revisor:** code-reviewer (read-only) · **Veredito:** APPROVED · **Round:** 1

## Verificado

- **Fail-closed real:** autorização de `user:assign-role` roda ANTES de qualquer escrita em ambos os use cases. Teste CA6 prova que, sem a permissão, `forbidden` é retornado e NADA é persistido (`findByEmail` null).
- **Idempotência:** `assign/revoke` herdam idempotência do domínio; revogação localiza a role por `name` e é no-op se ausente (não cria role à toa).
- **Save único** em ambos os fluxos (sem double-write); `user` retornado é o efetivamente salvo (detalhe deriva a flag das roles via `get-user.ts`).
- **Zero regressão:** com a flag ausente, nenhum acesso a `roleRepo`/ator. Gate W3 verde (2550 pass / 0 fail); testes legados intocados; `provision-legacy-user` segue verde após a extração (reexport de compat).
- **Convenções:** `Result<T,E>`, ports `type`, erros kebab-case EN, EN/PT por camada, imports `.ts`, `exactOptionalPropertyTypes` respeitado na borda.
- **Segurança:** `actorId` do PUT vem do JWT (`req.userId`), nunca do body.

## Achados Minor (não-bloqueantes — não exigem novo round)

- **M1:** no update, quando `massApprovalPermission` é a única mudança, `User.updateProfile` emite `UserProfileUpdated` e há `save` mesmo no caso idempotente (revoke de quem não tem). Estado final correto; write/evento redundante. Otimização futura, não bug.
- **M2:** `mass-approver-role-invalid → 422` na borda — é falha interna (constante inválida), 5xx seria mais preciso. Caso impossível na prática (permission constante e testada). Não bloqueia.

Nenhum achado Blocker/Major. Aprovado para W3.
