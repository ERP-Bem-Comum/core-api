# FIN-RECON-DIFF-VERIFY — conciliação parcial + tratamento da diferença (verificar+refinar)

**Feature:** [025-fin-go-live-1-nucleo](../../../specs/025-fin-go-live-1-nucleo/) · **US2** · **Size:** S
**🎯 Goal:** fechar a issue **[#141](https://github.com/ERP-Bem-Comum/core-api/issues/141)** — *FIN-RECON-PARTIAL-DIFF*.

> ⚠️ Ticket de **verificação**: o reconhecimento (plan.md) indicou que o domínio da conciliação já modela `Difference {valueCents, treatment}` e o tipo `Partial`. O **W0 roda os 4 CAs contra o código atual** para revelar o delta real antes de qualquer implementação.

## 📋 Definition of Done (critérios de aceite da #141 — fonte da verdade)

- [ ] **CA1** — diferença = 0 → conciliação cheia (comportamento atual).
- [ ] **CA2** — diferença ≠ 0 **sem** classificação → bloqueia.
- [ ] **CA3** — diferença classificada (Juros/Multa/Desconto/Tarifa) → conciliação parcial registrada com a diferença **e sua categoria** (centro de custo + observação).
- [ ] **CA4** — "pagamento parcial" → título permanece com saldo aberto pelo restante.
- [ ] gate **W3** verde; **issue #141 fechada** (ou, se um CA ficar fora do delta, `issue-report` e #141 segue só nele).

## Estado atual (do reconhecimento)

- `domain/reconciliation/types.ts`: `DifferenceTreatment = Interest|Penalty|Discount|Fee|Partial` (= Juros|Multa|Desconto|Tarifa) ✓.
- `domain/reconciliation/reconciliation.ts:confirm`: valida fechamento 100% e deriva `type: 'Partial'` ✓.
- `Difference = {valueCents, treatment}` — **sem** centro de custo/categoria/observação (CA3-completo) ✗.
- `confirm` concilia o título **integral** (`reconciledValueCents = payable.valueCents`) — sem saldo parcial (CA4) ✗.
