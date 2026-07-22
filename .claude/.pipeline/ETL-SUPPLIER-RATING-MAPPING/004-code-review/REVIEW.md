# W2 — Review (ETL-SUPPLIER-RATING-MAPPING)

## Round 1: REJECTED
- Issue média (bloqueante): fixture legacy-mini.sql sem as colunas novas — typo de coluna
  reproduziria perda silenciosa sem detecção em CI (nNum/nStr toleram ausência).
- Sugestões: assert de `attempted`; caso não-inteiro; caso de acúmulo cruzado; helper YAGNI.

## Round 2: APPROVED (sem ressalvas bloqueantes)
- Fixture com DDL+INSERTs corretos (aridade 18/18 conferida) + asserts no
  reader.integration.test.ts (executado com Docker: 1/1).
- Sugestões 1-3 aplicadas (mapper 26/26, re-executado pelo revisor).
- Registro não-bloqueante herdado: mapeamento fixo de erro de rehydrate→payment_target
  (pré-existente; fora do escopo).
