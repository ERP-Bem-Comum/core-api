# W0 (RED) — AUTH-SESSION-REFRESH-PRIMITIVES

**Skill:** `tdd-strategist` · **Resultado:** RED (falha por inexistência da API)

## Testes escritos (estendendo suites existentes)

| Arquivo | Casos adicionados | Cobre |
| :-- | :-- | :-- |
| `tests/modules/auth/application/ports/refresh-token-minter.contract.ts` | `A6a/CA1` hash não-vazio · `A6a/CA2` invariante `hash(mint().token) === mint().tokenHash` · `A6a/CA3` determinismo | CA1–CA3 (fake **e** node, via contract-suite) |
| `tests/modules/auth/adapters/crypto/refresh-token-minter.node.test.ts` | `A6a/CA4` `hash(x) === sha256(x)` hex | CA4 |
| `tests/modules/auth/adapters/persistence/refresh-token-repository.contract.ts` | `A6a/CA5` vazio → `[]` · `A6a/CA6` isolamento por `userId` · `A6a/CA7` inclui active/expired/rotated, exclui revoked | CA5–CA7 |

Helper novo na suite do repo: `buildTokenFor(userId, tokenHash, issuedAt?, expiresAt?)` + constantes `PAST_ISSUED/PAST_EXPIRES` (token "expirado" com `revokedAt === null`). `buildToken` original reescrito sobre o helper (sem mudar comportamento).

CA8 (regressão `save`/`findById`/`findByTokenHash`) é coberto pelos casos CA1–CA5 preexistentes — sem teste novo.

## Saída RED (trechos)

```
✖ A6a/CA4: hash(x) = sha256(x) em hex
  TypeError: makeNodeRefreshTokenMinter(...).hash is not a function
✖ A6a/CA5: findRevocableByUserId sem tokens do usuario retorna []
  TypeError: repository.findRevocableByUserId is not a function
✖ A6a/CA6: findRevocableByUserId retorna apenas tokens do userId informado
  TypeError: repository.findRevocableByUserId is not a function
✖ A6a/CA7: inclui active/expired/rotated (revokedAt === null); exclui revoked
  TypeError: repository.findRevocableByUserId is not a function
```

Os casos `A6a/CA1..3` (contract-suite do minter) falham com `minter.hash is not a function` nas duas execuções (fake + node).

## Handoff para W1 (`ports-and-adapters`)

1. `RefreshTokenMinter` port: + `hash: (rawToken: string) => string`.
2. `refresh-token-minter.node.ts`: `hash = sha256(raw)` hex.
3. `refresh-token-minter.fake.ts`: `hash = \`${raw}-hash\`` (consistente com `mint`).
4. `RefreshTokenRepository` port: + `findRevocableByUserId(userId) => Promise<Result<readonly RefreshToken[], E>>`.
5. `refresh-token-repository.in-memory.ts`: varredura por `userId` filtrando `revokedAt === null`.
