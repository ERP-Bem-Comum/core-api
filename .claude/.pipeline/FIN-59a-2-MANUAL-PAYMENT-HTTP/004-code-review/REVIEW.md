# Code Review — FIN-59a-2-MANUAL-PAYMENT-HTTP (#224) — Round 1

**Veredito:** APPROVED · **Reviewer:** code-reviewer · **Data:** 2026-06-23

Rota espelha o padrão de `approve` (params + body Zod + RBAC no preHandler; actor = `req.userId`;
optimistic lock via `body.version`; `loadAndSerialize` na resposta). RBAC `payable:approve` (decisão do
humano — quem aprova pode dar baixa; sem mudança no catálogo). Path RESTy aninhado
(`/documents/:id/payables/:payableId/manual-payment`) reflete a granularidade por-título. `reason` opcional
propagado só quando presente. Boundary correta (sendDomainError). Sem regressão.

Issues: nenhuma 🔴/🟡. 🔵 a borda devolve o documento inteiro (loadAndSerialize) — consistente com approve;
um payload por-título é otimização futura. APPROVED → fecha a feature #219 (domínio #223 + borda #224) e o Sprint 1.
