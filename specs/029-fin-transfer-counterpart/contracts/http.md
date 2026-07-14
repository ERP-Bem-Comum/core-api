# Contrato HTTP — Fase 1 · Contrapartida esperada (#269)

Borda `/api/v2/financial` (Fastify + Zod, ADR-0027). US1 = delta em rota existente (record-manual-entry). **US2 = 2 rotas NOVAS dedicadas** (revisão do design "kind unificado" — ver §2/§3, validado contra o contrato real do front). Permissões: `reconciliation:write`/`read`.

## 1. `POST /financial/reconciliations/manual-entry` (record-manual-entry) — estendido

- **Request:** inalterado (já aceita `type` e `destinationAccountRef`).
- **Comportamento novo:** quando `type='Transfer'` **e** `destinationAccountRef` presente, além de conciliar a perna de origem, cria a **contrapartida esperada** na conta de destino (`Pending`). Sem destino ou tipo ≠ Transfer → comportamento atual (nada criado).
- **Backward-compat:** total — nenhum campo novo obrigatório; response mantém `reconciliationId`/`manualEntryId`.

## 2. `GET /financial/statement-transactions/:id/counterpart-suggestions` — **rota nova** (ENTREGUE)

> **Decisão (US2, revisada no W2):** rota **dedicada**, NÃO o `kind` unificado que este doc previa originalmente. Motivo: o contrato vigente do front (`web-app/specs/034-bank-reconciliation/contracts/server-fns.md` #4) consome `GET .../suggestions` → `{ suggestions: [{payableId, score, band, criteria}] }` **sem `kind`**, com parsing/switch exaustivo. Adicionar `kind` quebraria esse contrato já mergeado; a rota dedicada é aditiva e não toca o fluxo transação×título. O front (US2 ainda não construído) adiciona uma server-function nova.

- **Permissão:** `reconciliation:read`.
- **Response 200:** `{ suggestions: CounterpartSuggestion[] }` (raiz `{ suggestions }` — mesma convenção do #4). `CounterpartSuggestion = { counterpartId, originAccountRef, valueCents (string), expectedDate (ISO), score (0..100) }`. Casa por valor exato + movimento igual + janela ~5d; empate → mais antiga (`expectedDate` asc).

## 3. `POST /financial/reconciliations/counterpart` — **rota nova** (ENTREGUE)

> **Decisão (US2):** rota **dedicada**, NÃO um `target` no `POST /reconciliations` existente — o confirm de contrapartida é outro use-case (`confirmCounterpartMatch`) com outro result e outro fluxo (perna B = ManualEntry-espelho atômico).

- **Permissão:** `reconciliation:write`.
- **Request:** `{ transactionId (uuid), counterpartId (uuid) }`.
- **Response 201:** `{ reconciliationId (uuid), counterpartId (uuid) }`.
- **Efeito:** concilia a transação real de B (Reconciliation ManualEntry/Transfer), transita a contrapartida para `Matched` (dedup — não cria 2ª transação), grava o vínculo A↔B — tudo em 1 tx atômica.
- **Erros:** `counterpart-not-pending` → 409; `counterpart-not-found`/`counterpart-account-mismatch`/`counterpart-value-mismatch` → 422; store indisponível → 503.

## 4. `POST /financial/reconciliations/:id/undo` (undo-reconciliation) — efeito colateral

- Ao desfazer a conciliação da perna de **origem** (A), trata a contrapartida vinculada: `Pending` → `Discarded`; `Matched` → reabre o par de B de forma consistente.
- **Response:** inalterado; efeito é de estado.

## Notas de schema (Zod)

- `movement`/`status`/`kind`/`type` → `z.enum([...])` (borda), mapeados a `varchar` na persistência (ADR-0020).
- `valueCents` trafega como **string decimal** (convenção Money da borda financial).
- Validação de bounds e rejeição de malformado → 400 (par com o `zod-expert`).
