# W1 — FIN-RECON-INTERACCOUNT (#143)

**Resultado:** GREEN ✅ — implementado pelo orquestrador-pai (sub-agente caiu por API Overloaded).

## Decisões (clarify confirmado)
(a) `productLabel` texto livre p/ Investment/Redemption · (b) contra-partida = só `destinationAccountRef` (sem espelho auto) · realocação derivada do tipo (`isCapitalReallocation`).

## Arquivos
- **Domínio:** `reconciliation/types.ts` (`ManualEntry` += `destinationAccountRef`/`productLabel`); `reconciliation/manual-entry.ts` (`ManualEntryError` += `transfer-requires-destination`/`investment-requires-product`/`realloc-forbids-supplier`; export `isCapitalReallocation`; guards por tipo + boundary); `reconciliation/reconciliation.ts` (construção de ManualEntry da diferença #141 += campos null).
- **Application:** `record-manual-entry.ts` (input += destino/produto; valida destino via `cedenteStore.findById` — existe + ≠ origem; errors `destination-account-not-found`/`destination-same-as-source`; passthrough).
- **Persistência:** schema `fin_manual_entries` += `destination_account_ref varchar(36)` + `product_label varchar(120)`; mapper `manualEntryToRow`; **migration 0025** (`db:generate:financial`). CHECK de tipo já incluía Transfer/Investment/Redemption.
- **Borda:** `manualEntryBodySchema` += campos (zod); handler passthrough.

Testes: domínio 12/12 + use-case 4 novos casos.
