# W1 — Implementação (GREEN)

## BE-REC-005 — blocklist (domínio)

- `src/modules/auth/domain/credential/password-blocklist.ts` (novo): `isCommon(raw)`, lista local offline (sem rede — supply-chain ADR-0011), comparação case-insensitive.
- `password-policy.ts`: novo erro `password-too-common`; `parse` checa `isCommon` após o comprimento.
- Rotas mapeiam `password-too-common` → 422 (register + change-password).

## BE-REC-002 — dummy-hash (anti-timing)

- `authenticate-user.ts`: nova dep `dummyPasswordHash: PasswordHash`. No ramo usuario-inexistente, roda `passwordHasher.verify(password, dummyPasswordHash)` (resultado descartado) antes de `invalid-credentials`. **Port intacto** (dep injetada, sem quebrar fakes).
- `composition.ts`: computa o dummy hash uma vez no boot (senha aleatoria via `randomBytes`).

## BE-REC-004 — rotas HTTP

- `revoke-session.ts`: novo `revokeAllSessionsForUser({ userId })` (variante por userId, p/ rota autenticada — o JWT da o userId, nao o refresh).
- `schemas.ts`: `changePasswordBodySchema` (currentPassword + newPassword; userId nunca vem do body).
- `composition.ts`: expõe `changePassword` + `revokeAllSessionsForUser`.
- `plugin.ts`: `POST /change-password` e `POST /sessions/revoke-all` (ambas `requireAuth`); userId via `UserId.rehydrate(req.userId)`.

Aderência: domínio puro (Result/branded), application factory `(deps)=>(input)=>Promise<Result>`, borda Zod (ADR-0027), userId só do JWT (nunca do body — IDOR-safe).
