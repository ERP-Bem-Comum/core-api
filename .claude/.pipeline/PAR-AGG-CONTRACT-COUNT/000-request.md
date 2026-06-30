# PAR-AGG-CONTRACT-COUNT — contractCount no grid agregado GET /partners

> Issue: [#107](https://github.com/ERP-Bem-Comum/core-api/issues/107) · follow-up da #105 (PR #106)
> dedup-key: `partners:grids:contract-count-display:aggregate` · Size: **S** · Branch: `107-partners-aggregate-contract-count` (off `105-...`)

## Problema

O grid agregado `GET /api/v1/partners` (lista plana dos 4 tipos via `PartnerListItem`) não exibe
`contractCount`, ao contrário dos 4 grids individuais (entregues na #105).

## Escopo

Adicionar `contractCount` a cada linha de `GET /api/v1/partners`, lendo do read-model
`par_contract_count_view` (reusa `PartnersHttpDeps.getContractCounts` batch, criado na #105).

## Pontos de integração

- `src/modules/partners/adapters/http/partners-schemas.ts:22` — `partnerListItemSchema`.
- `src/modules/partners/adapters/http/partners-plugin.ts` — handler `GET /partners` (lê 4 readers → `aggregatePartners` → serializa).
- `src/modules/partners/adapters/http/partner-aggregate-query.ts` — `aggregatePartners` (PURA, não muda): projeta `PartnerListItem` (`type/id/name/document/active`).

**Estratégia:** `aggregatePartners` permanece pura; o handler enriquece **só a página** retornada —
extrai `items.map(id)`, chama `getContractCounts(ids)` (batch, anti-N+1) e adiciona `contractCount`.

## Critérios de aceite (testáveis)

- **CA1** — **Dado** uma contraparte com N contratos no read-model, **Quando** `GET /api/v1/partners` a lista, **Então** a linha traz `contractCount = N`.
- **CA2** — **Dado** uma contraparte sem contratos, **Quando** listada, **Então** `contractCount = 0` (nunca null/ausente).
- **CA3** — **Dado** o agregado servido, **Então** a leitura usa só o read-model (sem `contracts` montado — ADR-0006); store indisponível → `503` (`contract-count-store-unavailable`).

## Definition of Done

- [ ] Teste de borda (`fastify.inject`) cobrindo CA1–CA3 no agregado.
- [ ] Gate **W3** verde · sem regressão.
- [ ] Reusa `getContractCounts` batch (sem N+1).
