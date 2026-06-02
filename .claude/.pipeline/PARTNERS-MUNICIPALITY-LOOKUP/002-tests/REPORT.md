# W0 — RED · PARTNERS-MUNICIPALITY-LOOKUP

> Agente: tdd-strategist · Resultado: **RED** (módulo inexistente)

## Arquivo de teste

`tests/modules/partners/domain/geography/municipality.test.ts` — cobre:

- **Padrão D**: `parse`/`listMunicipalities`/`findMunicipalityByCod`/`listMunicipalitiesByUf`, sem `generate`.
- **`IbgeCode.parse`**: aceita 7 dígitos; rejeita comprimento != 7, não-dígitos, vazio (`'invalid-ibge-code'`).
- **Catálogo**: `listMunicipalities()` ≥ 5570; `findMunicipalityByCod('3550308')` → São Paulo/SP;
  código inexistente bem-formado rejeitado; `listMunicipalitiesByUf('SP')` filtra e `'XX'` → erro.
- **INTEGRIDADE**: toda `uf` do catálogo é uma `StateAbbreviation` válida (cross-check com o catálogo
  de estados do ticket anterior) e cobre exatamente as 27 UFs.

## Execução

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../geography/municipality.ts'
ℹ tests 1 · pass 0 · fail 1
```

RED legítimo. Liberado para W1.
