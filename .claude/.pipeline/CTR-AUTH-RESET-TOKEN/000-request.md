# CTR-AUTH-RESET-TOKEN — Domínio do token de reset de senha (BE-REC-003, 1/4)

> **Size:** S · **Épico:** `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md` · **Origem:** spec 003.

## Escopo

Primeiro ticket da cadeia de reset de senha: o **domínio puro** do token. Token opaco (alta entropia
gerada no adapter futuro), `tokenHash` persiste / claro vai ao e-mail; **one-time** + **TTL curto**.

## Decisão de localização

`domain/session/` (junto de `refresh-token`), por analogia técnica: token opaco com hash + expiração
+ estados. Conceitualmente liga a credential, mas o mecanismo é de sessão efêmera.

## Fora de escopo (próximos da cadeia)

- `CTR-AUTH-RESET-PERSISTENCE` — schema Drizzle + repo (`auth_password_reset`).
- `CTR-AUTH-RESET-REQUEST` — use case + EmailPort + rota `/forgot-password` (anti-enumeração, origem confiável).
- `CTR-AUTH-RESET-CONFIRM` — use case (one-time, TTL, revoga sessões) + rota `/reset-password`.

## Critérios de aceite

- [x] `PasswordResetToken` puro: `issue` (valida hash não-vazio + expiry > request), `state` (pending>expired>used), `consume` (one-time).
- [x] `PasswordResetTokenId` (UUID v4, espelha refresh-token-id).
- [x] typecheck + lint + format + testes auth verdes.
