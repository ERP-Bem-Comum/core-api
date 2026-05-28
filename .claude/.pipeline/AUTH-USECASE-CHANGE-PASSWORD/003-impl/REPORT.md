# W1 (GREEN) — AUTH-USECASE-CHANGE-PASSWORD

**Skill:** `ports-and-adapters` · **Resultado:** GREEN

## Arquivo criado

`src/modules/auth/application/use-cases/change-password.ts` — use case `changePassword` + helper local
`revokeAllForUser`. Nenhum port/adapter novo.

## Decisões de implementação (DD-USER-06)

- Sequência: `findById` (null → `invalid-credentials`) → `parseActive` (falho → `user-disabled`) →
  re-auth (`Password.parse(current)` falho **ou** `verify` false → `invalid-credentials`) →
  `Password.parse(new)` (falho → `PasswordPolicyError`) → `hash` → `User.changePassword` → `save` →
  `revokeAllForUser` (após o save).
- `revokeAllForUser` definido **antes** do export (evita `no-use-before-define`); `found.value === null`
  explícito (sem nullable boolean). `Clock.now()` capturado uma vez.
- Output `{ user, event }` (PasswordChanged); não publica (EventBus futuro).

## Verificação

```
A8 (change-password.test.ts): tests 7 · pass 7 · fail 0
suíte auth completa:          tests 143 · pass 143 · fail 0
tsc --noEmit:                 sem erros
eslint:                       sem problemas
prettier --check .:           clean
```

Ajustes durante o W1: assinatura do helper de teste `registerOnce` → `Promise<UserId>` (era `string`); prettier
no use case (quebra de linha). Sem mudança de lógica.

## Handoff para W2 (`code-reviewer`)

Auditar: ordem (re-auth antes de trocar; revogação **após** o save da senha), idempotência da revogação
(reusa `findRevocableByUserId`+`revoke`), anti-enumeration (`invalid-credentials` cobre null/parse/verify),
`Clock.now()`, zero `throw`/`class`. Helper `revokeAllForUser` é a 3ª ocorrência do loop revoke (nota DD-USER-06).
