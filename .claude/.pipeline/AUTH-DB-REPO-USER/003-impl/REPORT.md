# W1 (GREEN) — AUTH-DB-REPO-USER — em duas mãos

## W1a — DBA (`mysql-database-expert`)
Blueprint de queries em `001-query-blueprint.md` (Clock p/ timestamps; upsert SELECT-FOR-UPDATE; replace
auth_user_role; `isEmailDupEntry`; 3 queries de reidratação; mapper `userFromRows`).

## W1b — Implementador (`drizzle-orm-expert`)

| Arquivo | Ação |
| :-- | :-- |
| `domain/identity/user/repository.ts` | `UserRepositoryError += 'email-already-registered'` |
| `adapters/persistence/repos/user-repository.in-memory.ts` | `save` detecta e-mail dup (outro id) → `email-already-registered` |
| `adapters/persistence/drivers/mysql-driver.ts` | `openAuthMysql` (pool mysql2 + drizzle sobre schema auth; espelha contracts) |
| `adapters/persistence/mappers/user.mapper.ts` | `userFromRows` (dispatcher status, agrupa perms por role) + `userToInsert(user, now)`, tagged errors |
| `adapters/persistence/repos/user-repository.drizzle.ts` | `createDrizzleUserStore(handle, clock)` — save (transação) + findById/findByEmail (3 queries) |
| `tests/.../user-repository.drizzle.test.ts` | gated `MYSQL_INTEGRATION`: contract-suite (CA7) + reidratação roles via fixture SQL (CA8) + FK (CA9) |

Seguiu o blueprint à risca: SELECT FOR UPDATE → UPDATE/INSERT → DELETE+INSERT batch (skip vazio);
`isEmailDupEntry` = errno 1062 **AND** `sqlMessage.includes('auth_user_email_idx')`; 3 queries (`inArray` na Q3).

## Verificação (sem Docker — CA7-9 no W3)

```
contract-suite InMemory (CA1-6):  6/6
suíte auth completa:              161/161 · fail 0
pnpm test (global):               1419 pass · 0 fail · 16 skipped (integração gated)
tsc --noEmit / eslint / prettier: limpos
```

## Handoff para W2 (validação cruzada)
- `code-reviewer`: audita `user.mapper.ts` (Result na borda, dispatcher status) + `user-repository.drizzle.ts`
  (transação, `isEmailDupEntry`, 3 queries, isolamento `auth_*`) + InMemory dup detection.
- Validação de comportamento real (EXPLAIN, CA7-9) → W3 (`test:integration` contra MySQL).
