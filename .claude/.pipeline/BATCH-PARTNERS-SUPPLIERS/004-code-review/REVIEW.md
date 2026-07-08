# Code Review — BATCH-PARTNERS-SUPPLIERS (#356) — Round 1

**Veredito:** APPROVED
**Reviewer:** code-reviewer (inline, main loop)
**Escopo:** `application/ports/suppliers-batch-read.ts`, `adapters/persistence/repos/suppliers-batch-reader.{drizzle,in-memory}.ts`, `adapters/http/supplier-batch-plugin.ts`, `adapters/http/supplier-schemas.ts`, `composition.ts`, `server.ts` + os 2 testes.

---

## Issues encontradas

### 🔴 Crítica
Nenhuma.

### 🟡 Importante

#### I1 — `hasPermission` injetado nos hooks mas nunca usado (`supplier-batch-plugin.ts:27`)
**Problema:** `SuppliersBatchHttpHooks.hasPermission` é declarado e passado pela composition, mas o handler não o chama. O contrato #350 mencionava `taxId` "sob gate `hasPermission(req, 'supplier:read')`".
**Análise:** funcionalmente OK — o `preHandler: [requireAuth, authorize('supplier:read')]` já bloqueia (403) quem não tem `supplier:read`, então quem chega no handler pode receber `taxId`. O `hasPermission` fica como **param morto**.
**Ação:** remover `hasPermission` dos hooks do batch (é redundante com o `authorize` da rota) OU, se um gate separado para `taxId` for desejado no futuro, documentar. Não bloqueia (o `taxId` está protegido pela permissão da rota).

#### I2 — `as unknown as string` no cnpj (`suppliers-batch-reader.in-memory.ts:32`)
**Problema:** `taxId: supplier.cnpj as unknown as string` — double-cast que burla o type system. O adapter Drizzle usa `row.cnpj` (string do DB) direto; só o in-memory força o VO.
**Ação:** usar a conversão canônica do VO Cnpj (`String(...)` / unwrap) em vez do double-cast. Smell, não bug (runtime serializa como string — CA1 verde).

### 🔵 Sugestão
Nenhuma adicional.

---

## Verificação dos pontos de risco do escopo

- **Minimização PII (CA5)** ✔✔ — **defesa em profundidade**: o adapter Drizzle nem SELECIONA bancário/PIX (`select` só `id/name/cnpj/service_category`), e o `SupplierBatchView` não tem os campos. O teste faz regex no body e passa. Excelente.
- **Anti-N+1 (CA7)** ✔ — `inArray(parSuppliers.id, refs)` em **1 query**; `missing` computado em memória. (Validação contra MySQL real fica no W3.)
- **Isolamento (ADR-0006/0014)** ✔ — **port dedicado** `SuppliersBatchReadPort` (não estende o `ContractorReadPort` cross-módulo); só lê `par_suppliers`; zero toque em contracts/financial. O doc do port explica a decisão.
- **Result na borda** ✔ — adapters convertem `try/catch`/categoria-corrompida → `err('suppliers-batch-read-unavailable')`; nunca vazam Error. Port é `type Readonly<{...}>`.
- **Auth** ✔ — `preHandler` exige `supplier:read`; erro do read → 503; sucesso → 200 `{items, missing}`.
- **Schema/bounds (CA3/CA6)** ✔ — `z.array(z.uuid()).min(1).max(200)`; validação de borda → 400 automático.
- **ESM/TS** ✔ — imports `.ts`, `import type`, sem class/any/throw indevido (o `as unknown` de I2 é a única exceção). typecheck/lint/format já verdes (W1).

## O que está bom
- Minimização **em profundidade** (não lê o dado sensível do banco) — supera o contrato, que só pedia não expor.
- Decisão do port dedicado documentada no cabeçalho — rastreável.
- Semântica `items`/`missing` limpa; lote não derruba na ausência.

## Próximo passo
APPROVED → W3. As 2 🟡 são baratas: recomendo limpar **I1** (remover param morto) e **I2** (cast) antes do W3 — melhora clareza sem risco. W3 valida CA7 com `test:integration:partners`.
