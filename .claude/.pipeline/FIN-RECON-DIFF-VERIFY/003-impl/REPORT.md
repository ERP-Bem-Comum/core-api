# W1 — Desfecho: FATIAMENTO (GREEN) · FIN-RECON-DIFF-VERIFY (#141)

**Decisão (humano):** fatiar a #141. **Entregável deste ticket de verificação:**

1. **Suíte de caracterização verde** — `tests/modules/financial/domain/reconciliation/difference-diagnosis.test.ts` trava o que JÁ funciona (CA1, CA2, CA3-classificação) como regression guard.
2. **Delta fatiado → issue #247** — `[financial] conciliação parcial — saldo aberto do título + lançamento classificado da diferença`, com CAs testáveis + clarify de modelagem (saldo/estado do `Payable`). dedup-key `financial:reconciliation:partial-balance` (dedup verificado, sem duplicata).
3. **#141 comentada** com o diagnóstico e o link para #247.

**Nenhum código de produção alterado** — a parte pronta já existia; o delta (CA4 + CA3-lançamento) é M/L e vive agora na #247. O `goal` original ("fechar #141") foi substituído por "fatiar #141" por decisão do TL.
