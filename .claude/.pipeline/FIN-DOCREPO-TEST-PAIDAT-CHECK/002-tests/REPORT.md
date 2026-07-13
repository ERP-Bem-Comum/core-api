# W0 — RED · FIN-DOCREPO-TEST-PAIDAT-CHECK

> **Outcome:** RED · Skill: `tdd-strategist`

O teste-alvo **já existe** e reproduz o defeito — o W0 aqui é demonstrar o RED no MySQL real (não há
teste novo a escrever; o fix é de setup do próprio teste).

## Reprodução (MySQL 8.4.10 real, x99, banco `core` limpo)

```
env MYSQL_INTEGRATION=1 FINANCIAL_DATABASE_URL=mysql://root:…@127.0.0.1:3306/core \
  node --test … --test-name-pattern="grid Reconciled" \
  tests/modules/financial/adapters/persistence/document-repository.drizzle-mysql.test.ts

✖ Pago + TODOS os títulos Reconciled → grid Reconciled; parcial/sem → Pago; filtro Paid/Reconciled
ℹ tests 1 · pass 0 · fail 1
    cause: Error: Check constraint 'fin_payables_paid_at_chk' is violated.
      code: 'ER_CHECK_CONSTRAINT_VIOLATED', errno: 3819
```

## Causa-raiz

CHECK `fin_payables_paid_at_chk` = `((status <> 'Paid') OR (paid_at IS NOT NULL))` (do #231/#232). O
teste grava `status='Paid'` sem `paid_at` em 3 pontos:

| Linha | Statement | Falta |
| :-- | :-- | :-- |
| 316-317 | `UPDATE fin_payables SET status='Paid' WHERE document_id=idPart` | `paid_at` |
| 319-322 | `INSERT INTO fin_payables (…status…) VALUES (…'Paid'…)` | coluna `paid_at` |
| 328-329 | `UPDATE fin_payables SET status='Paid' WHERE document_id=idPaid` | `paid_at` |

A primeira violação (L317) aborta o teste antes das asserções do grid.

## Handoff W1

Adicionar `paid_at` (data de pagamento coerente) nos 3 pontos. Sem tocar `src/` (produção correta) nem o
CHECK. Rodar `document-repository.drizzle-mysql` completo no x99 → 20/20.
