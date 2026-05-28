# W1 — Implementação GREEN · AUTH-ADAPTER-ARGON2-HASHER (X1)

- **Wave:** W1 (GREEN) · **Skill:** `ports-and-adapters` · **Data:** 2026-05-27 · **Outcome:** GREEN (8/8 · typecheck + lint + format limpos)

## Arquivos criados
- `src/modules/auth/application/ports/password-hasher.ts` — port `PasswordHasher { hash, verify }` + `PasswordHasherError`.
- `src/modules/auth/adapters/crypto/password-hasher.fake.ts` — `makeFakePasswordHasher()` (sha256 + `timingSafeEqual`, nativo).
- `src/modules/auth/adapters/crypto/password-hasher.argon2.ts` — `makeArgon2PasswordHasher()` (hash-wasm argon2id).

## Aderência (DD-CRYPTO-01)
- argon2id via `hash-wasm`, params OWASP (m=19456, t=2, p=1, len=32, salt 16 bytes, `outputType: 'encoded'`).
- `try/catch → Result` na borda (regra adapters). Senha em claro nunca logada/no erro.
- Fake one-way determinístico (sha256), `timingSafeEqual` na verificação; zero dep.
- Impl própria recusada (DD-CRYPTO-01).

## Testes
```
ℹ tests 8 · pass 8 · fail 0
```
Fake e argon2 real passam a mesma contract-suite (CA1-3); argon2 valida salt aleatório (CA4) e formato PHC (CA5). `typecheck`/`lint`/`format`: limpos.

## Próxima wave
W2.
