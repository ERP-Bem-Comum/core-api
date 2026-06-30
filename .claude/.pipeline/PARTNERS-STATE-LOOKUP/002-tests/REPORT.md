# W0 — RED · PARTNERS-STATE-LOOKUP

> Agente: tdd-strategist · Resultado: **RED** (módulo inexistente)

## Arquivo de teste

`tests/modules/partners/domain/geography/state.test.ts` (novo) — cobre:

- **Padrão D**: expõe `parse`/`listStates`/`findStateByAbbreviation`, sem `generate`.
- **`parse`**: aceita UF válida; normaliza minúsculas/espaços → 2 letras maiúsculas; rejeita sigla
  bem-formada mas inexistente (`'XX'`), comprimento != 2 e vazio. Erro `'invalid-state'`.
- **Catálogo**: `listStates()` retorna exatamente 27 UFs ordenadas por sigla (inclui DF);
  `findStateByAbbreviation` resolve `'SP'`→`São Paulo`, aceita minúscula, rejeita inexistente.

## Execução

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../partners/domain/geography/state.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Veredito

RED legítimo — falha por ausência do módulo. Liberado para W1.
