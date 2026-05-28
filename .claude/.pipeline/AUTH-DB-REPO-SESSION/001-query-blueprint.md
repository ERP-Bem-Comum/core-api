# Query Blueprint (W1a — DBA) — AUTH-DB-REPO-SESSION

**Autor:** `mysql-database-expert` (agentId af45ed3a3535808a8) · **Data:** 2026-05-27 · **Read-only**.

> Herda padrões do P1 (`AUTH-DB-REPO-USER/001-query-blueprint.md`): `safe()`→Result, SELECT-FOR-UPDATE upsert,
> `buildX`. Repo escalar (sem N:N, sem reconciliação, **sem Clock** — o token carrega seus instantes).

- **`save(token)`**: transação — SELECT id `.for('update')` → UPDATE (revoke/rotate: só `revoked_at`/`replaced_by`)
  ou INSERT (issue). **Sem `ON DUPLICATE KEY`** (ADR-0020; o UNIQUE `token_hash` tornaria ODKU ambíguo). Colisão
  sha256 em `token_hash` = não-evento → `refresh-token-repo-unavailable` genérico via catch.
- **`findById`**: PK (`type=const`); null → `ok(null)`.
- **`findByTokenHash`**: `WHERE token_hash=?` (`auth_rt_token_hash_idx` UNIQUE, `type=const`).
- **`findRevocableByUserId`**: `WHERE user_id=? AND revoked_at IS NULL` (`and()`+`isNull()`); índice composto
  `auth_rt_user_revoked_idx` (`type=ref`, IS NULL usa o índice — Refman §8.2.1.1). Retorna `readonly RefreshToken[]`.
  **Inclui `rotated`** (replacedBy≠null mas revokedAt=null) — correto (DD-SESSION-05/A6a: revogável = revokedAt null).
- **Mapper `refreshTokenFromRow`** (escalar): `RefreshTokenId.rehydrate`/`UserId.rehydrate` na borda; `tokenHash`
  opaco; `revokedAt` Date|null; `replacedBy` rehydrate só se ≠null. Tagged errors → `buildRefreshToken` →
  `refresh-token-repo-unavailable`. `refreshTokenToInsert(token)`.

## Implementador (W1b)
1. `createDrizzleRefreshTokenStore(handle)` — **sem Clock**.
2. `save` em `db.transaction` (SELECT-FOR-UPDATE); UPDATE toca só `revoked_at`/`replaced_by`. catch → genérico.
3. `findRevocableByUserId` → array (nunca null); `isNull()`+`and()`. `findById`/`findByTokenHash` via `safe()`.
4. `replaced_by` sem FK (P0 Decisão 4); mapper rehydrate só se ≠null. `mode:'date'` já retorna Date.
