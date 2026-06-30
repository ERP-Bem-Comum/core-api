# W1 — Implementação (GREEN)

- `domain/session/password-reset-token-repository.ts` (port): `save`, `findByTokenHash` (lookup do confirm), `findUnusedByUserId` (critério armazenável `used_at IS NULL`, espelha `findRevocableByUserId`).
- `adapters/persistence/repos/password-reset-token-repository.in-memory.ts` (+ teste).
- `adapters/persistence/schemas/mysql.ts`: tabela `auth_password_reset` (id PK, user_id FK→auth_user RESTRICT, token_hash char(64) UNIQUE, requested_at/expires_at/used_at datetime(3), índice (user_id, used_at), CHECKs expiry + hash não-vazio) + tipos `$infer`.
- `adapters/persistence/mappers/password-reset-token.mapper.ts`: row↔domínio com tagged errors.
- `adapters/persistence/repos/password-reset-token-repository.drizzle.ts`: SELECT FOR UPDATE → UPDATE (só used_at) / INSERT; sem ON DUPLICATE KEY (ADR-0020); erros → `password-reset-token-repo-unavailable`.
- Migration `0001_luxuriant_triton.sql` gerada por `db:generate:auth` + hardening manual (COLLATE utf8mb4_bin nas colunas id/user_id/token_hash; ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci), espelhando a 0000.
- `.prettierignore`: ignora o `meta/` do drizzle-kit do auth (espelha contracts).
