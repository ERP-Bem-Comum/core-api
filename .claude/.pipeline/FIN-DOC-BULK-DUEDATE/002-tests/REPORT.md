# W0 — RED (FIN-DOC-BULK-DUEDATE)

**Skill:** tdd-strategist · **Outcome:** RED

## Testes — `tests/modules/financial/adapters/http/bulk-due-date.http.test.ts`
- **CA1** — lote de 3 válidos (`version:0`) + `dueDate` → 3 resultados `ok`; nova dueDate refletida no GET.
- **CA2** — `version` stale → `version-conflict` só naquele id; os demais válidos são aplicados (falha parcial).
- **CA3** — id inexistente → `not-found` só naquele id; demais aplicados.
- **CA4** — payload inválido (`items` vazio, sem `dueDate`, `version` não-int, id malformado) → **400**.
- **CA-AUTH** — sem `fiscal-document:write` → 403.

## Prova do RED
`node --test` → **4/4 fail** (CA1/CA2/CA3/CA-AUTH): o endpoint `PATCH /documents/due-date` ainda não existe
(cai no `:id`), então não há falha parcial nem outcomes. (CA4 passa por coincidência — payload inválido no
handler errado também dá 400.)

## Próximo (W1)
- Schema `bulkUpdateDueDateBodySchema` (`items` 1..100 `{id:uuid, version:int}`, `dueDate:iso`).
- Use-case `bulkUpdateDueDate` (reusa `adjustDocument` por item; mapeia erro → outcome ok/version-conflict/not-found).
- Rota `PATCH /financial/documents/due-date` (estática, precede `:id` no find-my-way).
