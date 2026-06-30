# FIN-RECON-INTERACCOUNT — transferência/aplicação/resgate entre contas (#143)

**Issue:** [#143](https://github.com/ERP-Bem-Comum/core-api/issues/143) (sp:5) · **Milestone:** Go-Live Op-1/2 · **Branch:** `feat/143-recon-interaccount`
**🎯 Goal:** lançamentos de **realocação patrimonial** (Transferência/Aplicação/Resgate) com conta/produto de destino — não despesa/receita.

## Estado atual
`ManualEntryType` JÁ inclui `Transfer | Investment | Redemption` (`types.ts:18-21`), mas `ManualEntry` não tem conta-destino nem produto, e não há guard por tipo. `confirmManualEntry` (`manual-entry.ts`) só valida `valueCents > 0`.

## Decisões de modelagem (CLARIFY resolvido com o dono)
- **(a) Produto (Aplicação/Resgate):** campo livre **`productLabel: string | null`** no `ManualEntry` (ex.: "CDB Banco X"). SEM módulo/entidade de produto (YAGNI — single-org go-live).
- **(b) Contra-partida:** o lançamento de saída grava **`destinationAccountRef`** (outra `fin_cedente_account`) + a classificação de realocação (derivada do tipo). **NÃO** auto-cria lançamento espelho — o crédito na conta destino é conciliado quando o extrato dela for importado (vinculado por ref). Evita transação fabricada/duplicada.
- **Exclusão de relatórios:** "realocação patrimonial" é **derivada do tipo** (`Transfer|Investment|Redemption`) — sem flag extra. Relatórios são Fase 4 (pós-go-live); a classificação por tipo já basta p/ excluí-los de despesa/receita.

## Escopo técnico
- **Domínio `types.ts`/`manual-entry.ts`:** `ManualEntry` += `destinationAccountRef: string | null`, `productLabel: string | null`. `confirmManualEntry` guards por tipo:
  - `Transfer` → exige `destinationAccountRef`; `supplierRef` deve ser null (não é pagamento de fornecedor).
  - `Investment | Redemption` → exige `productLabel`; `supplierRef` null.
  - `Payment | Receipt | FeePenaltyInterest` → inalterados.
  - Novos erros (string union): `'transfer-requires-destination'`, `'investment-requires-product'`, `'realloc-forbids-supplier'` (nomes EN kebab a confirmar pelo agente; mapear p/ 422).
- **Application (`record-manual-entry`):** validar `destinationAccountRef` via `CedenteAccountStore.findById` (existe + ≠ conta de origem) → senão `'destination-account-not-found'` / `'destination-same-as-source'`. Helper de classificação `isCapitalReallocation(type)`.
- **Persistência:** `fin_manual_entries` += `destination_account_ref varchar(36) NULL`, `product_label varchar(...) NULL` (mappers `manualEntryToRow`/row→domínio; in-memory espelha). **Migration** via `pnpm run db:generate:financial`.
- **Borda HTTP:** schema/DTO do `confirmManualEntry` (POST /statement-transactions/:id/manual-entry) += `destinationAccountRef`/`productLabel`.

## ✅ Critérios de aceite
- **CA1** — `Transfer` sem `destinationAccountRef` (ou conta inexistente / = origem) → 422 (slug claro). Com destino válido → concilia.
- **CA2** — `Investment`/`Redemption` sem `productLabel` → 422; com → concilia.
- **CA3** — lançamento de realocação grava `destinationAccountRef`/`productLabel` e fica conciliável; **não** auto-cria espelho.
- **CA4** — `Transfer|Investment|Redemption` são classificados como realocação patrimonial (derivado do tipo) — **não** despesa/receita (helper `isCapitalReallocation`, testável).
- **CA5** — `supplierRef` informado junto de tipo de realocação → rejeita (`realloc-forbids-supplier`).

## Disciplina
Domínio puro (Result, sem throw/class, switch exausto sobre `ManualEntryType`); ESM `.ts`+`import type`; `exactOptionalPropertyTypes`; ADR-0020 (migration manual/CHECK se aplicável; sem ENUM). Gate W3 verde; sem regressão. Integração drizzle gated `MYSQL_INTEGRATION`.
