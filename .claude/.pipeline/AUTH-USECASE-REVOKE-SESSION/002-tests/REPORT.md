# W0 (RED) — AUTH-USECASE-REVOKE-SESSION

**Skill:** `tdd-strategist` · **Resultado:** RED (módulo inexistente)

## Teste escrito

`tests/modules/auth/application/use-cases/revoke-session.test.ts` — `makeCtx` espelha o do
`refresh-access-token.test.ts`; `registerOnce` + `login` populam sessões (cada `login` = um `authenticate`
→ refresh distinto, simula múltiplos dispositivos). `findByClear` resolve o token persistido pela convenção
do fake minter (`tokenHash === ${clear}-hash`).

| Caso | Cobre |
| :-- | :-- |
| CA1 | `revokeSession` refresh válido → `ok`; token `revoked`; `verify` → `refresh-token-revoked` |
| CA2 | `revokeSession` inexistente → `ok` (idempotente) |
| CA3 | `revokeSession` 2× → `ok`; `revokedAt` não muda na 2ª (no-op do agregado) |
| CA4 | `revokeAllSessions` 2 sessões do usuário → `ok`; ambas `revoked` |
| CA5 | `revokeAllSessions` não toca sessões de outro usuário |
| CA6 | `revokeAllSessions` inexistente → `ok` (idempotente) |

## Saída RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../use-cases/revoke-session.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Handoff para W1 (`ports-and-adapters`)

Criar `src/modules/auth/application/use-cases/revoke-session.ts` exportando `revokeSession` e
`revokeAllSessions` conforme `000-request.md`. Idempotente (null → `ok`); `Clock.now()` no `revoke(token, at)`.
Sem ports/adapters novos.
