# W1 GREEN — CTR-IMPORT-LEGACY (passada 1: use case `importContracts`)

> **Skill:** `ports-and-adapters` · **Outcome:** GREEN · **Data:** 2026-05-25

## Arquivos criados/editados

| Arquivo | Ação |
| :--- | :--- |
| `src/shared/kernel/cnpj.ts` | **criado** — `isValidCnpj(raw)` puro (14 dígitos, módulo 11, rejeita repetidos; aceita máscara). Algoritmo replicado do `tax-id.ts` (financial não-importável, ADR-0006). |
| `src/modules/contracts/application/use-cases/create-contract.ts` | **refatorado** — extraído `buildContract(cmd): Result<…, BuildContractError>` (validação pura, sem IO). `createContract` agora consome `buildContract` + dup-check + save. |
| `src/modules/contracts/application/use-cases/import-contracts.ts` | **criado** — use case `importContracts`. |
| `tests/shared/kernel/cnpj.test.ts` | **criado** — testes diretos do validador. |

## Decisões aplicadas (confirmadas pelo P.O.)

1. **CNPJ** → função pura `src/shared/kernel/cnpj.ts`. Validado e **descartado** (D2).
2. **`buildContract` compartilhado** → garante determinismo dry-run = persistente (NFR-4) sem
   duplicar validação. `createContract` e `importContracts` usam a mesma construção pura.

## Semântica implementada

- Falha de **dado** (CNPJ inválido, validação de domínio, duplicidade) → entrada em `failures`,
  lote continua (D3).
- Falha de **infra** (`findBySequentialNumber`/`save` retornam `err`) → `Result.err` top-level (aborta).
- Duplicidade: intra-arquivo (`Set`) + vs repositório. Dry-run faz dup-check read-only, sem `save`.

## Saída literal dos gates

`node --test` (import + cnpj + regressão create-contract):

```
ℹ tests 27
ℹ pass 27
ℹ fail 0
```

`pnpm test` (suíte completa, +14, zero regressão):

```
ℹ tests 1137
ℹ pass 1121
ℹ fail 0
ℹ skipped 16
```

`pnpm run typecheck`: zero erros.

## Próximo passo

W2 REVIEW (`code-reviewer`). Sub-ticket seguinte: `CTR-IMPORT-LEGACY-CLI` (parser CSV/JSON UTF-8 + comando `importar-contratos`).
