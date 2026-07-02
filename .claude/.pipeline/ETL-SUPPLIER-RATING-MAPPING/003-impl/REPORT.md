# W1 — implementação (ETL-SUPPLIER-RATING-MAPPING)

Arquivos: scripts/etl/legacy/rows.ts (+2 campos LegacySupplierRow), scripts/etl/legacy/decode.ts
(+nNum/nStr das colunas), scripts/etl/mappers/supplier.mapper.ts (ACL translateServiceRating
1..5→RUIM/REGULAR/REGULAR/BOM/OTIMO + normalizeLegacyComment + erro acumulado na quarentena;
comentário factualmente errado corrigido), fixtures (base() e supplierRow()).

Nota de design: normalização de comentário em branco ficou no ACL — `Supplier.rehydrate`
confia no estado recebido (só register/edit normalizam no domínio).

Resultado: mapper 23/23; suíte ETL 71/71 (zero regressão).
