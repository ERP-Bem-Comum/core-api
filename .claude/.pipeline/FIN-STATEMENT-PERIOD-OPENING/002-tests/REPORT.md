# W0 — Testes RED · FIN-STATEMENT-PERIOD-OPENING (#205)

**Outcome:** RED · **Data:** 2026-06-22

**Teste:** `tests/.../use-cases/get-account-statement-period-opening.test.ts` (novo, no-Docker, repo in-memory REAL).

Cenário: conta com abertura 10000; extrato com Credit 5000 em 2024-04-15 (**antes** de `from`),
Debit 2000 e Credit 1000 em maio. `getAccountStatement(from=2024-05-01, to=2024-05-31)`.

**RED confirmado:** `openingBalanceCents` = **10000 ≠ 15000** — a abertura do período ignorava o crédito
de abril (`< from`), usando só a abertura fixa da conta. Causa-raiz exata do #205.
