# AUTH-ADAPTER-ARGON2-HASHER (X1) — port `PasswordHasher` + fake + adapter argon2id (hash-wasm)

## Origem

Fase X, ticket X1. Decisões: [`design-decisions.md`](../../../handbook/domain/auth/design-decisions.md)
`DD-CRYPTO-01` (argon2id via `hash-wasm` WASM puro; impl própria proibida) + `DD-PORTS-01` (PasswordHasher
é capacidade técnica → `application/ports/`). ADR-0024 (`:125`, argon2id no adapter). Dep `hash-wasm@4.12.0` já instalada.

## Arquivos a criar

- `src/modules/auth/application/ports/password-hasher.ts` — port `PasswordHasher` + `PasswordHasherError`.
- `src/modules/auth/adapters/crypto/password-hasher.fake.ts` — `makeFakePasswordHasher()` (sha256 + `timingSafeEqual`, nativo, determinístico — testes/CLI).
- `src/modules/auth/adapters/crypto/password-hasher.argon2.ts` — `makeArgon2PasswordHasher()` (hash-wasm argon2id, params OWASP).
- `tests/modules/auth/application/ports/password-hasher.contract.ts` — `runPasswordHasherContract(label, factory)`.
- `tests/modules/auth/adapters/crypto/password-hasher.fake.test.ts` + `password-hasher.argon2.test.ts`.

## Contrato (type)

```ts
type PasswordHasherError = 'password-hash-failed' | 'password-verify-failed';
type PasswordHasher = Readonly<{
  hash:   (plain: Password)                    => Promise<Result<PasswordHash, PasswordHasherError>>;
  verify: (plain: Password, hash: PasswordHash) => Promise<Result<boolean, PasswordHasherError>>;
}>;
```

> Recebe `Password` (claro validado pela política) e produz `PasswordHash` (opaco). `try/catch → Result` na borda.

## Critérios de aceitação

### Contract-suite (comum a fake E argon2)
- **CA1:** `hash(plain)` → `ok(PasswordHash)` não-vazio.
- **CA2:** `verify(plain, hash)` da senha **correta** → `ok(true)`.
- **CA3:** `verify(outraPlain, hash)` da senha **errada** → `ok(false)`.

### Específicos do argon2 (só no `argon2.test.ts`)
- **CA4:** `hash` do mesmo `plain` duas vezes → hashes **diferentes** (salt aleatório).
- **CA5:** o hash produzido está no formato PHC `$argon2id$...`.

## Invariantes (segurança — DD-CRYPTO-01 / DD-USER-04)

- argon2id com params OWASP: `memorySize` 19456 KiB, `iterations` 2, `parallelism` 1, `hashLength` 32, salt 16 bytes.
- Senha em claro **nunca** logada nem incluída no erro. Verificação do fake via `timingSafeEqual`.
- Impl própria de argon2 **proibida** (DD-CRYPTO-01).

## Notas

- **Skill:** `ports-and-adapters` (+ `nodejs-runtime-expert` para `node:crypto`/hash-wasm). `try/catch` permitido no adapter, convertido a `Result`.
- **Pipeline W0→W3.** RED: os 2 `*.test.ts` falham (port + adapters inexistentes). ASCII puro.
