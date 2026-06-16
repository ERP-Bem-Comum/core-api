# Phase 1 — Quickstart: Financial List DTO (US1)

Tudo via `pnpm` (nunca `npm` — ADR-0012).

## Gate de qualidade (W3)

```bash
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

## Suíte do slice (US1)

```bash
# borda HTTP — item da listagem enriquecido
pnpm test -- --test-name-pattern="list-documents"
# contrato de repo + integração MySQL (findPaged retorna os 4 campos)
pnpm run test:integration:financial
```

## Verificação manual (smoke via fastify.inject ou Bruno)

`GET /api/v2/financial/documents` → cada item de `items[]` traz `series`, `grossValueCents`, `paymentMethod`, `contractRef`, além dos campos atuais. Documento sem série/contrato → `series`/`contractRef` = `null`. Paginação/filtros inalterados.

## Definition of Done (US1)

- W0 RED → W1 GREEN; W2 review (+citação leve §IX); W3 verde + `test:integration:financial`.
- Campos pré-existentes do item byte-idênticos (FR-009); contagem de testes ≥ baseline.

## US2 (bloqueada) — não fazer aqui

Fornecedor (nome+CNPJ) via read-model depende de eventos do `partners` (inexistentes). Abrir issue do pré-requisito antes de planejar US2.
