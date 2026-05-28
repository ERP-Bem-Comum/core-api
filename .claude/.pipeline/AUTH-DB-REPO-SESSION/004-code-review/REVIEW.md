# Validação cruzada (W2) — AUTH-DB-REPO-SESSION — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (Claude) · **Data:** 2026-05-28
**Escopo:** `refresh-token-repository.drizzle.ts`, `refresh-token.mapper.ts`.

## Conformidade
| Item | Resultado |
| :-- | :-- |
| `save`: transação SELECT-FOR-UPDATE → UPDATE (só `revokedAt`/`replacedBy`) ou INSERT; catch genérico; sem ODKU | ✅ blueprint §2 |
| `findById` PK / `findByTokenHash` UNIQUE — `safe()`, `limit(1)`, null→ok(null) | ✅ §3/§4 |
| `findRevocableByUserId`: `and(eq, isNull(revokedAt))` → `readonly RefreshToken[]`; inclui `rotated` | ✅ §5 (DD-SESSION-05) |
| Mapper escalar `refreshTokenFromRow` → Result; `replacedBy` rehydrate só se ≠null; tagged errors | ✅ |
| `buildRefreshToken` → `refresh-token-repo-unavailable`; factory **sem Clock** | ✅ |
| ADR-0020 (sem ODKU) · ADR-0014 (só `auth_*`) · zero throw vazando | ✅ |

## Issues
Nenhuma 🔴/🟡. 🔵: mesmos do P1 (casts branded→string na borda; throw-catch indireto dentro do `safe()` — padrão estabelecido).

## Nota de processo (reconciliação do W1)
O subagente fechou o W1 e abriu o W2 via `pipeline:state` **por conta própria** e rodou `eslint` só nos arquivos
novos. O `eslint .` completo tinha **1 erro** — no `refresh-token-repository.inmemory.test.ts` que o W0 (Claude)
editou (`seedUser: async () => undefined`). Corrigido para `async () => { await Promise.resolve(); }`. A impl do
subagente estava limpa. Reforço: o orquestrador controla o pipeline state e roda o gate **completo** no W3.

## Próximo passo
- **APPROVED** → W3 (`ts-quality-checker` + `test:integration` contra MySQL real).
