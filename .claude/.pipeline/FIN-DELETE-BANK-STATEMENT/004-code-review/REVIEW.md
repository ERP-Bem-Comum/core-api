# W2 — code review (self, read-only) — FIN-DELETE-BANK-STATEMENT

**Veredito: APPROVED.**

- **Guarda, sem cascata** (decisão P.O.): o use-case só exclui se o extrato existe, nenhuma transação está
  conciliada e o período não está fechado. Não faz undo/reopen automático — devolve o erro e o usuário
  desfaz/reabre pelos fluxos existentes.
- **Ordem dos guards** (fail-first, sem efeito colateral antes de validar): not-found → conciliada →
  período fechado → só então `deleteById`. `deleteById` só é chamado no caminho feliz (provado no W0: CA2/CA3
  não chamam).
- **Detecção de conciliada**: `reconciliationStatus !== 'Pending'` (pega `Reconciled` E `ManualEntry` — CA2/CA2b).
- **Período**: `findTransaction(tx0.id)` dá o `debitAccountRef` desnormalizado → `periods.isClosed(ref, tx0.date)`.
  Extrato sem transações → pula o guard (nada a bloquear).
- **Repo `deleteById`**: FK cascade (`fin_statement_transactions → fin_bank_statements`) apaga as transações.
  Idempotente (inexistente → no-op). In-memory + Drizzle simétricos; adapter converte exceção → Result.
- **Borda**: `DELETE /bank-statements/:id`, gate `reconciliationImport`, 204. `statement-has-reconciled-transactions`
  → 409 (CONFLICT_CODES); `period-closed` → 409; `bank-statement-not-found` → 404 (mapa existente).

## Escopo
Entregue: guarda + exclusão. **Fora (fatia 2 opcional)**: cascata "forçar exclusão" (undo+reopen+delete). Front.

Sem Blocker/Major/Minor. 1 round.
