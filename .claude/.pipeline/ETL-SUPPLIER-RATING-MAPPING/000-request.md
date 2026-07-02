# ETL-SUPPLIER-RATING-MAPPING — mapper de suppliers perde avaliação de serviço

## Contexto

Auditoria de fidelidade da carga real do ETL (lab db-migrate, 2026-07-02, dump
`dump_prod_2026.sql`) constatou perda silenciosa de dados: os 99 suppliers migrados
têm `service_rating = NULL` e `rating_comment = NULL`, quando o legado carrega
`serviceEvaluation` (87×5, 1×4, 12×null) e `commentEvaluation` (79 preenchidos).

## Causa-raiz

1. `scripts/etl/legacy/rows.ts` — `LegacySupplierRow` NÃO inclui `serviceEvaluation`/
   `commentEvaluation`; `decode.ts::decodeSupplierRow` não as lê.
2. `scripts/etl/mappers/supplier.mapper.ts:128-130` — comentário FACTUALMENTE ERRADO
   ("Legado não possui avaliação de prestador") hardcoda `serviceRating: null,
   ratingComment: null`.

## Escopo (S)

- Adicionar os 2 campos a `LegacySupplierRow` + decode (`nNum`/`nStr`).
- Mapear no mapper: `serviceEvaluation` 5→OTIMO, 4→BOM, 3→REGULAR, 2→REGULAR,
  1→RUIM, null→null (decisão D2 ratificada em 2026-07-02, mapa da migração);
  valor fora de 1..5 → quarentena `EnumUnknown { field: 'service_evaluation' }`.
- `commentEvaluation` → `ratingComment` (normalização de vazio→null é do domínio,
  `Supplier.rehydrate::normalizeComment`).
- Testes no molde de `tests/etl/mappers/supplier.mapper.test.ts`.

## Fora de escopo (registrado como achado, não corrigir aqui)

- Inconsistência `auth_user.telephone` (degradado) × `par_user_profiles.telephone`
  (bruto) — issue própria.
- Typos do enum legado (TRASPORTE etc.) — débito de dados, não de código.

## Critério de aceite

- W0 RED: testes falham por inexistência dos campos/mapeamento.
- W3 verde: typecheck + format + lint + test.
- Re-carga no lab (core resetado): distribuição esperada `87×OTIMO, 1×BOM, 11×NULL`
  e `rating_comment` com contagem igual ao legado menos quarentenados.
