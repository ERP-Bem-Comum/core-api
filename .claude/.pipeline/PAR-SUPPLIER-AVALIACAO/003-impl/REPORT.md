# 003 — W1 (GREEN) — PAR-SUPPLIER-AVALIACAO

## Decisão de modelagem (fundamentada via MCP acdg-skills)

`serviceRating` é um **Standard Type** (Vaughn Vernon, _IDDD_, p. 307): conjunto fechado de valores
**descritivos**, modelado como VO com smart constructor que rejeita valor fora do conjunto (impede
estado inválido — o argumento "doolars" de Vernon). Escolhido enum semântico
`RUIM/REGULAR/BOM/OTIMO` sobre nota 1–5 (Vernon: "type code doesn't say much"). Espelha
`service-category.ts` (também um Standard Type legado). Reversível (VO isolado).

## Camadas

- **Domínio**: `service-rating.ts` (VO novo) · `errors.ts` (+`invalid-service-rating`) · `types.ts`
  (`serviceRating?`/`ratingComment?` em Register/Edit input; obrigatórios em Rehydrate; campos no core) ·
  `supplier.ts` (parse + normalização de comentário em register/edit; passthrough em rehydrate).
- **Application**: `register-supplier.ts` / `edit-supplier.ts` (commands opcionais + repasse).
- **Persistência**: schema `par_suppliers` (+`service_rating` varchar(16), +`rating_comment`
  varchar(1000), +CHECK do conjunto) · migration `0007` · `supplier.mapper.ts` (insert + fromRow
  com parse). ETL `scripts/etl/mappers/supplier.mapper.ts` (legado → `null`).
- **HTTP**: `supplier-dto.ts` (+campos) · `supplier-schemas.ts` (detail/create + `serviceRatingsSchema`) ·
  `supplier-plugin.ts` (rota catálogo `GET /suppliers/service-ratings`).

Avaliação é **opcional e independente do cadastro** (nasce `null`, preenchível na edição). Sem
invariante cruzada (comentário não exige nota) — YAGNI.

## Gate

typecheck ✅ · lint ✅ · format ✅ · `pnpm test` 2647 pass/0 fail · `test:integration:partners` 31 pass.
