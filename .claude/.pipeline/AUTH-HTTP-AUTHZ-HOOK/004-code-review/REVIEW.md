# Code Review — AUTH-HTTP-AUTHZ-HOOK (H2) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (+ lente security-backend)
**Data:** 2026-05-28
**Escopo:** `auth/adapters/http/{auth-hook,composition,plugin,schemas}.ts`, `auth/public-api/http.ts`, `tests/.../authz-hook.test.ts`

---

## Verificação

| Item | Resultado |
| :-- | :-- |
| ADR-0024 (RBAC, fail-closed) | ✅ `requireAuth` valida JWT; `makeAuthorize` reusa `authorize` puro (DD-USER-02), default-deny |
| ADR-0005 (defense-in-depth) | ✅ core re-valida o access JWT (não confia só no BFF) |
| ADR-0025 / preHandler | ✅ hook em `adapters/http/`; `/me` handler fino; `preHandlerAsyncHookHandler` |
| ADR-0006/0028 | ✅ hook exposto via `auth/public-api/http.ts`; `AuthHttpDeps += verifyAccessToken` |
| ADR-0027 | ✅ `/me` response Zod; path no `/docs/json` (CA5) |
| security-backend (401/403 fail-closed, sem vazar motivo) | ✅ 401 uniforme (ausente/malformado/inválido = mesma resposta); 403 forbidden; sem detalhe vazado |
| Regras (throw/class/any) | ✅ nenhum |
| Sem dep nova | ✅ |
| Regressão | ✅ 1426 pass / 0 fail; register/login/refresh/logout verdes |

## Observações (não-bloqueantes)
- **`makeAuthorize` ainda não exercitado por rota** (D1: exposto p/ uso futuro). Código correto por tipos; será coberto pela 1ª rota por-permissão (change-password/assign-role HTTP). Documentado.
- Module augmentation `FastifyRequest.userId` global — aceitável; `decorateRequest` default `''` evita undefined.
- `req.userId` é `string` (não `UserId` branded) na request — ok para transporte; `makeAuthorize` rehydrata antes de usar no domínio.

## O que está bom
- 401 uniforme (enumeração/oracle-safe) consistente com o login do H1a.
- `requireAuth` por injeção (`verifyAccessToken`) — testável com memory, sem segredo externo.
- `/me` é prova real (não sentinela) e endpoint útil.

## Issues
Nenhuma. → W3.
