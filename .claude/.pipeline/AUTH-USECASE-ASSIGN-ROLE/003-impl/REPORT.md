# W1 (GREEN) — AUTH-USECASE-ASSIGN-ROLE

**Skill:** `ports-and-adapters` · **Resultado:** GREEN

## Arquivo criado

`src/modules/auth/application/use-cases/assign-role.ts` — use case `assignRole`. Nenhum port/adapter novo.

## Decisões de implementação (DD-USER-07)

- Sequência: ator (`findById`; null/`parseActive` falho → `forbidden`) → authz
  (`Permission.parse('user:assign-role')` falho → `forbidden`; `authorize` `!ok` → `forbidden`) →
  target (`findById`; null → `user-not-found`; `parseActive` falho → `user-disabled`) →
  role (`roleRepo.findById`; null → `role-not-found`) → `User.assignRole` → `save`.
- **Fail-closed**: todo caminho de ator não-utilizável colapsa em `forbidden` (não vaza null vs disabled vs sem-permissão).
- `authorize` importado como **valor** (função pura do domínio); `found.value === null` explícito; `Clock.now()`.
- 1ª aplicação real de `authorize` (DD-USER-02) num use case.

## Verificação

```
A9 (assign-role.test.ts): tests 8 · pass 8 · fail 0
suíte auth completa:      tests 151 · pass 151 · fail 0
tsc --noEmit / eslint / prettier --check: limpos (de primeira)
```

## Handoff para W2 (`code-reviewer`)

Auditar: ordem (authz do ator antes de tudo), fail-closed (`forbidden` para ator null/disabled/sem-permissão),
distinção correta de erros do target/role, `authorize` chamado com `ActiveUser` (DD-USER-02), `Clock.now()`,
zero `throw`/`class`, idempotência de `assignRole` (CA8).
