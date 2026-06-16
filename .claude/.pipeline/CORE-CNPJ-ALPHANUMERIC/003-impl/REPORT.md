# W1 — Implementação mínima (CORE-CNPJ-ALPHANUMERIC)

**Resultado:** 🟢 GREEN — disciplina `ts-domain-modeler`.

## Mudança (`src/shared/kernel/cnpj.ts`)

- `onlyDigits` (apagava letras) → `normalize`: `replace(/[.\-/\s]/g, '').toUpperCase()` — mantém `A-Z`.
- Novo `CNPJ_SHAPE = /^[0-9A-Z]{12}[0-9]{2}$/` (12 alfanuméricos + 2 DVs numéricos).
- `isValidCnpj`: `length === 14` → shape → rejeita 14 iguais (`/^(.)\1{13}$/`) → DV1 → DV2.
- `checkDigit` **inalterado** (já usava `charCodeAt − 48` = `ASCII − 48`).
- `parse` brandar `normalize(raw)` (uppercase, sem máscara).
- Docstring reescrito: remove referência stale a `financial/.../tax-id.ts` (inexistente);
  documenta o formato alfanumérico + retrocompat; referencia ADR-0044.

## Execução

```
node --test tests/shared/kernel/cnpj.test.ts → 17/17
pnpm run typecheck                            → verde
```

Decisões mínimas (YAGNI): rejeição de degenerados restrita a "14 caracteres idênticos"
(retrocompat com `00000000000000`); não foi adicionado gerador de CNPJ nem helper de teste.
Não-regressão cross-BC (supplier/financier/act/contracts) verificada no W3 (suíte completa).
