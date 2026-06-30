# W2 REVIEW — CTR-IMPORT-LEGACY (passada 1)

> **Skill:** `code-reviewer` · **Veredito:** ✅ APPROVED · **Round:** 1/3 · **Data:** 2026-05-25

## Escopo auditado

- `src/shared/kernel/cnpj.ts`
- `src/modules/contracts/application/use-cases/create-contract.ts` (refactor `buildContract`)
- `src/modules/contracts/application/use-cases/import-contracts.ts`
- (fix lint no teste W0: removido import não-usado + stub `fail` async com await)

## Audit log

| Regra | Verificação | OK |
| :--- | :--- | :--- |
| application: use case factory `(deps)=>(cmd)=>Promise<Result>` | `importContracts` segue a forma | ✅ |
| DRY: validação única dry-run/persistente | `buildContract` extraído e compartilhado por `createContract` + `importContracts` (NFR-4) | ✅ |
| superfície externa de `createContract` preservada | `CreateContractError = BuildContractError \| dup \| repoError`; testes de regressão verdes | ✅ |
| domínio/app: zero `throw`/`class`/`any`; `Result` | cnpj puro (boolean); use case em Result | ✅ |
| sem non-null assertion | `for (const [i, row] of rows.entries())` em vez de `rows[i]!` | ✅ |
| isolamento de módulo (ADR-0006) | CNPJ replicado em `shared/kernel/` — **não** importa `financial/tax-id` | ✅ |
| `import type` p/ tipos; `.ts` nas extensões | conforme | ✅ |
| D2 (CNPJ validado e descartado) | validado quando presente; nunca passado a `buildContract`/persistido | ✅ |
| D3 (atomicidade por linha) | falha de dado → `failures`, lote continua; infra → `Result.err` aborta | ✅ |
| determinismo dry-run | dry-run faz dup-check read-only, só pula `save` | ✅ |

## Observações (não-bloqueantes)

- `Deps.clock` não é lido em `importContracts` — mantido por simetria com `createContract`
  (que também carrega `clock` não-usado em `Deps`) e forward-compat. Se incomodar, remover em
  ambos num ticket de limpeza.
- CNPJ aqui é **numérico** (legado). O alfanumérico Serpro/2026 segue no `tax-id` do financial.

## Gate

```
> eslint .
(zero erros)
```

## Veredito

**APPROVED** — segue para W3.
