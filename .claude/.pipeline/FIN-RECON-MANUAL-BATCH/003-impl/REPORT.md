# W1 — GREEN · FIN-RECON-MANUAL-BATCH (#124)

**Skills:** ts-domain-modeler · ports-and-adapters · drizzle-schema-author · Fastify+Zod · **Resultado:** 🟢 GREEN
**Branch:** `017-fin-conciliacao-bancaria`

## Fatia vertical entregue (US5 — lançamento manual + lote)

### Domínio

- `domain/reconciliation/manual-entry-id.ts` (VO) + `manual-entry.ts` (`confirmManualEntry`): cria
  `Reconciliation` tipo `ManualEntry` (`items: []`, `manualEntry` no boundary), `status Active`, emite
  `ManualEntryRecorded`. Guard `manual-entry-value-not-positive`.
- Extensão de `Reconciliation` (#122): `ReconciliationType += 'ManualEntry'`; campo `manualEntry: ManualEntry | null`
  (confirm/undo existentes recebem `manualEntry: null`). `ManualEntryType` (6 valores EN). Evento na union.

### Aplicação

- `use-cases/record-manual-entry.ts` — tx `Pending` → guard FR-015 (`isClosed`) → `confirmManualEntry`
  (valor = valor da transação) → unit-of-work → outbox.
- `use-cases/confirm-batch.ts` — compõe `recordManualEntry` (1 template × N transações; `empty-batch` se vazio).

### Persistência

- `schemas/mysql.ts` — `fin_manual_entries` (FK CASCADE p/ raiz; type+value CHECK) + **CHECK de
  `fin_reconciliations.type` ampliado** para aceitar `ManualEntry`.
- `migrations/mysql/0007_new_hercules.sql` — `db:generate:financial` (regenerado para 1 migration: nova tabela
  + DROP/ADD do CHECK) + CHARSET/COLLATE manual.
- `mappers/reconciliation.mapper.ts` — `manualEntryToRow`; `toDomain` seta `manualEntry: null` (não recarrega).
- Adapters in-memory + Drizzle: `ReconciliationRepository.confirmManualEntry` (unit-of-work: conciliação +
  `fin_manual_entries` + transação `Pending→Reconciled`, SEM título).

### Borda HTTP / eventos

- `POST /statement-transactions/:id/manual-entry` (201) e `POST /reconciliations/batch` (201) — `reconciliation:write`.
- `public-api/events.ts`: `ManualEntryRecorded` no union + guard.

## Prova de verde

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` (sem Docker) | ✅ **2826 pass / 0 fail** / 18 skipped (gated) |
| `pnpm run test:integration:financial` (Docker) | ✅ **31 pass / 0 fail** (CA6 incluso) |

### Critérios de aceite

- **CA1–CA2** (domínio: cria ManualEntry sem itens + evento; valor não-positivo → erro) — ✅ gate.
- **CA3** (recordManualEntry: tx→Reconciled, evento; já conciliada/conta inexistente → erro) — ✅ gate.
- **CA4** (confirmBatch: N×template → N conciliações; lote vazio → erro) — ✅ gate.
- **CA5** (HTTP: manual-entry 201, batch 201, RBAC 403) — ✅ gate.
- **CA6** (integração: `fin_manual_entries` + transação `Reconciled` na mesma tx) — ✅ Docker.

## Regressão auto-detectada e corrigida no W1 (política de regressão zero)

A integração (CA6) pegou que o CHECK `fin_reconciliations_type_chk` (migration 0006) não aceitava `ManualEntry`
— eu havia ampliado só o type do **domínio**. Corrigido: CHECK ampliado no schema + migration 0007 regenerada
(DROP/ADD do constraint). Re-rodado verde. (Conserto da causa, não do sintoma.)

## Notas para W2

- **Decisão A1** (agrupamento do lote = seleção explícita; `LoteSugerido` auto é UX/diferida) — ver `000-request.md`.
- **`manualEntry` não reidratado** no `findById` (toDomain → null): nenhum use-case desta fatia precisa do boundary
  pós-criação; undo não o lê. Documentado no mapper.
- **confirmBatch best-effort**: para na 1ª falha (cada manual entry é unit-of-work atômico individual).

## Próxima wave

W2 (`code-reviewer`) — audit read-only, máx. 3 rounds.
