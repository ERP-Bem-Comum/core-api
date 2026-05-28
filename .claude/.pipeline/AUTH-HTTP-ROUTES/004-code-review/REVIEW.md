# Code Review — AUTH-HTTP-ROUTES (H1a) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (+ lentes ports-and-adapters, security-backend)
**Data:** 2026-05-28
**Escopo:** `auth/adapters/http/{composition,schemas,plugin}.ts`, `auth/public-api/http.ts`, `src/server.ts`, `tests/.../http/routes.test.ts`

---

## Verificação

| Item | Resultado |
| :-- | :-- |
| ADR-0006/0028 (cross-módulo via public-api) | ✅ `server.ts` importa só `auth/public-api/http.ts` (factory + builder); plugin recebe use cases por injeção, não conhece adapters |
| ADR-0025:29,35-37 (HTTP adapter; `/api/v2/*`; root único; validação) | ✅ rotas em `adapters/http/`; `/api/v2/auth/*`; `server.ts` compõe; Zod (shape) + use case (invariante via smart constructor) |
| ADR-0027 (Zod só na borda; OpenAPI gerado) | ✅ `schemas.ts` na borda; 2 paths no `/docs/json`; `__ping` removida (CA11) |
| ADR-0024 / DD-TOKEN-01 (refresh opaco, ES256) | ✅ login devolve access JWT + refresh opaco; chaves ES256 injetadas/efêmeras |
| security-backend (401/403, enumeração-safe, no-store) | ✅ 401 uniforme p/ email inexistente vs senha errada (CA6); 403 disabled; no-store (CA12); register 201 não vaza agregado (só `{userId,email}`) |
| ports-and-adapters / rules | ✅ use cases factory `(deps)=>(cmd)=>Result`; plugin só invoca; sem regra de negócio na borda |
| Regras absolutas (throw/class/any) | ✅ `throw` só no composition boot (mysql fail) — fora do fluxo de request; sem class/any |
| Sem dep nova (ADR-0011) | ✅ usa jose/argon2/drizzle já presentes |
| Regressão | ✅ 1416 pass / 0 fail; shell+baseline verdes; sentinela removida |

## Observações (não-bloqueantes)
- `throw` no `buildStores` (mysql fail) é boot-time (server.ts main captura) — aceitável; não é o fluxo Result de request.
- Branch mysql do composition não é coberto por teste automatizado (exige DB) — coberto pela suíte de integração auth (`MYSQL_INTEGRATION=1`); o memory cobre o caminho HTTP.
- `loadOrGenerateKeys` fallback efêmero loga implícito — considerar `app.log.warn` em prod sem env de chave (follow-up; não bloqueia).

## O que está bom
- `AuthHttpDeps` = use cases instanciados → fronteira ADR-0006 limpa e plugin testável com memory sem DB.
- Composition monta os 4 use cases já → H1b (refresh/logout) fica trivial.
- Enumeração-safe no login + mapeamento erro→HTTP completo e correto.

## Issues
Nenhuma 🔴 / 🟡 / 🔵.

## Próximo passo
APPROVED → W3 (gate já verde). H1b (`AUTH-HTTP-ROUTES-SESSION`: refresh+logout) a abrir.
