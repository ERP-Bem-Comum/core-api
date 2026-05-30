# W1 — Implementação (GREEN)

- `application/use-cases/confirm-password-reset.ts`: `findByTokenHash(minter.hash(token))` → `reset-token-invalid` se null; valida `Password.parse(newPassword)` ANTES de `consume` (não queima token por senha fraca); `ResetToken.consume(now)` (one-time + TTL); `User.parseActive`; `passwordHasher.hash`; `User.changePassword` + `userRepo.save`; `resetTokenRepo.save(consumed)` (marca usado); `revokeAllForUser` (revoga todas as sessões, ASVS V3.3).
- `adapters/http/{schemas,plugin}.ts`: `resetPasswordBodySchema` + rota `POST /reset-password` (rate-limit dedicado; 204/400/422/403).
- `adapters/http/composition.ts`: `confirmPasswordReset` fiado (resetMinter, userReader/Repo, passwordHasher, refreshTokenRepo, clock) e exposto em `AuthHttpDeps`.
