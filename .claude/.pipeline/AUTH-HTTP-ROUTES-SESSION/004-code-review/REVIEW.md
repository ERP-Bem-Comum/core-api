# Code Review — AUTH-HTTP-ROUTES-SESSION (H1b) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (+ lente security-backend)
**Data:** 2026-05-28
**Escopo:** `auth/adapters/http/{schemas,plugin}.ts`, `tests/.../http/session.test.ts`

---

## Verificação

| Item | Resultado |
| :-- | :-- |
| ADR-0025/0027 (HTTP adapter; Zod borda; OpenAPI) | ✅ 2 rotas; 2 schemas; 2 paths novos no `/docs/json` (CA11) |
| ADR-0024 / DD-SESSION-04/05/06 | ✅ refresh valida user/rotaciona; logout idempotente (CA10b) — lógica no use case, rota só traduz |
| ADR-0006 | ✅ reusa `AuthHttpDeps` (use cases); plugin não conhece adapters; composition intacto |
| security-backend (401 refresh inválido; 204 sem body) | ✅ refresh-token-* → 401 uniforme; logout 204 sem payload; no-store (baseline) cobre /api/v2 |
| Regras (throw/class/any) | ✅ nenhum; handlers finos |
| Sem dep nova / sem tocar composition | ✅ só schemas + 2 rotas |
| Regressão | ✅ 1421 pass / 0 fail; register/login verdes |

## Observações
- CA8 asserta refresh **rotacionado** (≠ anterior) — confirma DD-SESSION-03 (rotate). Bom.
- `/logout` sem response schema 204 — correto (No Content).

## O que está bom
- Fatiamento pagou: H1b tocou só 2 arquivos porque o H1a deixou os 4 use cases instanciados no composition.
- Mapeamento erro→HTTP consistente com o H1a.

## Issues
Nenhuma. → W3.
