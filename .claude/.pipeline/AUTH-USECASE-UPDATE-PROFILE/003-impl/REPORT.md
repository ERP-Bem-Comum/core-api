# W1 — Implementação · AUTH-USECASE-UPDATE-PROFILE

**Agente:** ts-domain-modeler · **Outcome:** GREEN

## Mudanças

- `domain/identity/user/user.ts` — `UpdateProfileInput` ganha `email?: Email`; `updateProfile`
  inclui `email` no patch parcial. Mudança mínima (reusa o mecanismo existente da Foundational).
- `application/use-cases/update-user-profile.ts` (novo) — use case `updateUserProfile`.
  - Sequência: rehydrate id → `findById` (404) → valida campos presentes via VOs → unicidade de
    email só quando muda (SELECT-then-UPDATE, ADR-0020) → `User.updateProfile` → `save`.
  - Atomicidade (FR-009): toda validação ocorre antes do único `save`.
  - Patch acumulado num objeto mutável local e passado imutável ao domínio.

## Verde

```
tests 7 · pass 7 · fail 0
```

Todos os CA1–CA7 passam. Conflito de email diferencia o próprio usuário (no-op) de outro (409).
