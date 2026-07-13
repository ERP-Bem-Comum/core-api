# W1 — GREEN · FIN-DOCREPO-TEST-PAIDAT-CHECK

> **Outcome:** GREEN · Skill: `tdd-strategist`

Fix mínimo: `paid_at='2026-07-01'` acompanha `status='Paid'` nos 3 pontos raw-SQL do teste #204. Data
coerente (título pago tem data de pagamento; = `due_date` usado no resto do teste, determinística). Sem
tocar `src/` nem o CHECK.

## Diff (`document-repository.drizzle-mysql.test.ts`)

| Ponto | Antes | Depois |
| :-- | :-- | :-- |
| UPDATE idPart | `SET status='Paid'` | `SET status='Paid', paid_at='2026-07-01'` |
| INSERT filho | `(… payment_method, created_at) VALUES (… 'TED', NOW(3))` | `(… payment_method, paid_at, created_at) VALUES (… 'TED', '2026-07-01', NOW(3))` |
| UPDATE idPaid | `SET status='Paid'` | `SET status='Paid', paid_at='2026-07-01'` |

Os `UPDATE … status='Reconciled'` ficam intocados — o CHECK `fin_payables_paid_at_chk` só exige `paid_at`
para `status='Paid'`.

## Verde (MySQL 8.4.10 real, x99, banco limpo)

```
document-repository.drizzle-mysql.test.ts
ℹ tests 20 · pass 20 · fail 0
```

(antes do fix: 19/20 — a violação do CHECK abortava o teste #204.)

## Handoff W2

Audit read-only: o fix é fiel (não mascara o defeito; grava `paid_at` real coerente), respeita o CHECK e a
intenção do teste (estados Paid/Reconciled para derivação do grid). Só teste, zero produção.
