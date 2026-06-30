# W0 — Testes RED · AUTH-AGG-USER

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED
- **Decisões:** `handbook/domain/auth/design-decisions.md` (DD-USER-01..05).

## Arquivos de teste (mirror)

- `tests/modules/auth/domain/identity/user-id.test.ts` → `UserId` (CA1-3)
- `tests/modules/auth/domain/identity/user/user.test.ts` → `User` (CA4-8)
- `tests/modules/auth/domain/authorization/authorize.test.ts` → `authorize` (CA9-10)

## Mapa CA → teste

| CA | Caso |
| :-- | :-- |
| CA1-3 | `UserId` generate/rehydrate/inválido (`user-id-invalid`) |
| CA4 | `register` → `ActiveUser` + `UserRegistered`; roles dedup por `RoleId` |
| CA5 | `parseActive`: Active → ok; Disabled → `err('user-disabled')` |
| CA6 | `disable` → `DisabledUser{disabledAt}` + `UserDisabled` |
| CA7 | `changePassword` troca hash + `PasswordChanged` **sem hash no payload** |
| CA8 | `assignRole` adiciona + `RoleAssigned`; idempotente por `RoleId` |
| CA9 | `authorize` com permissão → ok |
| CA10 | `authorize` sem permissão → `err('forbidden')` (fail-closed) |

## Saída (RED)

```
ℹ tests 3
ℹ pass 0
ℹ fail 3
```

`ERR_MODULE_NOT_FOUND` para `user-id.ts`/`user/user.ts`/`authorize.ts`. `src/` intocado.

## Decisões para o W1 (do design-decisions.md)

- Tipos refinados `ActiveUser | DisabledUser` (DD-USER-01); `parseActive` é o gate (Result).
- Transições aceitam `ActiveUser` → retornam `{ user, event }` direto (sem Result próprio).
- `authorize(user: ActiveUser, p): Result<void,'forbidden'>` reusa `Role.hasPermission` (DD-USER-02).
- `at: Date` injetado nos eventos (sem `new Date()` no domínio). Eventos sem segredo (DD-USER-05).
- Asserção anti-vazamento em CA7: `Object.values(event)` não inclui o hash.
