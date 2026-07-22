# W2 — REVIEW · FIN-PAYABLE-VIEW-BACKFILL (#236)

Skill: **`code-reviewer`** (inline — o agente `drizzle-orm-expert` foi interrompido pelo usuário).

## Veredicto: **APPROVED** (melhorias aplicadas)

## Checklist

| Item | Resultado |
| :-- | :-- |
| SELECT `fin_payables ⋈ fin_documents` (chave `documentId=id`) | OK — espelha `payable-list-view.drizzle` (prod); campos corretos p/ PayableView. |
| Mapeamento (status via `documentStatusToViewStatus`, kind narrow, dueDate Date→ISO, valueCents number) | OK — status validado com `isDocumentStatus`; enum/dueDate inválido → skip contado. |
| **Idempotência + interação c/ worker** | OK — upsert por `payableId`; upsert **preserva status** de linha existente → o backfill NÃO regride status gerido pelo worker (fonte 'Open' não sobrescreve read-model 'Paid'). Preenche só lacunas. |
| Boundary `Result` | **Melhorado** — `readPayableBackfillRecords` agora converte erro de I/O → `Result<_, 'backfill-source-read-failed'>` (paridade c/ o mold supplier + .claude/rules/adapters.md); `run.ts` checa o Result. |
| Cobertura de teste | **Melhorado** — integração ganhou assertion de **idempotência no banco** (rerodar não duplica). Core (CA1/CA2/CA3) unit; mapeamento de status coberto pelo teste m2 do projetor. |

## Observação (não-bloqueante, documentada)

- **Escala:** o SELECT carrega TODOS os payables em memória (sem `LIMIT`/paginação) — aceitável p/ **job one-shot** (idêntico ao `supplier-view-backfill`); revisitar com paginação por cursor se `fin_payables` crescer a milhões (YAGNI). O log emite `total` para monitorar.

## Gate

`typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `pnpm test` **3313 pass / 0 fail**. Integração e2e (backfill + idempotência) gated `MYSQL_INTEGRATION`.
