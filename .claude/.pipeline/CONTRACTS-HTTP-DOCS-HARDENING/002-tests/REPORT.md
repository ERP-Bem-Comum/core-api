# W0 (RED) — CONTRACTS-HTTP-DOCS-HARDENING

> Skill: `tdd-strategist` · Driver: memory · Outcome: **RED** (2 fail / 1 pass-regressão)

## Teste escrito

`tests/modules/contracts/adapters/http/contracts-docs-hardening.routes.test.ts` — 3 casos:

| CA | Caso | Esperado | Estado atual |
| :-- | :-- | :-- | :-- |
| CA1 | supersede doc que pertence ao `:id` | 200 | **passa** (regressão — guard) |
| CA1 | supersede doc de OUTRO contrato (path ≠ dono) | 409 | **falha** (hoje 200 — sem ownership) |
| CA2 | `/docs/json` E1/E2 com `requestBody` octet-stream + `format: binary` | presente | **falha** (não documentado) |

## Evidência RED

```
tests 3 · pass 1 · fail 2
✖ CA1 ownership: actual 200, expected 409
✖ CA2 OpenAPI: requestBody octet-stream ausente
```

## API que o W1 deve entregar

```
composition.ts: getDocument reader (DocumentRepository.findById + rehydrate).
plugin.ts E3:   ownership — getDocument; parentType Contract → parentId===:id;
                parentType Amendment → getAmendment(parentId).contractId===:id; senão 409
                (document-contract-mismatch). 404 doc inexistente mantido.
plugin.ts E1/E2: declarar requestBody octet-stream/binary no OpenAPI SEM reativar validação
                Zod do corpo (corpo segue Buffer opaco). Guiado por este teste.
.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md: registrar o E2 como caso afetado (item 3 / doc).
```
