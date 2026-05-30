# W1 — Implementação (GREEN)

- `domain/session/password-reset-token-id.ts` (novo): branded UUID v4, `generate`/`rehydrate` (espelha refresh-token-id).
- `domain/session/password-reset-token.ts` (novo): `PasswordResetToken { id, userId, tokenHash, requestedAt, expiresAt, usedAt }`. `issue` valida hash não-vazio + `expiresAt > requestedAt`. `state(now)` computa pending>expired>used. `consume(at)` é **one-time** (só `pending` → marca `usedAt`; `used`/`expired` retornam erro). Imutável (`immutable`), `tokenHash` opaco nunca em claro/log.

Domínio puro (Result/Readonly/switch exaustivo), sem infra. A entropia (randomBytes) e o sha256 ficam
no minter/adapter (ticket de persistência/request), igual ao refresh token (DD-LOGIN-02).
