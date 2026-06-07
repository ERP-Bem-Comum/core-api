# W1 — Implementação · AUTH-USECASE-ACTIVATE-DEACTIVATE

**Agente:** ts-domain-modeler · **Outcome:** GREEN

## Mudanças

- `application/use-cases/activate-deactivate-user.ts` (novo) — `activateUser` + `deactivateUser`.
  - Reusa `User.disable`/`User.enable` (domínio Foundational); zero mudança de domínio.
  - Idempotência: lê `status` atual; estado-alvo → no-op (`event: null`, sem `save`).
  - `deactivateUser` checa `actorId === targetId` → `cannot-deactivate-self` (anti-lockout).
  - Narrowing por discriminante (`status === 'disabled'`/`'active'`) satisfaz os tipos de `disable`/`enable`.

## Verde

```
tests 7 · pass 7 · fail 0
```

CA1–CA6 cobertos nas suites `deactivateUser` e `activateUser`.
