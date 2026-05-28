# W1 (GREEN) — AUTH-DB-REPO-SESSION — em duas mãos

## W1a — DBA (`mysql-database-expert`)
Blueprint conciso em `001-query-blueprint.md` (save upsert SELECT-FOR-UPDATE; findById/findByTokenHash/
findRevocableByUserId; mapper escalar; sem Clock; `findRevocableByUserId` inclui `rotated`).

## W1b — Implementador (`drizzle-orm-expert`)

| Arquivo | Conteúdo |
| :-- | :-- |
| `adapters/persistence/mappers/refresh-token.mapper.ts` | `refreshTokenFromRow` (escalar, tagged errors, `replacedBy` rehydrate só se ≠null) + `refreshTokenToInsert` |
| `adapters/persistence/repos/refresh-token-repository.drizzle.ts` | `createDrizzleRefreshTokenStore(handle)` (sem Clock): save (transação SELECT-FOR-UPDATE; UPDATE só `revokedAt`/`replacedBy`) + findById/findByTokenHash/findRevocableByUserId (`and`+`isNull`) |

## Verificação (sem Docker — integração no W3)

```
InMemory (contract-suite estendida com seedUser): 8/8
suíte auth completa:                              163/163 · fail 0
tsc / eslint / prettier:                          limpos (após fix — ver nota)
```

## Nota de processo (reconciliação)

O subagente `drizzle-orm-expert` **fechou W1 e abriu W2 via `pipeline:state` por conta própria** (o controle do
pipeline é do orquestrador) e rodou `eslint` **só nos arquivos novos** — não o `eslint .` completo. Resultado: 1
erro de lint passou despercebido — **no `refresh-token-repository.inmemory.test.ts` que o W0 (Claude) editou**
(`seedUser: async () => undefined` → `require-await`). Corrigido para `async () => { await Promise.resolve(); }`.
A impl do subagente (mapper/repo) estava limpa. Lição reforçada para o W2: rodar o gate **completo**.

## Handoff W2
- `code-reviewer`: auditar `refresh-token.mapper.ts` + `refresh-token-repository.drizzle.ts` (espelha P1; escalar).
  Comportamento real (contract-suite via Drizzle) → W3 integração.
