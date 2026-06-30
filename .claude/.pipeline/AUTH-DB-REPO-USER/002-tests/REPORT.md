# W0 (RED) — AUTH-DB-REPO-USER

**Skill:** `tdd-strategist` · **Resultado:** RED (CA6 falha no InMemory)

## Teste escrito

Estendida a contract-suite compartilhada `tests/modules/auth/adapters/persistence/user-repository.contract.ts`
(roda contra InMemory **e** Drizzle futuro) com:

| CA | Verifica |
| :-- | :-- |
| CA6 (novo) | salvar user B com e-mail já usado por user A (id ≠) → `err('email-already-registered')` |

Os CA7–CA9 (Drizzle: contract-suite via adapter + reidratação de roles via fixture SQL + violação FK) serão
criados no W1b junto ao adapter (a interface emerge da implementação) e rodam no W3 (`test:integration`).

## Saída RED

```
✔ CA1..CA5  · ✖ CA6 (InMemory retorna ok — ainda não detecta e-mail duplicado)
ℹ tests 6 · pass 5 · fail 1
```

## Handoff

- **W1a — DBA** (`mysql-database-expert`): queries do `save` (upsert SELECT-then-UPDATE-or-INSERT + replace
  `auth_user_role`) e da reidratação (JOIN `auth_user_role`→`auth_role`→`auth_role_permission`→`auth_permission`)
  + `EXPLAIN`; mapeamento `ER_DUP_ENTRY` (1062) → `email-already-registered`.
- **W1b — Implementador** (`drizzle-orm-expert`): port `UserRepositoryError += 'email-already-registered'`;
  InMemory detecta dup; driver auth + mapper + repo Drizzle; teste Drizzle CA7–CA9.
