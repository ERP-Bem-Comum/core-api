# W0 — testes RED (ETL-SUPPLIER-RATING-MAPPING)

Adicionado bloco 'avaliação de serviço' em tests/etl/mappers/supplier.mapper.test.ts:
mapa 5→OTIMO/4→BOM/3,2→REGULAR/1→RUIM/null→null; comentário preservado/normalizado;
fora de 1..5 → quarentena EnumUnknown(service_evaluation).

Resultado da execução (RED como esperado — mapper hardcoda null):
ℹ tests 23
ℹ pass 15
ℹ fail 8
