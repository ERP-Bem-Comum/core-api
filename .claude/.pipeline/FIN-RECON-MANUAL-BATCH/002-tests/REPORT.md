# W0 — RED · FIN-RECON-MANUAL-BATCH (#124)

**Agente:** tdd-strategist · **Resultado:** 🔴 RED · **Branch:** `017-fin-conciliacao-bancaria`

## Estratégia

Fatia M/L: domínio ManualEntry → use-cases (record/batch) → schema+migration → adapters → borda HTTP.
**Alvo do W0** (gate, puro): o **núcleo de domínio** `confirmManualEntry` (T054) — cria `Reconciliation` tipo
`ManualEntry` sem título + evento. Use-cases/persistência/HTTP entram no W1.

## Decisão A1 (analyze) resolvida no W0

Agrupamento do lote = **seleção explícita do operador** (`confirmBatch` recebe `transactionIds[]` + `template`).
Auto-detecção de padrões recorrentes (`LoteSugerido`, FR-014) é **read/UX diferida** — sem endpoint de sugestão
nesta fatia (espelha o tratamento de `MatchSugerido`/#121). Registrado no `000-request.md`.

## Citação canônica (IX)

- **spec.md US5** (`:164`): lançamento manual p/ transação sem título → `ManualEntry` + `Reconciliation` tipo
  `ManualEntry` + transação `Reconciled`; lote cria N conciliações numa ação.
- **data-model.md** (`:63`): `ManualEntry` é parte do boundary quando `type = ManualEntry`
  (type Payment|Receipt|Transfer|FeePenaltyInterest|Investment|Redemption; value: Money; refs opcionais).

## Arquivo de teste (RED)

- `tests/modules/financial/domain/reconciliation/manual-entry.test.ts` — CA1 (cria type ManualEntry sem itens +
  evento ManualEntryRecorded), CA2 (valor não-positivo → erro).

## Prova RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../domain/reconciliation/manual-entry.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Contrato esperado (alvo do W1)

- `domain/reconciliation/manual-entry.ts`: VO `ManualEntryId`; `ManualEntryType`; `confirmManualEntry(input)
  → Result<{ reconciliation (type 'ManualEntry', items [], manualEntry, Active), events: [ManualEntryRecorded] },
  'manual-entry-value-not-positive'>`.
- Extensão de `Reconciliation` (#122 types): `manualEntry: ManualEntry | null`.
- Evento `ManualEntryRecorded` em `domain/reconciliation/events.ts` (+ union outbox/public-api).
- Use-cases `record-manual-entry.ts` (tx Pending → guard FR-015 → confirmManualEntry com valor da transação →
  persist tx única → outbox) e `confirm-batch.ts` (N × template).
- Schema `fin_manual_entries` + migration `0007`; adapter (manual entry + reconciliation + flip transação, sem título).
- Borda `POST /statement-transactions/:id/manual-entry` + `POST /reconciliations/batch`.

## Próxima wave

W1 (`ts-domain-modeler` p/ o domínio; `ports-and-adapters` + `drizzle-schema-author` p/ persistência; Fastify+Zod p/ borda).
