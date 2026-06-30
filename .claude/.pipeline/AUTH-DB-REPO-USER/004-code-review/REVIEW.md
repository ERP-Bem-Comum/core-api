# Validação cruzada (W2) — AUTH-DB-REPO-USER — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (Claude) · **Data:** 2026-05-27
**Escopo:** `user-repository.drizzle.ts`, `user.mapper.ts`, `user-repository.in-memory.ts`, `repository.ts` (port), `mysql-driver.ts`.

> Validação de comportamento real (EXPLAIN, CA7–CA9 contra MySQL) é o **W3** (`test:integration`). Aqui é
> auditoria de código read-only contra o blueprint (`001-query-blueprint.md`) e as regras de camada.

## Conformidade verificada

| Item | Resultado |
| :-- | :-- |
| `save`: SELECT FOR UPDATE → UPDATE/INSERT → DELETE+INSERT batch (skip vazio), em `db.transaction` | ✅ fiel ao blueprint §2/§3 |
| `isEmailDupEntry`: `errno===1062` **E** `sqlMessage.includes('auth_user_email_idx')`; checa `e` e `e.cause` | ✅ blueprint §4; distingue dup-email de dup-PK |
| `findById`/`findByEmail`: 3 queries (PK/email-idx; JOIN role; `inArray` perms); skip Q3 sem roles | ✅ blueprint §5 |
| Mapper `userFromRows` → `Result`; dispatcher status; `UserMapperMissingDisabledAt` cobre DD-USER-01; tagged errors | ✅ |
| `userToInsert(user, now)` — `now` injetado, sem `new Date()` no mapper | ✅ |
| Port `UserRepositoryError += 'email-already-registered'`; InMemory detecta dup | ✅ |
| `safe()`→Result nos finders; `save` com try/catch especializado; zero throw vazando p/ application | ✅ |
| ADR-0020 (sem ON DUPLICATE KEY) · ADR-0014 (só `auth_*`) | ✅ |

## Issues

### 🟡 Importante (não-bloqueia) — duplicação Q2/Q3 entre `findById` e `findByEmail`
`user-repository.drizzle.ts:124-167` e `:182-221` repetem ~40 linhas (Q2 JOIN role + Q3 `inArray` perms +
`buildUser`); só a Q1 difere (PK vs email-idx). O próprio blueprint sugeriu "reusar lógica via id do userRow".
**Recomendação:** extrair `hydrateUser(userRow): Promise<User>` privado e ambos os finders chamam após a Q1.
Não bloqueia (correto e verde); fica como refactor de manutenção.

### 🔵 Sugestão — casts `id as unknown as string` (branded → driver) sem comentário individual
Padrão de borda aceitável (o driver espera string); idealmente um comentário único explicando a coerção branded→coluna.

## O que está bom
- `getDupEntryInfo`/`isEmailDupEntry` mais robusto que o `isDupEntry` do outbox — inspeciona `e.cause` (Drizzle
  encadeia o erro mysql2) e o nome do índice, distinguindo `email-already-registered` de `user-repo-unavailable`.
- Mapper com tagged errors ricos (payload de evidência) cobrindo cada modo de corrupção de row, incl. a invariante
  `disabled ⟹ disabledAt` (`UserMapperMissingDisabledAt`).
- `buildUser` espelha o `buildContract` do contracts (mapper-err → `user-repo-unavailable`, logado em stderr).

## Próximo passo
- **APPROVED** → W3 (`ts-quality-checker` + `test:integration` contra MySQL real: CA7–CA9).
