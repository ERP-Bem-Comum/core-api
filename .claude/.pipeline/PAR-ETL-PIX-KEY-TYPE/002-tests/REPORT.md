# W0 — Testes RED · PAR-ETL-PIX-KEY-TYPE

**Outcome**: RED ✅ · **Agente**: tdd-strategist · **Issue**: #275

## Arquivo

`tests/etl/mappers/supplier.mapper.test.ts` (estendido) — `describe('mapLegacySupplierRow — tradução de pix_key_type legado (#275)')`. Testa o **comportamento** de `mapLegacySupplierRow` (não a implementação interna do translator — W1 decide o local).

## Casos

- **CA1/CA2 (5, RED)** — `LegacySupplierRow` com `pixInfoKeyType` ∈ {`CNPJ`,`EMAIL`,`CELLPHONE`,`ALEATORY_KEY`,`CPF`} + chave coerente + demais campos válidos → espera `ok` e `aggregate.pixKey.keyType` traduzido (`cnpj`/`email`/`phone`/`random-key`/`cpf`). Hoje → `err EnumUnknown`/`pix_key_type`.
- **CA3 (guard, verde)** — `pixInfoKeyType = 'FOO'` (fora do mapa) → `err EnumUnknown` (estrito).

## Evidência

`node --test` (binário absoluto): **13 tests · 8 pass · 5 fail**. Os 5 fail = CA1/CA2 (`AssertionError: esperava ok p/ pix_key_type=<LEGADO>, veio quarentena EnumUnknown`). CA3 verde + 7 pré-existentes verdes (sem regressão). `git status` → só `tests/etl/mappers/supplier.mapper.test.ts` + pasta do ticket; `src/`/`scripts/` intocados.

## Assinatura-alvo para o W1

Translator legado→core: `CNPJ→cnpj`, `EMAIL→email`, `CELLPHONE→phone`, `ALEATORY_KEY→random-key`, `CPF→cpf`. Fora do mapa → permanece `EnumUnknown` (estrito). Local a definir (preferir util compartilhável se `collaborator` consumir o mesmo vocabulário).
