# FIN-STATEMENT-PERIOD-OPENING — Request (#205)

**Size:** S · **Tipo:** bug fix · **Issue:** #205 · **Módulo:** financial

## Problema

`GET /financial/cedente-accounts/:id/statement?from&to` (read-model do extrato, #139) computa o saldo
corrido a partir do **saldo de abertura FIXO da conta** (`account.openingBalanceCents`), ignorando toda a
movimentação **anterior ao `from`**. Ao consultar um período passado, o saldo recomeça da abertura da conta
em vez de refletir o saldo real acumulado até o início do range — tesouraria vê saldo errado.

## Decisão de design

**Opção 1** (computar a abertura do período). A **opção 2** da issue (expor `balanceAfterCents` do OFX nas
linhas) foi **descartada**: o `ofx-parser` grava `balanceAfterCents: 0` (só o `csv-parser` preenche o
campo `saldo`) → seria inconsistente entre formatos.

## Correção

Apenas no use-case `get-account-statement.ts`, reusando `buildStatementView` (a base pura do #139/F1):

- 1 query `listTransactionsByPeriod(ref, EPOCH, to)` → todas as transações até `to`.
- Particiona por `date < from`.
- `periodOpening = buildStatementView(account.opening, txs[date < from]).closingBalanceCents`.
- `view = buildStatementView(periodOpening, txs[from..to], filter)`.

Sem novo port, sem mudança de domínio.

## Critérios de aceite

- **CA1**: para período passado, `view.openingBalanceCents` = abertura da conta + Σ assinado das transações
  com `date < from` (Credit `+`, Debit `−`).
- **CA2**: `view.closingBalanceCents` reflete o saldo real ao fim do período; linhas só de `[from..to]`.
- **CA3**: zero regressão; gate W3 verde.

## Não-objetivos

`SUM` SQL dedicado no port (otimização) — fica como follow-up se a soma sobre o histórico pesar
(comportamento consistente com o F1 `listCedenteAccountsWithBalance`, que já soma todo o histórico).
