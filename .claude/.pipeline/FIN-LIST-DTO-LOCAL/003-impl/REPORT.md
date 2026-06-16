# W1 — Implementação mínima (FIN-LIST-DTO-LOCAL)

**Resultado**: 🟢 GREEN (incl. integração MySQL 12/12).

## Mudanças de produção (sem migration)

1. `domain/document/query.ts` — `DocumentListItem` ganha `series: string|null`, `grossValue: Money|null`, `paymentMethod: PaymentMethod|null`, `contractRef: string|null` (+ import `PaymentMethod`).
2. `adapters/persistence/repos/document-repository.drizzle.ts` (`findPaged`) — SELECT inclui `series`/`grossValue`/`paymentMethod`/`contractRef`; mapper inline converte `grossValue` via `Money.fromCents` (espelha `netValue`) e mapeia os demais.
3. `adapters/persistence/repos/document-repository.in-memory.ts` (`toListItem`) — espelha os 4 campos do agregado.
4. `adapters/http/dto.ts` (`listItemToSummaryDto`) — mapeia os 4 (`grossValue` → `moneyToCentsString`).
5. `adapters/http/schemas.ts` (`documentSummarySchema`) — `series`/`grossValueCents`/`paymentMethod`/`contractRef` (nullable).

## Testes (RED→GREEN)

- `list-documents.http.test.ts` — CT-DTO-01 (4 campos) + CT-DTO-02 (null sem série/contrato): **7/7**.
- `document-repository.suite.ts` — asserção dos novos campos no `findPaged` (roda in-memory **e** MySQL).

## Execução

```
pnpm run typecheck                              → verde
node --test tests/modules/financial/**/*.test.ts → 113/113
node --test document-repository.in-memory.test.ts → 10/10
pnpm run test:integration:financial             → 12/12 (findPaged drizzle com novas colunas)
```

Campos pré-existentes do item inalterados (FR-009); sem migration (colunas já em `fin_documents`).
