# W0 — Testes RED — AUTH-USER-PROFILE-AGG

**Wave:** W0 · **Outcome:** RED (esperado) · **Data:** 2026-06-07

`tests/modules/auth/domain/identity/user/user-profile.test.ts` — 6 `it()` (CA1..CA5).

```
✖ User.updateProfile / User.setPhoto / User.enable — "not a function" + campos de perfil undefined
ℹ tests 6 · fail (esperado)
```

RED válido: `updateProfile`/`setPhoto`/`enable` e os campos de perfil (`name`/`cpf`/`telephone`/`photo`/
`collaboratorId`) ainda não existem no agregado. A suíte existente `user.test.ts` (register/disable/
changePassword/assignRole) permanece a rede de não-regressão (CA6).

Próximo (W1): estender `types.ts` (campos nullable), `events.ts` (`UserProfileUpdated`/`UserEnabled`),
`user.ts` (`updateProfile`/`setPhoto`/`enable`; `register` preenche perfil null).
