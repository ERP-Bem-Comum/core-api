# AUTH-DB-REPO-SESSION (P3) — RefreshTokenRepository Drizzle + mapper

## Origem

Fase P, ticket 4 (depende de P0 schema). Adapter Drizzle do port `RefreshTokenRepository` (hoje só InMemory).
Reusa driver auth (`openAuthMysql`, P1) e schema `auth_*` (P0). O **mais simples** dos repos: `auth_refresh_token`
é tabela escalar (sem N:N, sem reconciliação, sem union de status). Mesmo fluxo de papéis (W1 em duas mãos).

## Fricção de FK (resolvida com `seedUser`)

`auth_refresh_token.user_id` tem FK `auth_rt_user_fk` RESTRICT → `auth_user`. A contract-suite gera `userId`
aleatórios (sem `auth_user` correspondente): no InMemory passa (sem FK), no Drizzle a FK falha. **Solução** (padrão
do `amendment-repository.suite.ts`, que faz o mesmo com `seedContract`): o factory ganha `seedUser(userId)`
idempotente — o Drizzle insere um `auth_user` mínimo; o InMemory faz no-op. A suite chama `seedUser(token.userId)`
antes de cada `save`.

## Escopo

### Tests (W0)
- **Estender** `refresh-token-repository.contract.ts`: `RefreshTokenRepoFactory` ganha `seedUser(userId): Promise<void>`
  (idempotente); cada `repository.save(token)` é precedido de `seedUser(token.userId)`.
- **Atualizar** `refresh-token-repository.inmemory.test.ts`: fornecer `seedUser` no-op (mantém CA verdes).
- **Criar** `refresh-token-repository.drizzle.test.ts` (gated `MYSQL_INTEGRATION`): `seedUser` insere `auth_user`
  mínimo (`id`, `email = <userId>@seed.local`, `status='active'`, timestamps via Clock); roda a contract-suite.

### Adapters (W1b)
- **Mapper** `mappers/refresh-token.mapper.ts`: `refreshTokenFromRow(row) → Result<RefreshToken, ...>` (escalar,
  sem agregação; `RefreshTokenId.rehydrate`/`UserId.rehydrate` na borda; `replacedBy` nullable) + `refreshTokenToInsert(token)`.
- **Repo** `repos/refresh-token-repository.drizzle.ts`: `createDrizzleRefreshTokenStore(handle) → { repository }`.
  - `save`: upsert por id (SELECT-FOR-UPDATE → UPDATE/INSERT) — issue insere; rotate/revoke atualizam (`revokedAt`/`replacedBy`).
  - `findById`: PK. `findByTokenHash`: `WHERE token_hash=?` (`auth_rt_token_hash_idx` UNIQUE). `findRevocableByUserId`:
    `WHERE user_id=? AND revoked_at IS NULL` (índice composto `auth_rt_user_revoked_idx`).
  - Sem `clock` (o RefreshToken já carrega `issued_at`/`expires_at`/`revoked_at` do domínio — nada de timestamp de persistência).

## Critérios de aceitação (contract-suite — InMemory **e** Drizzle)
Já cobertos (com `seedUser` antes de cada save):
- CA1 save→findById · CA2 findById null · CA3 save→findByTokenHash · CA4 findByTokenHash null · CA5 upsert (revogação) ·
  A6a/CA5–CA7 `findRevocableByUserId` (vazio; isolamento por userId; inclui active/expired/rotated, exclui revoked).
- **Drizzle-específico:** CA-D roda a suite via adapter (gated MYSQL_INTEGRATION).

## Decisões técnicas (DBA modela no W1a; sem decisão de negócio)
1. `save` upsert por id (SELECT-FOR-UPDATE; sem `ON DUPLICATE KEY` — ADR-0020). **Sem Clock** (token carrega seus instantes).
2. `token_hash` UNIQUE: colisão de sha256 é não-evento; violação → `'refresh-token-repo-unavailable'` genérico.
3. `replaced_by` é `varchar(36)` sem FK (P0 Decisão 4) → mapper só `rehydrate` se não-nulo.
4. `seedUser` no Drizzle: `auth_user` mínimo idempotente (INSERT; se já existe, ignora/no-op).

## Fora de escopo
- Wiring (P4). Purge de tokens expirados (futuro).

## Notas
- Fluxo: DBA W1a (queries simples + EXPLAIN dos índices token_hash/composto) → drizzle-orm-expert W1b → validação cruzada W2 → ts-quality-checker + integração W3.
