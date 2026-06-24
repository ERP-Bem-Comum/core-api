# FIN-DETAIL-PAYEE-BANK — dados bancários do favorecido no GET /documents/:id

**Issue:** [#255](https://github.com/ERP-Bem-Comum/core-api/issues/255) · sub-issue do épico **[#95](https://github.com/ERP-Bem-Comum/core-api/issues/95)** · **Size:** M
**🎯 Goal:** expor o bloco bancário do favorecido (`payeeBank`) no detalhe, via composição **síncrona** na borda HTTP.

## Decisão de arquitetura (ancorada)

Governado pelo **ADR-0032** (composição de leitura transitória na borda HTTP até o BFF v2) — que trata literalmente do "contratado … com dados bancários/PIX" de Parceiros num GET de detalhe:

- Leitura **síncrona** no `adapters/http` do financial via `partners/public-api` (`ContractorReadPort`), espelhando a rota gorda de `contracts` (`contractor-composition.ts`). **Sem** read-model, **sem** migration (`...0032...:28,33,38`).
- Detalhe = 1 registro → não há N+1 → síncrono é o caso canônico. Read-model (ADR-0022) seria a escolha **só** se virasse N+1 (`...0032...:87`) — que é por que a **lista** usa `fin_supplier_view` (ADR-0045) e o ADR-0046 rejeitou port síncrono para contagem.
- **Transitoriedade obrigatória** (`...0032...:39`): handler marcado `@transient`/`@deprecated` + headers `Deprecation`/`Sunset`, removível quando o BFF v2 assumir.

## Achado de domínio (recorta o escopo)

Bancário/PIX existem **só em `Supplier`** (`partners/.../contractor-view.mapper.ts:10-11,28-29`; VO `payment-target.ts`). `Financier`/`Collaborator`/`Act` não modelam destino de pagamento. Como o favorecido aceita qualquer parceiro (#90, `PayeeKind = 'supplier'|'financier'|'act'|'collaborator'`), o `payeeBank` só resolve quando `payeeKind === 'supplier'`; senão → `null` (chrome honesto).

## Contrato de resposta

`documentResponseSchema` += (nullable):

```
payeeBank: {
  bankAccount: { bank, agency, accountNumber, checkDigit } | null,
  pixKey: { keyType, key } | null,
} | null
```

`null` (externo) = não resolvível: favorecido não-supplier, not-found, port ausente, IO/timeout (**degradação graciosa**, espelha `composeContractor` `snapshot: null`). Objeto = supplier resolvido; campos internos refletem o que o supplier tem.

## 📋 Definition of Done

- [ ] CAs (abaixo) cobertos por teste HTTP (`fastify.inject`), W0 RED → W1 GREEN.
- [ ] `contractorReadPort` injetável em `buildFinancialHttpDeps`/`FinancialCompositionConfig` (default `null`; em mysql construído via `buildPartnersReadPort(writerUrl)`, como contracts).
- [ ] Composição `composePayeeBank(port, { type: payeeKind, id: supplierRef })` no `adapters/http`; `domain`/`application` intocados (ADR-0006/0032).
- [ ] Marcação de transitoriedade no handler do GET /:id (ADR-0032:39).
- [ ] Gate W3 verde; sem regressão (≥ baseline).

## ✅ Critérios de aceite

- **CA1 — Dado** documento com `payeeKind='supplier'` cujo favorecido tem **PIX**, **Quando** `GET /:id`, **Então** `payeeBank.pixKey = { keyType, key }` e `payeeBank.bankAccount = null`.
- **CA2 — Dado** favorecido supplier com **conta bancária**, **Quando** `GET /:id`, **Então** `payeeBank.bankAccount = { bank, agency, accountNumber, checkDigit }` e `payeeBank.pixKey = null`.
- **CA3 — Dado** favorecido supplier **não encontrado** (port → `ok(null)`), **Quando** `GET /:id`, **Então** `payeeBank = null` (degradação graciosa, sem 5xx).
- **CA4 — Dado** documento com `payeeKind='financier'`, **Quando** `GET /:id`, **Então** `payeeBank = null` (domínio não modela bancário fora de supplier).

## Pontos de implementação (W1)

- `src/modules/financial/adapters/http/composition.ts` — `contractorReadPort` em config + dep `resolvePayeeBank`.
- `src/modules/financial/adapters/http/payee-bank-composition.ts` (novo) — `composePayeeBank` espelhando `contracts/.../contractor-composition.ts` (timeout + degradação).
- `src/modules/financial/adapters/http/plugin.ts` — `loadAndSerialize` (ou só o GET /:id) compõe e injeta.
- `src/modules/financial/adapters/http/{schemas.ts,dto.ts}` — `payeeBank` no schema + DTO.
