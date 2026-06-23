# W0 — Testes RED · FIN-59a-2-MANUAL-PAYMENT-HTTP (#224)

**Outcome:** RED · **Data:** 2026-06-23

Teste HTTP `tests/.../http/manual-payment.http.test.ts` (fastify.inject, memory): POST documento → approve
→ POST `/documents/:id/payables/:payableId/manual-payment {version,reason?}` → 200, título pai Pago, filhos
Aprovados; RBAC `payable:approve` → 403.

**Decisão (clarify):** RBAC = `payable:approve` (reusar; sem mudança no catálogo). Path =
`/documents/:id/payables/:payableId/manual-payment` (documentId + payableId; actor = usuário autenticado).

**RED confirmado:** 404 (rota inexistente) nos 2 casos.
