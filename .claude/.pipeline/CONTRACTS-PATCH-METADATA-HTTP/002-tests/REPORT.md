# W0 (RED) — CONTRACTS-PATCH-METADATA-HTTP

**Wave**: W0 · **Agente**: tdd-strategist · **Size**: M
**Feature**: `specs/002-contracts-http-gaps/` (ticket #5, US-002) · **Data**: 2026-06-06

## Escopo

`PATCH /api/v2/contracts/:id` (só metadados; `.strict()`+`.refine`; campo imutável/extra/{} → 400;
inexistente → 404 RBAC puro) + `DELETE /api/v2/contracts/:id` recusado (405 `contract-delete-forbidden`).

## Testes RED

- `application/use-cases/update-contract-metadata.test.ts` — use-case: aplica patch, persiste, inexistente → `contract-not-found`, id malformado → erro.
- `adapters/http/patch-contract-metadata.routes.test.ts` — PATCH (200; imutável→400; {}→400; title vazio→400; inexistente→404; 401; 403) + DELETE (405 `contract-delete-forbidden`; sem sessão→401).

## Prova do RED

```
ℹ tests 10 · pass 1 · fail 9
ERR_MODULE_NOT_FOUND: .../use-cases/update-contract-metadata.ts
```

RED por inexistência: use-case ausente; rotas PATCH/DELETE de contrato não existem.

## Roteiro W1

1. `application/use-cases/update-contract-metadata.ts` — load → `updateContract(patch)` → save; `contract-not-found`.
2. `schemas.ts` — `patchContractMetadataBodySchema` (`.strict()` + `.refine` ≥1; title/objective `min(1)`).
3. `composition.ts` — dep `updateContractMetadata` (writer).
4. `plugin.ts` — rota PATCH (200 = detalhe composto, reusa getContractDetail+getContractorBlock) + rota DELETE recusada (405).
