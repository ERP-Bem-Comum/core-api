# Code Review — REPORTS-SUPPLIERS-NO-CONTRACT (#240 · REP-2)

**Reviewer:** `code-reviewer` + `security-backend-expert` (lente boundary/exposição/resource).
**Veredito:** **APPROVED** (round 1).
**Escopo:** reader agregado `financial/public-api`, adapters `reports`, borda HTTP, composition, wiring `server.ts`.

## Achados

### 🔴 Blocker — nenhum
### 🟡 Major — nenhum

### 🔵 Minor
- **M1 — sem índice em `contract_ref` (full scan).** `fin_payable_view` não indexa `contract_ref`; o
  `WHERE contract_ref IS NULL` faz full scan. **Aceito/documentado** (000-request §Fora de escopo):
  volume baixo, rota rate-limited (200 req/min) + gated. Follow-up: índice `(contract_ref, supplier_ref)`
  ou projeção pré-agregada se a view crescer. Não bloqueia.
- **M2 — schemas sem `.strict()`.** Não é leak (dupla barreira confirmada no serializer
  `fastify-zod-openapi` + CA3), mas `.strict()` alinha ao `financial` e falha-alto se o DTO vazar campo.
  **CORRIGIDO** — `.strict()` aplicado em `supplierWithoutContractSchema` + `suppliersWithoutContractResponseSchema`.
- **M3 — regra eslint `no-cross-context-import` (ADR-0006) não existe no `eslint.config.js`.** Gap de
  tooling **pré-existente** (não introduzido aqui); o boundary foi verificado manualmente e está correto.
  Follow-up separado (fora de escopo do #240).

## Confirmações (limpo)
- **Pool boot-scoped (F1 / incidente RDS 0001):** reader aberto 1× em `buildReportsHttpDeps`, fechado só
  no `shutdown()` (`server.ts:396`); handler só chama a closure. Cleanup do pool do partners em falha
  parcial de boot (`composition.ts:66`). `mysql-pool-config` garante `maxIdle < connectionLimit`.
- **Sem SQL injection:** query só com refs de coluna Drizzle/`sql` template; handler sem `req.query/body/params` (`_req`).
- **ONLY_FULL_GROUP_BY (MySQL 8.4):** `GROUP BY supplier_ref, name` cobre as 2 colunas não-agregadas — validado no CA4 real.
- **Boundary ADR-0006:** `reports` importa só de `financial/public-api` (nunca domain/adapters).
- **RBAC fail-closed:** `requireAuth` → `authorize('fiscal-document:read')`, ordem certa (ADR-0024); CA2 prova 403.
- **Response fechado + 5xx sem leak:** 4 colunas (CA3); `sendResult` devolve envelope genérico ≥500.
- **Exposição mínima:** seleciona só `name` do supplier (NÃO o `document`/CNPJ); mesmo dado já exposto sob o mesmo gate.
