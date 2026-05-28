# W0 (RED) — CONTRACTS-HTTP-WRITES-CORE (C2)

> Skill: `tdd-strategist` · Driver: memory (sem Docker) · Outcome: **RED** (29 fail / 0 pass)

## Teste escrito

`tests/modules/contracts/adapters/http/contracts-writes.routes.test.ts` — 29 casos via `app.inject`,
exercitando as 4 rotas de escrita com RBAC `authorize('contract:write')`, mapeamento erro→HTTP (SPEC §3)
e os caminhos 200 montados via seed estendido (D3).

| Rota | Casos |
| :-- | :-- |
| `POST /contracts` (E1) | 401, 403, 201 Active, 201 Pending, 400 Zod, 409 duplicado, 422 período inválido |
| `POST /:id/activate` (E2) | 401, 403, 200 (pending+doc seedado), 404, 409 não-pending, 409 sem-doc, 422 signedAt inválido |
| `POST /:id/amendments` (E3) | 401, 403, 201, 404, 409 não-active, 422 suppression-excede, 400 kind inválido |
| `POST /:id/amendments/:amendmentId/homologate` (E4) | 401, 403, 200 (PendingWithDoc seedado), 404 aditivo, 404 contrato, 409 mismatch |
| OpenAPI + regressão | CA7 (4 rotas no `/docs/json`), CA8 (RBAC fino: token `contract:write` → 403 no read C1) |

## Setup RBAC + seed estendido (D2/D3)

- **Token COM `contract:write`:** seed RBAC inline do auth (já existente) — `permissions:['contract:write']`.
- **Token SEM permissão:** `POST /register` normal (`roles:[]`) → 403.
- **Seed de contratos/aditivos/documentos (D2 — seed vira objeto):**
  `buildContractsHttpDeps({ driver:'memory', seed:{ contracts:[...], amendments:[...], documents:[...] } })`.
  - 2 Active (`001/2026`, `002/2026`), 2 Pending (com doc / sem doc);
  - 2 aditivos `PendingWithDocument` (um no contrato do path, um em outro → mismatch);
  - 1 doc `signed_contract` Active (helper espelhado de `activate-contract.test.ts`) p/ o Pending que ativa.

## Decisões cravadas nos asserts (aprovadas pelo humano, 2026-05-28)

- **D3 — seed test-only** para os 200 de activate/homologate (upload HTTP é C3).
- **Mapeamento erro→HTTP:** 400 Zod · 404 not-found · **409** conflito de estado/transição/unicidade ·
  **422** invariante semântica · 201 create · 200 activate/homologate.
- **`signedAt` inválido → 422** (não 400): o body usa `z.string()` solto; o domínio valida a data.

## Evidência RED

```
contracts-writes.routes.test.ts → tests 29 · pass 0 · fail 29
```

Falham por: `(seed ?? [])` não-iterável (o composition atual espera `Contract[]`, não o objeto D2) e rotas
POST inexistentes (404). Quando o seed objeto + as 4 rotas existirem, passam pela razão certa.

## Regressão intencional do C1 (D2)

A migração do seed do C1 (`contracts-reads.routes.test.ts`: `seed:[c]` → `seed:{ contracts:[c] }`) deixa o
C1 reads **temporariamente RED** (11/12) até o W1 do C2 entregar o seed objeto. É esperado — o teste foi
movido para a API-alvo. O W1 reverde C1 (reads) **e** C2 (writes) juntos. Coberto por CA8.

## API que o W1 deve entregar

```
composition.ts: ContractsCompositionConfig.seed vira { contracts?, amendments?, documents? } (D2);
                Pools/ContractsHttpDeps += contractWriterRepo, amendmentRepo, documentRepo (writer, D5);
                instanciar createContract/createPendingContract/activateContract/createAmendment/homologateAmendment.
schemas.ts:     body E1 (discriminado por `mode` Pending|Active), E3 (discriminado por `kind`),
                E2 ({signedAt}), E4 ({homologatedBy}); param amendmentId (uuid); amendmentSchema (resposta E3).
amendment-dto.ts (novo): mapper Amendment → DTO.
plugin.ts:      4 rotas POST [requireAuth, authorize('contract:write')] + mapa erro→status por rota (SPEC §3).
```
