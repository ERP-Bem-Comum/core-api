# W1 (GREEN) — AUTH-USECASE-REVOKE-SESSION

**Skill:** `ports-and-adapters` · **Resultado:** GREEN

## Arquivo criado

`src/modules/auth/application/use-cases/revoke-session.ts` — exporta `revokeSession` (single) e
`revokeAllSessions` (global). Nenhum port/adapter novo.

## Decisões de implementação

- **`revokeSession`:** `hash` → `findByTokenHash`; `null` → `ok(undefined)` (idempotente); senão
  `save(revoke(token, clock.now()))` (retorno direto do `save`).
- **`revokeAllSessions`:** `hash` → `findByTokenHash`; `null` → `ok(undefined)`; senão resolve `userId` do
  token → `findRevocableByUserId` → `revoke`+`save` em cada (`now` capturado uma vez).
- **Idempotência** (DD-SESSION-06): not-found nunca é erro; `revoke` de já-revogado é no-op (agregado).
- `found.value === null` explícito (sem nullable boolean); `Clock.now()`, nunca `new Date()`; zero `throw`/`class`.
- Lint antecipado no W1 (lição do A6b): `eslint` dos 2 arquivos limpo de primeira.

## Verificação

```
A7 (revoke-session.test.ts): tests 6 · pass 6 · fail 0
suíte auth completa:         tests 136 · pass 136 · fail 0
tsc --noEmit:                sem erros
eslint (2 arquivos):         sem problemas
prettier --check .:          clean
```

## Handoff para W2 (`code-reviewer`)

Auditar: idempotência (null → ok), `Clock.now()`, ausência de `throw`/`class`, e que `revokeAllSessions`
resolve o `userId` pelo refresh apresentado (não recebe `userId` no contrato — DD-SESSION-06).
