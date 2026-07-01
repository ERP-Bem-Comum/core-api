# Contrato HTTP — Fase 1 · Contrapartida esperada (#269)

Borda `/api/v2/financial` (Fastify + Zod, ADR-0027). **Nenhuma rota nova** — deltas em rotas de conciliação existentes. Permissões inalteradas (conciliação: `reconciliation:write`/`read` conforme já vigente).

## 1. `POST /financial/reconciliations/manual-entry` (record-manual-entry) — estendido

- **Request:** inalterado (já aceita `type` e `destinationAccountRef`).
- **Comportamento novo:** quando `type='Transfer'` **e** `destinationAccountRef` presente, além de conciliar a perna de origem, cria a **contrapartida esperada** na conta de destino (`Pending`). Sem destino ou tipo ≠ Transfer → comportamento atual (nada criado).
- **Backward-compat:** total — nenhum campo novo obrigatório; response mantém `reconciliationId`/`manualEntryId`.

## 2. `GET /financial/cedente-accounts/:id/suggestions` (get-statement-suggestions) — estendido

- **Response:** cada item de sugestão ganha `kind: 'payable' | 'counterpart'`.
  - `kind='counterpart'`: inclui `counterpartId`, `originAccountRef`, `label` ("outra perna da transferência de [Conta A] em [data]"), `valueCents` (string), `expectedDate`, `score`.
- **Backward-compat:** consumidores atuais que ignoram `kind` continuam lendo os campos existentes de `payable`; `kind` é aditivo.

## 3. `POST /financial/reconciliations/confirm` (confirm-reconciliation) — estendido

- **Request:** aceita confirmar um par **transação × contrapartida** (novo discriminador no body, ex.: `target: { kind: 'counterpart', counterpartId }` além do atual `payableId`).
- **Efeito:** concilia a transação real de B, transita a contrapartida para `Matched` (dedup — não cria 2ª transação), grava o vínculo A↔B.
- **Erros:** `counterpart-not-pending` → 409; `counterpart-not-found` → 422.

## 4. `POST /financial/reconciliations/:id/undo` (undo-reconciliation) — efeito colateral

- Ao desfazer a conciliação da perna de **origem** (A), trata a contrapartida vinculada: `Pending` → `Discarded`; `Matched` → reabre o par de B de forma consistente.
- **Response:** inalterado; efeito é de estado.

## Notas de schema (Zod)

- `movement`/`status`/`kind`/`type` → `z.enum([...])` (borda), mapeados a `varchar` na persistência (ADR-0020).
- `valueCents` trafega como **string decimal** (convenção Money da borda financial).
- Validação de bounds e rejeição de malformado → 400 (par com o `zod-expert`).
