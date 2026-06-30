# W0 — Testes RED · FIN-59a-1-MANUAL-PAYMENT (#223)

**Outcome:** RED · **Data:** 2026-06-23

Teste de domínio `tests/.../document/manual-payment.test.ts`: `payPayableManually` (Aprovado→Pago de UM
título), motivo opcional no evento, `payable-not-found`, `payable-not-approved` (não paga 2x).

**Decisões (clarify com humano):** granularidade = **nível título** (payável individual; relaxa a
invariante "payable espelha documento"); motivo = **opcional**. Modelagem: sem variante `PaidDocument`
nem (a princípio) migration — o `Payable.status` já é por-linha; flipa um título dentro do `ApprovedDocument`.

**RED confirmado:** `Document.payPayableManually is not a function` (4 casos).
