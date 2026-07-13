# W1 — Implementação (GREEN) · FIN-PAYABLE-DUEDATE-ISOLATED (#270)

> **Outcome:** GREEN · Skills: `ts-domain-modeler` → `ports-and-adapters` → `fastify-server-expert` ↔ `zod-expert`

Vencimento de **um** título isolado, sem propagação pai↔filhos. Implementação mínima (YAGNI): reusa o
evento `DocumentSaved` (como `editMetadata`/`adjust`) — **sem** evento novo, migration de CHECK, `z.enum`
novo ou mapper de timeline.

## Decisão de design central — reuso de `DocumentSaved` (sem evento novo)

`editMetadata` (#165) e `adjust` (#59) já emitem `documentSavedEvents(document, payables)` ao mudar
`dueDate` — o read-model `fin_payable_view` reprojeta os snapshots (com o novo `dueDate`) e a trilha
grava `DocumentSaved` (já em `TIMELINE_EVENT_TYPES`). Introduzir `PayableDueDateChanged` custaria:
migration do CHECK `ck_fin_tl_event_type`, novo membro em `DOCUMENT_EVENT_TYPES`/`z.enum`, branch no
timeline mapper e na projeção. **Nada disso é necessário** para o comportamento pedido → reusa-se
`DocumentSaved`. A ÚNICA diferença para `editMetadata` é *quais* payables mudam (um só, pelo `payableId`).

## Diff por camada

| Camada | Arquivo | Mudança |
| :-- | :-- | :-- |
| Domínio | `domain/document/document.ts` | `updatePayableDueDate({ document, payables, payableId, dueDate })` — `find` por id em `[parent, ...children]`; `err('payable-not-found')` se ausente; `retime` muta só o alvo; reemite `documentSavedEvents`. Espelha `payPayableManually`. |
| Application | `application/use-cases/update-payable-due-date.ts` (novo) | `findById` → guard `Open`/`Approved` (senão `invalid-state-transition`) → domínio → `buildTimelineEntries` → `repo.save(..., expectedVersion, events)`. Espelha `register-manual-payment`. |
| Borda | `adapters/http/schemas.ts` | `updatePayableDueDateBodySchema = { version, dueDate: z.iso.date() }`. |
| Borda | `adapters/http/composition.ts` | import + `FinancialHttpDeps.updatePayableDueDate` + wiring `updatePayableDueDate(deps)`. |
| Borda | `adapters/http/plugin.ts` | rota `PATCH /financial/documents/:id/payables/:payableId` (RBAC `fiscal-document:write`; `documentPayableParamsSchema` reusado) + inventário no cabeçalho. |

Erros reusados (sem slug novo): `payable-not-found` (404), `document-not-found` (404),
`invalid-state-transition` (409) — todos já mapeados em `error-mapping.ts`.

## Verde

- Ticket: **13/13** (domínio 4 · use-case 3 · borda 6).
- Regressão vizinha: **21/21** (`financial-documents.http` · `manual-payment.http` · `adjust-document`).
- `pnpm run typecheck`: limpo (1 fix: non-null no teste — `document.dueDate` é `Date|null` na union com Draft).

## Notas para W2/W3

- Persistência real (MySQL): o `repo.save` do adapter Drizzle já persiste `payables[].dueDate` por linha
  (mesmo caminho de `manual-payment`/`adjust`) — **sem migration**. Validar no x99 (W3 integração).
- Escopo consciente (fora): não bloqueia alterar `dueDate` de título `Paid`/`Reconciled` — YAGNI, sem CA;
  candidato a issue se a P.O. exigir.
