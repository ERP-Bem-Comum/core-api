# W1 — Implementação (GREEN)

## Domínio (camada de sessão, DD-USER-06)

- `domain/session/account-lockout.ts` (novo, puro): `AccountLockout { userId, failedAttempts, lockedUntil }`; `initial`, `isLocked(at)`, `registerFailure(at, policy)` (cooldown progressivo: nível 0 na threshold-ésima falha → `stepsMinutes`, cap no último), `reset`. Sempre temporário.

## Application

- `application/ports/login-lockout-store.ts` (novo): port `LoginLockoutStore` (`findByUserId`, `save` upsert).
- `authenticate-user.ts`: deps `lockoutStore` + `lockoutPolicy`. Sequência: após achar o user → lê lockout → se `isLocked` faz verify dummy + `invalid-credentials` (genérico). Senha errada → `registerFailure` + save + `invalid-credentials`. Senha correta → `reset` (se havia falhas). `now` único do clock reusado.

## Adapter + composition

- `adapters/persistence/repos/login-lockout-store.in-memory.ts` (novo).
- `composition.ts`: `DEFAULT_LOCKOUT_POLICY = {5, [1,5,15,60]}`; `AuthCompositionConfig.lockoutPolicy?`; instancia o store in-memory e liga ao `authenticateUser`.

In-memory em ambos os drivers por ora (limitação registrada; follow-up de persistência no épico).
