# FIN-DELETE-BANK-STATEMENT — escopo (excluir extrato importado)

> Size **M**. Fecha o ciclo de importação (importar → conferir → **excluir e refazer** se veio errado).
> Excluir um extrato importado (OFX/PDF/CSV — o formato não importa; o extrato já está normalizado).
> **Bloqueio com guarda** (decisão da P.O.): não faz cascata. Só exclui se seguro; senão orienta o usuário.

## Regras (P.O.)
1. Extrato existe + **nenhuma transação conciliada** → exclui (cascade apaga as transações via FK).
2. **Alguma transação conciliada** (`reconciliationStatus !== 'Pending'`) → **bloqueia**
   (`statement-has-reconciled-transactions`, 409) — o usuário desfaz as conciliações antes.
3. **Período da conta fechado** → **bloqueia** (`period-closed`, 409) — o usuário reabre antes.
4. Extrato inexistente → `bank-statement-not-found` (404).

Não faz undo/reopen automático (guarda, não cascata). O front orienta via os fluxos existentes
(Desfazer conciliação / reabrir período), depois exclui.

## Escopo (in)
1. **Repo** `BankStatementRepository` + `deleteById(statementId)` (in-memory + Drizzle; FK cascade nas
   transações). 
2. **Use-case** `delete-bank-statement.ts`: listTransactions → guarda conciliada → guarda período fechado
   (via `findTransaction` p/ o debitAccountRef + `periods.isClosed`) → `deleteById`.
3. **Borda**: `DELETE /financial/bank-statements/:id` (gate `reconciliationImport`), 204.
4. **Error map**: `statement-has-reconciled-transactions` → 409 (CONFLICT_CODES).

## Fora de escopo
- Cascata "forçar exclusão" (undo + reopen + delete num clique) — fatia 2 opcional, se a P.O. quiser.
- Front (botão Excluir + confirmação).

## Critérios de aceite (use-case + borda)
- **CA1** extrato só com `Pending` → exclui (deleteById chamado) → ok.
- **CA2** ≥1 transação `Reconciled`/`ManualEntry` → `statement-has-reconciled-transactions` (não exclui).
- **CA3** período fechado → `period-closed` (não exclui).
- **CA4** extrato inexistente → `bank-statement-not-found`.
- **CA5** (borda) `DELETE /bank-statements/:id` → 204 no caminho feliz; 409/404 nos guards; 403 sem permissão.
- **CA6** Regressão zero: `pnpm test` verde. (deleteById real contra MySQL é #500-gated.)

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — use-case: guardas de conciliada/período/inexistente |
| W1 | `ports-and-adapters` + `fastify-server-expert` | repo deleteById + use-case + rota + error-map |
| W2 | `code-reviewer` | audit — guardas, sem cascata, 409/404 |
| W3 | `ts-quality-checker` | gate |
