# W2 — code review (self, read-only) — FIN-RECON-DETAIL-MANUAL-CATEGORY (fatia 1)

**Veredito: APPROVED.**

- **Reidratação simétrica**: `manualEntryRowToDomain` (inverso do `manualEntryToRow`), com validação de
  `ManualEntryId` e `type` (2 novos erros de mapper) — domínio rejeita estado inválido do banco
  (`.claude/rules/adapters.md`). `toDomain` ganhou 3º parâmetro **opcional** (`manualEntryRow = null`) →
  callers existentes inalterados (undo etc. seguem com `manualEntry: null`).
- **Drizzle `findActiveByTransaction`**: só consulta `fin_manual_entries` quando `type = ManualEntry`
  (1 query extra, limit 1) — sem custo nos demais tipos.
- **Resolução na borda**: `resolveCategoryName` (composition, via `CategoryReadPort.list()`), espelhando
  `resolveUserName` (#207/ADR-0032). Graceful: ref null / infra-fail / não-encontrado → `null`.
- **DTO/schema**: `category: string | null` (novo). `null` para conciliação sem lançamento manual — a
  categoria de título real fica p/ fatia 2 (documentado). Fixture do `strict-response` atualizado à nova spec.
- **valueCents / realizado**: intactos. Só leitura; nenhum evento novo.

## Escopo
Fatia 1 (lançamento manual) entregue. Fatia 2 (categoria do título real via `payableDocView`) = follow-up.
Reidratação real contra MySQL é #500-gated; provada por inject (in-memory popula o manualEntry).

Sem Blocker/Major/Minor. 1 round.
