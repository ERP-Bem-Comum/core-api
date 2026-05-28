# W1 (GREEN) — AUTH-USECASE-REFRESH-ACCESS

**Skill:** `ports-and-adapters` · **Resultado:** GREEN

## Arquivo criado

`src/modules/auth/application/use-cases/refresh-access-token.ts` — factory function `refreshAccessToken`
espelhando `authenticate-user`. Nenhum port/adapter novo (A6a entregou os primitivos).

## Decisões de implementação

- **Sequência:** hash → `findByTokenHash` → `verify` → (reuse detection se rotated) → `findById` user
  (defense-in-depth) → `rotate` antigo + `save` → `mint`+`issue` novo + `save` → `issueAccessToken`.
- **Switch exaustivo** sobre `RefreshTokenError` no tratamento do `verify`: `rotated` dispara `revokeChain`;
  `revoked`/`expired` propagam; os 2 erros de `issue` (`hash-empty`/`expiry-before-issue`) — que `state()`
  nunca produz — mapeiam para `session-issue-failed` (fail-closed). Atende `switch-exhaustiveness-check`.
- **`revokeChain`** (helper privado): `findRevocableByUserId` → `revoke`+`save` para cada. Mutação no
  Functional Core (DD-SESSION-05).
- **`user.value === null` ∨ `parseActive` falho** → revoga o refresh apresentado + `err('user-disabled')`
  (DD-SESSION-04; null cobre conta ausente, fail-closed).
- **`Clock.now()`** capturado uma vez em `now`; nenhum `new Date()` exceto o cálculo de `expiresAt` (delta
  sobre `now`, igual ao `authenticate-user`).
- **Sem evento** no output — espelha `authenticate-user`; `AccessTokenRefreshed` entra com o EventBus futuro.

## Verificação

```
A6b (refresh-access-token.test.ts): tests 7 · pass 7 · fail 0
suíte auth completa:                tests 129 · pass 129 · fail 0   (zero regressão)
tsc --noEmit:                       sem erros
```

## Handoff para W2 (`code-reviewer`)

Auditar: sequência canônica, ausência de `throw`/`class`/`new Date()` indevido, switch exaustivo, ordem das
operações de save (antigo `rotated` antes do novo), e aderência a DD-SESSION-04/05.
