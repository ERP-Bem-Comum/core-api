# W0 — Diagnóstico (verificação) · FIN-RECON-DIFF-VERIFY (#141)

**Agente:** tdd-strategist · **Resultado:** RED (delta identificado) · **Re-dimensionamento: S → M/L**

## Diagnóstico dos 4 CAs da #141 contra o código atual

`tests/modules/financial/domain/reconciliation/difference-diagnosis.test.ts` — suíte de **caracterização** (4 testes, todos verdes: travam o estado atual como regression guard).

| CA da #141 | Estado | Evidência |
| --- | --- | --- |
| **CA1** diferença=0 → cheia | ✅ pronto | `confirm` deriva `Individual/Multiple`, `difference=null` |
| **CA2** diferença≠0 sem classificação → bloqueia | ✅ pronto | `reconciliation-not-balanced` (`reconciliation.ts:39`) |
| **CA3** classificação Juros/Multa/Desconto/Tarifa | ⚠️ parcial | `treatment ∈ {Interest,Penalty,Discount,Fee}` + `type:'Partial'` ✅; **falta** centro de custo/observação + **lançamento classificado** (a `Difference` só tem `{valueCents, treatment}`) ❌ |
| **CA4** pagamento parcial mantém saldo aberto | ❌ ausente | `confirm` concilia o título **integral** (`reconciledValueCents = payable.valueCents`); não há saldo parcial/estado do título |

## Conclusão — o delta NÃO é S

O reconhecimento estava certo: a **infraestrutura de classificação** (treatment + Partial + fechamento 100%) já existe e responde CA1/CA2/CA3-classificação. Mas os **dois comportamentos centrais** da issue faltam e são de **domínio (M/L)** com decisão de modelagem:

1. **CA4 — saldo parcial**: modelar "conciliar parte do título mantendo o restante aberto". Toca o estado do `Payable` (status/valor restante), não só a conciliação. Decisão de design: novo estado? valor residual? como o título volta a aparecer como aberto?
2. **CA3-completo — diferença classificada com lançamento**: a `Difference` precisa carregar (ou gerar) categoria/centro de custo/observação; a nota em `types.ts:48` diz "lançamento contábil orquestrado pelo use-case #123" — **não implementado**.

## Recomendação (escala ao humano — decisão de design)

- **Fatiar a #141**: a parte pronta (CA1/CA2/CA3-classificação) já entrega valor; abrir ticket M/L próprio para CA4 (saldo parcial) + CA3-lançamento, com clarify de modelagem. **OU**
- **Aprofundar o design do CA4 agora** (saldo parcial) antes do W1.

W1 **bloqueado** até a decisão — implementar saldo parcial "no susto" fura a disciplina (modelagem do estado do título).
