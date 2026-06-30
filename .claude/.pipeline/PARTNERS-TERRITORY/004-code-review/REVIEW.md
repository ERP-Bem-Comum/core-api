# W2 — Code Review (read-only) · PARTNERS-TERRITORY — ✅ APPROVED (round 1, 1 issue corrigido)

Revisão independente do código produzido pelo subagente (não rubber-stamp).

## Issue ENCONTRADO e CORRIGIDO (round 1)
- **I1 (envelope de erro)**: as 4 rotas de escrita (POST/DELETE toggle) respondiam `reply.send({ code })` — **fora do envelope canônico** `{ error: { code, message, requestId } }` (FR-007/NFR-002). Os testes passavam por checarem só o status. **Corrigido**: helper `sendGeoWriteError` com `toErrorEnvelope` + `currentCorrelationId() ?? reply.request.id` (espelha supplier-plugin); + asserção de `error.requestId` no CT-106 para travar regressão.
  > ...a single initiating call can end up generating multiple downstream service calls... it hits the Gateway that sits on the perimeter of our system. This in turn passes the call on to the Streaming microservice...
  > — *(Linha 5100, p. 394, Sam Newman, *Building Microservices*)* — o requestId é o correlation id que liga a chamada do BFF ao log do core-api.

## Aprovado
- Domínio `PartnerState`/`PartnerMunicipality`: discriminated union Active|Inactive + deactivatedAt, soft-delete idempotente, sem class/throw, reusa State.parse/Municipality.parse, `at` injetado. Aderente ao padrão financier.
- Schema par_states/par_municipalities espelha parSuppliers (active+deactivated_at+CHECK, prefixo par_*); migration gerada por db:generate.
- RBAC geography:read/write (401/403 testados); UF/ibge inválido → 400 antes de escrever (validação na borda).
- Cross-state em municípios coberto; toggle idempotente coberto.

**APPROVED** após correção do I1.
