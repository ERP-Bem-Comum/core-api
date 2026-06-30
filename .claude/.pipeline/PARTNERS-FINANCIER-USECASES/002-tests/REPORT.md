# W0 — RED · PARTNERS-FINANCIER-USECASES

> Agente: tdd-strategist · Resultado: **RED** (módulos inexistentes)

## Arquivo de teste

`tests/modules/partners/application/financier-usecases.test.ts` — InMemory + fake `Clock`
(`PlainDate.fromDate`). Cobre:

- **registerFinancier**: persiste Active + evento; CNPJ duplicado → `register-financier-cnpj-duplicate`;
  CNPJ inválido → `invalid-cnpj`.
- **deactivateFinancier**: existente → Inactive; id inexistente → `deactivate-financier-not-found`;
  rehydrate inválido → erro.
- **reactivateFinancier**: reativa um inativo.
- **queries**: `listFinanciers` retorna persistidos; `findFinancierByCnpj` acha e retorna `null` quando ausente.

Fixtures CNPJ (`11222333000181`, `04252011000110`) confirmadas válidas via `isValidCnpj`.

## Execução

```
Error [ERR_MODULE_NOT_FOUND]: '.../financier-repository.in-memory.ts'
ℹ tests 1 · pass 0 · fail 1
```

RED legítimo. Liberado para W1.
