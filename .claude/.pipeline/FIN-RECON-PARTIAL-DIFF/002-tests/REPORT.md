# W0 RED — FIN-RECON-PARTIAL-DIFF

**Skill/agente:** tdd-strategist (testes consomem a API pública do domínio + borda HTTP)
**Objetivo:** travar em RED os CA1–CA6 (conciliação parcial + lançamento classificado da diferença).

## Arquivos de teste
- `tests/modules/financial/domain/reconciliation/partial-reconciliation.test.ts` (novo) — CA4 (alocação parcial via `allocations` → `reconciledValueCents` real), CA1 preservado, CA5 (sinal: Discount/Partial <0, Interest/Penalty/Fee >0 → senão `difference-sign-invalid`), CA4/CA6 (`deriveReconciledStatus` → PartiallyReconciled/Reconciled).
- `tests/modules/financial/domain/reconciliation/difference-diagnosis.test.ts` (atualizado) — CA4 NOVO: título 8000, pago 6000 (Partial) → `reconciledValueCents = 6000`. Helper `input` aceita `allocations`.
- `tests/modules/financial/adapters/http/reconciliation-partial-diff.http.test.ts` (novo) — CA5 HTTP (Discount >0 → 422), CA3+CA4 HTTP (parcial classificado Partial −2000 + costCenter + nota → 201 + `manualEntry` vinculado).

## Decisões de modelagem refletidas (dentro do escopo confirmado)
- `confirm` ganha `allocations?` opcional. Ausente → conciliação cheia (CA1). Presente → valor real alocado por item.
- Novo erro `difference-sign-invalid`. Discount/Partial exigem <0; Interest/Penalty/Fee exigem >0.
- Novo helper `deriveReconciledStatus(valueCents, sum)` em `domain/payable/reconciled-status.ts`. Novo `DocumentStatus = 'PartiallyReconciled'`.
- `confirmReconciliation` aceita difference classificada (costCenterRef/categoryRef/note) + allocations; diferença classificada cria ManualEntry vinculado (reuso).

## Saída literal (subset RED)
```
✔ CA5: Discount com valueCents > 0 → 422 (passa via R3 atual; reforçado em W1)
✖ CA3+CA4 HTTP: 8000 !== 6000 (reconciledValueCents não reflete alocado; manualEntry ausente)
✖ Issue-CA4 (NOVO) domínio: 8000 !== 6000 (alocação parcial não honrada)
✖ partial-reconciliation.test.ts: ERR_MODULE_NOT_FOUND domain/payable/reconciled-status.ts
ℹ tests 7 / pass 4 / fail 3
```
Baseline `pnpm test` antes do W0: 3203 tests / 3185 pass / 0 fail / 18 skip.

## Critério de saída W0: atendido (testes existem, falham por inexistência da API/comportamento).

## Próximo passo: W1 GREEN.
