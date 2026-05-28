# W1 — Implementação GREEN · AUTH-AGG-USER

- **Wave:** W1 (GREEN) · **Skill:** `ts-domain-modeler` · **Data:** 2026-05-27 · **Outcome:** GREEN (13/13 · typecheck + lint limpos)
- **Decisões aplicadas:** `handbook/domain/auth/design-decisions.md` DD-USER-01..05.

## Arquivos criados (6)

- `identity/user-id.ts` — `UserId` branded + generate/rehydrate.
- `identity/user/types.ts` — `UserCore` + `ActiveUser` + `DisabledUser` + `User` (união refinada, DD-USER-01).
- `identity/user/errors.ts` — `UserError = 'user-disabled'`.
- `identity/user/events.ts` — `UserRegistered | PasswordChanged | RoleAssigned | UserDisabled` (+ `UserEvent`).
- `identity/user/user.ts` — `register`, `parseActive`, `disable`, `changePassword`, `assignRole` (+ re-export de tipos para o namespace).
- `authorization/authorize.ts` — `authorize(user: ActiveUser, required): Result<void,'forbidden'>`.

## Aderência às decisões

- **DD-USER-01** — `ActiveUser | DisabledUser`; `disabledAt: Date` obrigatório no estado desabilitado. `parseActive` é o refinement constructor (gate).
- **DD-USER-02** — `authorize` puro em `authorization/authorize.ts`, fail-closed, reusa `Role.hasPermission`.
- **DD-USER-03** — transições aceitam `ActiveUser`, retornam `{ user, event }` direto; `at: Date` injetado.
- **DD-USER-04** — `changePassword` recebe `PasswordHash`; domínio não vê senha em claro.
- **DD-USER-05** — eventos flat, sem segredo no payload (teste CA7 verifica que o hash não aparece em `Object.values(event)`).

## Ajustes durante o W1 (autocorreção, sem mudar a API)

1. **Path de imports do `user.ts`:** o arquivo vive em `identity/user/` (um nível a mais), então `shared/primitives/*` exige **5** `../`, não 4 (corrigido `ERR_MODULE_NOT_FOUND`).
2. **Re-export de tipos** em `user.ts` (`ActiveUser`/`DisabledUser`/`User`/erros/eventos) para o namespace `import * as User` expor os tipos.
3. **Teste CA7:** `Object.values(event as Record<string, unknown>)` para a checagem defensiva anti-vazamento type-checar (o tipo do evento já garante a ausência do hash).

## Testes

```
ℹ tests 13
ℹ pass 13
ℹ fail 0
```
`pnpm run typecheck` e `pnpm run lint`: sem erros.

## Próxima wave
W2 (code review read-only).
