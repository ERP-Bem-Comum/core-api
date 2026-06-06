# W1 (GREEN) — CONTRACTS-PATCH-METADATA-HTTP

**Wave**: W1 · **Agente**: ports-and-adapters · **Size**: M
**Feature**: `specs/002-contracts-http-gaps/` (ticket #5, US-002) · **Data**: 2026-06-06

## Resultado

Gates: typecheck ✓ · format ✓ · lint ✓ · test (default 2256/0) ✓ · test:integration (88/0) ✓. Os 13 testes do ticket (4 use-case + 9 rota) passam.

## Mudanças (produção)

- **NOVO** `application/use-cases/update-contract-metadata.ts` — load → `updateContract(patch)` → save; `contract-not-found` (RBAC puro, sem ownership por tenant); `ContractMetadataPatch` (5 campos).
- `adapters/http/schemas.ts` — `patchContractMetadataBodySchema`: `.strict()` (chave extra/imutável → 400) + `.refine` (≥1 campo; {} → 400); `title`/`objective` `min(1)`; `email` via `z.email()`; observations/email/telephone nullable.
- `adapters/http/composition.ts` — dep `updateContractMetadata` (writer pool).
- `adapters/http/plugin.ts` — rota **PATCH** `/contracts/:id` (200 = detalhe recomposto via getContractDetail+getContractorBlock; 404 inexistente; headers Sunset) + rota **DELETE** `/contracts/:id` recusada (**405** `contract-delete-forbidden`, `requireAuth` antes da política).

## Decisões/Notas

- PATCH retorna o **detalhe composto** (reflete metadados + contratado + children pós-patch) — consistente com a forma do GET.
- Campo imutável no PATCH → **400** na borda (Zod `.strict()`), nunca 422 (decisão do `/speckit-analyze`). `null` em observations/email/telephone limpa o campo (intencional).
- `req.body as ContractMetadataPatch` na borda: ponte de `exactOptionalPropertyTypes` (Zod `.optional()` infere `|undefined`; JSON nunca traz present-undefined). Cast justificado em adapter.

## Aderência

- RBAC puro (decisão da feature): inexistente → 404; sem checagem de tenant.
- Imutabilidade (#14): DELETE recusado; valor/período/datas inalcançáveis pelo PATCH.
- Domínio puro: use-case orquestra `updateContract` (helper de domínio); zero regra de negócio na borda.
