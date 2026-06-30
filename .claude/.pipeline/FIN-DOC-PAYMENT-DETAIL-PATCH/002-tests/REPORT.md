# W0 — Testes RED (CA6 / PATCH paymentDetail)

**Agente:** tdd-strategist (executado via fastify-server-expert) · **Outcome:** RED

Arquivo: `tests/modules/financial/adapters/http/document-payment-detail-patch.routes.test.ts` (via `fastify.inject`, reusando setup do teste irmão CA1–CA5).

| CA | Cenário | RED (antes da impl) |
| --- | --- | --- |
| CA6.1 | PATCH novo valor válido → 200 + GET retorna | **400** (Zod faz strip de `paymentDetail` desconhecido → só `version` → refine "pelo menos um campo" falha) |
| CA6.2 | PATCH `null` → 200, apaga | **400** (mesmo strip) |
| CA6.3 | PATCH sem a chave (com `description`) → preserva | PASS (comportamento já existia) |
| CA6.4 | PATCH inválido (vazio/control/>255) com `description` → 400 | **200** (strip do campo inválido; PATCH executa) |
| CA6.5 | timeline registra before/after | **400** (igual CA6.1, antes de checar timeline) |

9 falhas / 1 passa — RED genuíno (API ausente no PATCH).
