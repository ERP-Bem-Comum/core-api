# W1 (GREEN) — AUTH-SESSION-REFRESH-PRIMITIVES

**Skill:** `ports-and-adapters` · **Resultado:** GREEN

## Arquivos modificados

| Arquivo | Mudança |
| :-- | :-- |
| `src/modules/auth/application/ports/refresh-token-minter.ts` | + `hash: (rawToken: string) => string` no port |
| `src/modules/auth/adapters/crypto/refresh-token-minter.node.ts` | extraído `sha256Hex`; `mint` reusa; `hash = sha256Hex` |
| `src/modules/auth/adapters/crypto/refresh-token-minter.fake.ts` | + `hash: (raw) => \`${raw}-hash\`` (consistente com `mint`) |
| `src/modules/auth/domain/session/refresh-token-repository.ts` | + `findRevocableByUserId(userId) => Promise<Result<readonly RefreshToken[], E>>`; import `UserId` |
| `src/modules/auth/adapters/persistence/repos/refresh-token-repository.in-memory.ts` | + `findRevocableByUserId` (filtra `userId` + `revokedAt === null`) |

## YAGNI

- Sem adapter MySQL/Drizzle do repo (Fase P futura) — só o port + InMemory, como os métodos existentes.
- `hash` síncrono, sem `Result` (sha256 não falha) — conforme port `mint`.
- Filtro `revokedAt === null` (armazenável), **não** estado `active` (temporal, exigiria Clock no repo — DD-SESSION-01).

## Verificação

```
A6a (3 arquivos de teste): tests 20 · pass 20 · fail 0
suíte auth completa:        tests 122 · pass 122 · fail 0   (zero regressão)
tsc --noEmit:               sem erros
```

## Handoff para W2 (`code-reviewer`)

Mudança de port (`RefreshTokenRepository`, `RefreshTokenMinter`) — verificar que o único consumidor-objeto do port (`refresh-token-repository.in-memory.ts`) implementa o método novo (typecheck confirma); demais consumidores (`authenticate-user`) usam só `save`/`mint`. Honra DD-SESSION-05 e DD-SESSION-01.
