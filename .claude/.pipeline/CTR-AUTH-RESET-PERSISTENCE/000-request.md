# CTR-AUTH-RESET-PERSISTENCE — Persistência do token de reset (BE-REC-003, 2/4)

> **Size:** M · **Épico:** `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md`.

## Escopo

Port + adapters de persistência do `PasswordResetToken` (domínio entregue em `CTR-AUTH-RESET-TOKEN`):
port `PasswordResetTokenRepository`, InMemory, schema Drizzle `auth_password_reset`, mapper, repo
Drizzle, migration. Espelha o `RefreshToken` (mesmo padrão de token opaco persistido).

## Fora de escopo

- Minter (`randomBytes`+sha256) e wiring no composition → entram em `CTR-AUTH-RESET-REQUEST` (onde são usados).
- Validação de integração MySQL → não roda nesta sessão (porta 3306 ocupada por container alheio).

## Critérios de aceite

- [x] Port `PasswordResetTokenRepository` (save, findByTokenHash, findUnusedByUserId).
- [x] InMemory adapter + teste (save/find/findUnused).
- [x] Schema `auth_password_reset` (PK, FK→auth_user RESTRICT, UNIQUE token_hash, índice (user_id, used_at), CHECKs).
- [x] Mapper row↔domínio (tagged errors) + repo Drizzle (SELECT FOR UPDATE → UPDATE used_at / INSERT).
- [x] Migration `0001_luxuriant_triton.sql` com hardening manual (COLLATE utf8mb4_bin + ENGINE/CHARSET), espelhando a 0000.
- [x] typecheck + lint + format + testes auth verdes.
