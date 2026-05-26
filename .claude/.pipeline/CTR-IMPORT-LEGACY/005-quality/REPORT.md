# W3 QUALITY — CTR-IMPORT-LEGACY (passada 1: use case `importContracts`)

> **Skill:** `ts-quality-checker` · **Outcome:** ALL-GREEN · **Data:** 2026-05-25

## Gates

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | `tsc --noEmit` — zero erros |
| `pnpm run format:check` | `All matched files use Prettier code style!` |
| `pnpm run lint` | `eslint .` — zero erros |
| `pnpm test` | ver abaixo |

> Nota: o typecheck do W3 capturou um widening de literal no stub de teste (literal `string`
> vs `ContractRepositoryError`) que o lint do W2 não pegava — corrigido com `as const`. Gate
> cumpriu seu papel.

## Saída literal — `pnpm test`

```
ℹ tests 1137
ℹ pass 1121
ℹ fail 0
ℹ skipped 16
```

## Veredito

**ALL-GREEN.** Núcleo do UC-11 entregue: use case `importContracts` (v1, Contratos Mãe),
validador `isValidCnpj`, e `buildContract` compartilhado. CNPJ validado e descartado (D2);
atomicidade por linha (D3); dry-run determinístico (NFR-4).

## Pendente (sub-ticket seguinte)

`CTR-IMPORT-LEGACY-CLI` — parser CSV/JSON UTF-8 (FR-1, FR-2; possível decisão de dependência
CSV, ADR-0011) + comando CLI `importar-contratos` (H6, H7). Aditivos legados = v2 (Inquiry-0014 Q3).
