# W0 — Testes RED · BATCH-PARTNERS-SUPPLIERS (#356)

**Agente:** skill `tdd-strategist` · **Outcome:** RED (por inexistência da API)

## Fundamento canônico (acdg-skills)

> "Denial-of-service input validation: input validation and sanitization to reject or correct malicious (e.g. very large) content."
> — OWASP AI Exchange (`shared-references/security/owasp-ai-exchange.md:3735`)

Embasa o **CA6** (teto `max(200)` no array de refs). Fundamento normativo forte = contrato #350 / ADR-0049.

## Testes RED escritos (2 grupos, cobrem CA1-CA6)

### 1. Schema — `suppliers-batch.schema.test.ts`
`suppliersBatchBodySchema`: CA1(shape) aceita 1..200 uuid · CA3 rejeita uuid mal-formado · CA6 rejeita >200 (anti-DoS) · rejeita lista vazia.
**RED:** `does not provide an export named 'suppliersBatchBodySchema'`.

### 2. Rota — `suppliers-batch.routes.test.ts` (`fastify.inject`, driver memory)
`POST /api/v2/partners/suppliers:batch`:
- **CA1** — refs existentes → 200 `{ items:[{ref,name,taxId,serviceCategory}], missing:[] }`.
- **CA2** — ref válido sem registro → `missing[]`, lote não derruba.
- **CA5** — minimização: o body **nunca** contém `bankAccount`/`pixKey`/`accountNumber`/`checkDigit` (seeds têm bankAccount preenchido de propósito).
- **CA4** — sem token → 401; autenticado sem `supplier:read` → 403.

**RED:** `does not provide an export named 'suppliersBatchHttpPlugin'`.

**Prova agregada:** ambos os arquivos · pass 0 · fail 1 (import inexistente).

## Cobertura de CAs
| CA | Coberto no W0 | Onde |
|---|---|---|
| CA1/CA2/CA4/CA5 | ✅ | rota (inject) |
| CA3/CA6 | ✅ | schema |
| CA7 (anti-N+1, 1 query) | ⏳ W3 | `test:integration:partners` (adapter Drizzle real) |

## Escopo a implementar no W1
- `suppliersBatchBodySchema` + response schema (`supplier-schemas.ts`).
- Port `ContractorReadPort.getSuppliersView(refs)` → `{ items, missing }` + adapter Drizzle `WHERE supplier_ref IN (...)` (1 query) + in-memory.
- Novo `suppliersBatchHttpPlugin` (v2), exportado em `public-api/http.ts`, registrado no `server.ts` (default `/api/v2`).
- DTO mínimo `{ ref, name, taxId(=document), serviceCategory }` — `bankAccount`/`pixKey` fora; `taxId` sob `hasPermission(supplier:read)`.
