# CTR-AUTH-RESET-CONFIRM — Confirmação do reset de senha (BE-REC-003, 4/4)

> **Size:** M · **Épico:** `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md`. **Fecha a cadeia de reset.**

## Escopo

Use case `confirmPasswordReset` + rota `POST /reset-password`: consome o token (one-time + TTL),
troca a senha e **revoga todas as sessões** (OWASP ASVS V3.3).

## Critérios de aceite

- [x] `confirmPasswordReset`: lookup por `findByTokenHash(minter.hash(token))`; valida nova senha ANTES de consumir (não queima token por senha fraca); `consume` (one-time + TTL); `User.changePassword` + nova hash; marca token usado; **revoga todas as sessões**.
- [x] Erros: `reset-token-invalid` (não encontrado/user sumiu), `reset-token-expired`/`reset-token-used` (consume), policy errors, `user-disabled`.
- [x] Rota `POST /reset-password` (rate-limit dedicado): 204 ok; 400 token inválido/expirado/usado; 422 senha; 403 disabled.
- [x] Composition: `confirmPasswordReset` fiado (resetMinter, refreshTokenRepo, etc.).
- [x] typecheck + lint + format + testes auth verdes.

## Pendência

- Integração MySQL não exercida (porta 3306 ocupada). Comportamento coberto por testes in-memory.
