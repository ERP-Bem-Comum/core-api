# W0 — RED · PARTNERS-FINANCIER-DOMAIN

> Agente: tdd-strategist · Resultado: **RED** (módulo inexistente)

## Arquivo de teste

`tests/modules/partners/domain/financier/financier.test.ts` — cobre:

- **`FinancierId`**: `generate` → UUID v4; `rehydrate` valida/rejeita.
- **`register`**: cria `Active` com CNPJ normalizado + `FinancierRegistered` (cnpj + occurredAt
  injetado); rejeita cada campo texto vazio com erro específico (`financier-<campo>-required`);
  rejeita CNPJ inválido (`invalid-cnpj`).
- **`deactivate`**: Active → Inactive (+`deactivatedAt`, evento); já inativo → `financier-already-inactive`.
- **`reactivate`**: Inactive → Active (+evento); já ativo → `financier-already-active`.

## Execução

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../financier/financier-id.ts'
ℹ tests 1 · pass 0 · fail 1
```

RED legítimo. Liberado para W1.
