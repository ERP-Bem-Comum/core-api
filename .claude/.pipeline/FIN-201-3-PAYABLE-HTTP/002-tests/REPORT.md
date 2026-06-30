# W0 — Testes RED · FIN-201-3-PAYABLE-HTTP (#222)

**Outcome:** RED · **Data:** 2026-06-23

Teste `tests/.../http/payables-list.http.test.ts` (fastify.inject, driver memory): POST NFS-e Open com
retenção ISS → GET da listagem payable-centric → 200 com pai+filho; filtro status=Paid → vazio; RBAC
`fiscal-document:read` → 403.

**Achado (needs-decision):** `GET /financial/payables` JÁ existe (searchPaidPayables, US2/conciliação —
RBAC `reconciliation:read`, query `status=Paid` literal, shape `PaidPayableView`). Conflito de path.
**Decisão (humano):** não-breaking → grid do #222 vai p/ `GET /financial/payable-titles`; a rota de
conciliação fica intacta.

**RED confirmado:** 404 (rota inexistente) nos 3 casos.
