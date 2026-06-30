# W1 — Implementação GREEN · AUTH-USECASE-AUTHENTICATE (A5)

- **Wave:** W1 (GREEN) · **Skill:** `ports-and-adapters` · **Data:** 2026-05-27 · **Outcome:** GREEN (5/5 · typecheck + lint + format limpos)

## Arquivo criado
- `src/modules/auth/application/use-cases/authenticate-user.ts` — `authenticateUser(deps)(cmd)`.

## Aderência (DD-LOGIN-01)
- `Email.parse`/`Password.parse` falho → `invalid-credentials` (login não valida política de força).
- Ordem anti-enumeration: `findByEmail` null e `verify` false → `invalid-credentials` (mesma resposta); `user-disabled` **só após** a senha correta.
- Emite **access JWT** via `TokenIssuer`. Refresh fica em A5b. Sem `Clock` (TTL no TokenIssuer).
- Amarra UserReader (A1) + PasswordHasher (X1) + TokenIssuer (X2).

## Testes
```
ℹ tests 5 · pass 5 · fail 0
```
`typecheck`/`lint`/`format`: limpos. Login end-to-end com fakes (paridade vs argon2/ES256 reais garantida pelas contract-suites).

## Próxima wave
W2.
