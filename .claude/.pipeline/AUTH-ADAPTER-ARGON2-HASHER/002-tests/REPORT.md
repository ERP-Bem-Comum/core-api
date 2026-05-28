# W0 — Testes RED · AUTH-ADAPTER-ARGON2-HASHER (X1)

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED · **Decisões:** DD-CRYPTO-01, DD-PORTS-01.

## Artefatos
- `tests/modules/auth/application/ports/password-hasher.contract.ts` — suite comum (CA1-3).
- `tests/modules/auth/adapters/crypto/password-hasher.fake.test.ts` — contract vs fake.
- `tests/modules/auth/adapters/crypto/password-hasher.argon2.test.ts` — contract + CA4-5 (salt/PHC) vs argon2 real.

## Mapa CA → teste
| CA | Caso |
| :-- | :-- |
| CA1 | `hash(plain)` → `ok(PasswordHash)` não-vazio (fake + argon2) |
| CA2 | `verify(plain, hash)` correto → `ok(true)` |
| CA3 | `verify(outraPlain, hash)` errado → `ok(false)` |
| CA4 | argon2: `hash` 2× do mesmo plain → hashes diferentes (salt) |
| CA5 | argon2: formato PHC `$argon2id$` |

## Saída (RED)
```
ℹ tests 2 · pass 0 · fail 2  (ERR_MODULE_NOT_FOUND)
```
Falta port + fake + argon2 adapters. `src/` intocado. `hash-wasm@4.12.0` instalada.

## Decisões W1
- Fake: `node:crypto` sha256 + `timingSafeEqual` (determinístico, one-way, zero dep) — `hash(plain)` igual sempre; `verify` recomputa e compara.
- Argon2: `hash-wasm` `argon2id`/`argon2Verify`, params OWASP (m=19456, t=2, p=1, len=32, salt 16 bytes, `outputType: 'encoded'`).
