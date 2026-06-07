# AUTH-USECASE-ACTIVATE-DEACTIVATE — Ativar/desativar usuário (US5)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US5, FR-010/011, data-model.md:51, tasks T037–T038) · **Branch:** `005-gestao-usuarios`

> Este ticket = camada **application** (use cases). Reusa o domínio existente `User.disable`/`User.enable`
> (Foundational). As **rotas** `PATCH /api/v1/users/:id/activate|deactivate` são o ticket `AUTH-HTTP-STATUS`.

## Decisões

1. **Dois use cases num arquivo coeso** `activate-deactivate-user.ts`: `activateUser` e `deactivateUser`.
2. **Idempotência (FR-010, AC3).** O use case lê o estado atual e só transita se necessário:
   - `deactivateUser`: `active` → `User.disable` + save; `disabled` → no-op (sucesso, `event: null`).
   - `activateUser`: `disabled` → `User.enable` + save; `active` → no-op (sucesso, `event: null`).
   - Output `{ user, event: UserDisabled|null }` / `{ user, event: UserEnabled|null }` — `null` = no-op.
3. **Proteção de auto-desativação (data-model.md:51).** `deactivateUser` recebe `actorId` (admin do JWT) e
   `targetId`; se iguais → `cannot-deactivate-self` (evita lockout). `activateUser` não tem essa regra
   (estar `disabled` já impede login; reativar-se é inalcançável).
4. **Sequência:** rehydrate id → fetch (404) → [self-check no deactivate] → domain (se transita) → persist.
   Evento só após save OK.

## Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `application/use-cases/activate-deactivate-user.ts` (`activateUser` + `deactivateUser`) |
| Criar (teste) | `tests/modules/auth/application/use-cases/activate-deactivate-user.test.ts` |

## Critérios de aceite (W0 — RED)

- **CA1**: `deactivateUser` em usuário ativo → `save` recebe `status='disabled'` + `disabledAt`; evento `UserDisabled`.
- **CA2**: `activateUser` em usuário inativo → `save` recebe `status='active'`; evento `UserEnabled`.
- **CA3**: `deactivateUser` em já-inativo → sucesso, `event: null`, `save` **não** chamado (idempotente).
- **CA4**: `activateUser` em já-ativo → sucesso, `event: null`, `save` **não** chamado (idempotente).
- **CA5**: `deactivateUser` com `actorId === targetId` → `err('cannot-deactivate-self')`; `save` não chamado.
- **CA6**: id inexistente → `err('user-not-found')` em ambos.
