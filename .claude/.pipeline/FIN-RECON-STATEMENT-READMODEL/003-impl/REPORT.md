# W1 — Implementação (GREEN) · FIN-RECON-STATEMENT-READMODEL (#139)

**Data**: 2026-06-19

| Camada | Arquivo | Conteúdo |
| --- | --- | --- |
| Domínio | `domain/statement/statement-view.ts` (novo) | `buildStatementView(opening, txs, filter)` puro: ordena cronologicamente, running balance (opening + Σ assinado por `movement`), agrupa por dia (UTC) com subtotais in/out/saldo, contadores `all/in/out/reconciled/pending` (conciliada = Reconciled\|ManualEntry), filtro seleciona linhas mas preserva o running balance/contadores. |
| Application | `application/use-cases/get-account-statement.ts` (novo) | carrega conta-cedente (saldo de abertura, default 0) + `listTransactionsByPeriod` → `buildStatementView`. `cedente-account-not-found` se a conta não existe. |
| Borda HTTP | `adapters/http/{schemas,dto,plugin,composition}.ts` | `GET /api/v2/financial/cedente-accounts/:id/statement?from=&to=&filter=`, perm `reconciliation:read`. `to` estendido ao fim do dia (UTC) p/ incluir o dia final. DTO serializa cents como string + datas ISO (convenção). |

GREEN: domínio 4/4, use-case 3/3, smoke HTTP 2/2; sem regressão (suíte 2985 pass).
