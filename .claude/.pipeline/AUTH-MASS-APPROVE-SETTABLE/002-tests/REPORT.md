# W0 — Testes RED (AUTH-MASS-APPROVE-SETTABLE)

**Agente:** tdd-strategist · **Outcome:** RED

## Testes escritos (estendendo arquivos existentes)

- `tests/modules/auth/application/use-cases/create-user-by-admin.test.ts` — describe novo `massApprovalPermission`: CA1 (true→role concedida), CA2 (false→sem role), CA6 (ator sem `user:assign-role`→forbidden + nada persistido), CA7 (role inexistente→busca-ou-cria), "flag ausente não toca roleRepo".
- `tests/modules/auth/application/use-cases/update-user-profile.test.ts` — CA3 (true→assign idempotente), CA4 (false→revoke idempotente), CA5 (flag ausente→no-op), CA6 (fail-closed).
- `tests/modules/auth/adapters/http/users-create.route.test.ts` e `users-update.route.test.ts` — borda: CA1-CA6, com CA6→403.

## Prova RED

```
ℹ tests 20 · pass 12 · fail 8
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../use-cases/mass-approver-role.ts'
✖ CA1/CA3/CA4/CA5/CA6 (POST e PUT)
```

RED por inexistência da API nova (`mass-approver-role.ts`, deps `roleRepo`, campo `massApprovalPermission`, `actorId`). Nenhum arquivo de `src/` tocado antes deste passo.
