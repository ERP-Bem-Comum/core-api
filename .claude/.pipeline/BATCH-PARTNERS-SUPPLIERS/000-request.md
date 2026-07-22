# BATCH-PARTNERS-SUPPLIERS — escopo

> Issue **#356** (slice 1/3 do #350). Módulo **partners**. Size **M**. Ramifica de `go-live`. Fundação da inversão core↔BFF (ADR-0049). Worktree isolada: `.claude/worktrees/batch-partners`.

## Objetivo
`POST /api/v2/partners/suppliers:batch` — resolve `supplierRef[]` → identidade mínima do fornecedor, para o BFF compor labels sem N+1. **Primeira rota `/api/v2` do partners** (v1 mirror congelado, ADR-0033) → plugin novo registrado **direto no `server.ts`** (default `/api/v2`, padrão do financial v2 — server.ts:208-225). **Não tocar o v1.**

## Contrato (normativo — #350 / ADR-0049)
- **Body:** `{ refs: z.array(z.uuid()).min(1).max(200) }` (espelha `batchBodySchema` de escrita, teto 200 vs 500 — deliberado).
- **200:** `{ items: [{ ref, name, taxId /* cnpj */, serviceCategory }], missing: uuid[] }`. `items` sem ordem garantida (BFF casa por `ref`).
- **preHandler:** `[requireAuth, authorize('supplier:read')]`.
- **Minimização (MUST, ADR-0049 inv.3):** `bankAccount`/`pixKey` **FORA** (sensível, não é label). `taxId` sob gate `hasPermission(req, 'supplier:read')` — o **core** minimiza, não o BFF.
- **Erros:** uuid mal-formado → **400** `{ error: { code: 'validation' } }` (Zod barra o shape); uuid válido sem registro → entra em `missing[]`, **não** derruba o lote.

## Escopo (in)
1. Port batch **`getSuppliersView(refs)`** em `application/ports/contractor-read.ts` (hoje só single) + adapter Drizzle `WHERE supplier_ref IN (...)` anti-N+1 + in-memory.
2. Schema Zod (`supplier-schemas.ts`) + rota (novo plugin v2 do partners).
3. Registro no `server.ts` (default `/api/v2`).
4. Coleção Bruno de smoke (lote + `missing` + 400).

## Fora de escopo
- `bankAccount`/`pixKey` (endpoint próprio, permissão dedicada — futuro). #357/#358 (financial, outro agente). Não tocar v1.

## Critérios de aceite
- **CA1** refs válidos existentes → 200 `{ items:[...por ref], missing:[] }`.
- **CA2** refs válidos, alguns sem registro → ausentes em `missing[]`, presentes em `items[]` (lote não derruba).
- **CA3** uuid mal-formado no array → 400 `validation`.
- **CA4** sem auth / sem `supplier:read` → 401/403.
- **CA5** minimização — `items` **nunca** contêm `bankAccount`/`pixKey`; `taxId` só com `hasPermission(supplier:read)`.
- **CA6** `>200` refs → 400 `validation`.
- **CA7 (integração)** adapter resolve N refs em **1 query** (`WHERE IN`), sem N+1.

## Pipeline (agentes por wave)
| Wave | Atividade | Agente/Skill |
| :-- | :-- | :-- |
| W0 | RED — schema batch + rota `fastify.inject` (CA1-6) + port | skill **tdd-strategist** |
| W1 | port `getSuppliersView` + adapter Drizzle (WHERE IN) + in-memory + plugin v2 + schema | **fastify-server-expert** + **zod-expert** + **drizzle-orm-expert** |
| W2 | audit (minimização PII/IDOR, anti-N+1, isolamento do v1) | skill **code-reviewer** + **security-backend-expert** |
| W3 | gate + `test:integration:partners` + Bruno smoke | skill **ts-quality-checker** + **bruno-api-client-expert** |

## Research (MCP — grounding canônico, princípio IX)
- **acdg-skills** `security` (batch input validation, IDOR, PII minimization) + `architecture` (ADR-0049 BFF boundary).

## DoD
Gate W3 verde. Rota funcional, minimização MUST, anti-N+1. PR **base `go-live`**. Fecha #356. Destrava #172/#95.
