# FIN-DRAFT-PARTIAL-SCHEMA — escopo (#534)

> Size **S**. `createDocumentBodySchema` é único para Open e Draft e exige 5 campos mesmo com
> `asDraft:true`. O **domínio** `saveDraft` aceita rascunho parcial, mas a validação HTTP rejeita antes
> (400). Por isso o front trava "Salvar rascunho". Fix: afrouxar o corpo quando `asDraft:true`.

## Causa-raiz (#534)
- `src/modules/financial/adapters/http/schemas.ts:98` — `createDocumentBodySchema` marca obrigatórios:
  `type`, `documentNumber`, `supplierRef`, `paymentMethod`, `grossValueCents`.
- `plugin.ts` — com `asDraft:true`, chama `deps.saveDraft`, cuja `SaveDraftCommand` tem **todos os 5
  opcionais/nullable** (`save-draft.ts:35`). O domínio permite parcial; só o schema HTTP barra.

## Escopo (in)
1. **Schema**: tornar os 5 campos **opcionais** e adicionar `superRefine` que os exige **só quando
   `asDraft:false`** (Open com títulos). Preserva o 400 do fluxo Open.
2. **Handler (draft path)**: mapear os 5 para null-safe (`?? null`; `grossValueCents` condicional para não
   virar `Number(undefined) = NaN`).
3. **Handler (open path)**: guard `document-incomplete` estreitando os 5 antes de `saveDocument` (idêntico ao
   guard de `dueDate` já existente — satisfaz o TS sem `!`, defensivo).

## Fora de escopo
- Front (`canSaveDraft`, `buildDraftInput`) — follow-up de 1 linha da P.O.
- Rascunho visível no grid (specs/090) — outro PR.

## Critérios de aceite
- **CA1** `POST /financial/documents { asDraft:true, type:'NFS-e' }` (parcial) → **201**, cria Draft.
- **CA2** `POST { asDraft:true, documentNumber:'X' }` (parcial, sem type) → **201** (não é campo-específico).
- **CA3** `POST { asDraft:false, type:'NFS-e' }` (sem os obrigatórios) → **400** (inalterado).
- **CA4** Caminho Open completo segue **201** (sem regressão — cobertos pelos testes existentes).
- **CA5** Regressão zero: `pnpm test` verde.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — inject: draft parcial 201, asDraft:false parcial 400 |
| W1 | `fastify-server-expert` (par `zod-expert`) | superRefine + ajuste do handler |
| W2 | `code-reviewer` | audit — 400 do Open preservado, sem `!` |
| W3 | `ts-quality-checker` | gate |
