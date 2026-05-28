# W2 REVIEW — CTR-USECASE-END-CONTRACT

> **Skill:** `code-reviewer` · **Veredito:** ✅ APPROVED · **Round:** 1/3 · **Data:** 2026-05-25

## Escopo auditado (read-only)

- `src/modules/contracts/application/use-cases/end-contract.ts`
- `src/modules/contracts/cli/commands/encerrar-contrato.ts`
- `src/modules/contracts/cli/registry.ts`

## Audit log — regras transversais

| Regra (`.claude/rules/*`) | Verificação | OK |
| :--- | :--- | :--- |
| application: use case = factory `(deps)=>(cmd)=>Promise<Result>` | `endContract` segue a forma | ✅ |
| application: sequência validar→fetch→domain→persist→publish | rehydrate → findById → parseActive → transição → save(c,[event]) | ✅ |
| application: evento atômico no save (ADR-0015) | event no 2º arg de `save`, igual a createContract/createAmendment | ✅ |
| application: sem import de `adapters/` | importa só `domain/` + `shared/` | ✅ |
| domain/application: zero `throw`, zero `class`, `Result` | use case e CLI puros em Result | ✅ |
| switch exaustivo sem `default: throw` | `applyTransition` cobre Expire/Terminate, sem default | ✅ |
| `verbatimModuleSyntax`: `import type` p/ tipos | `ContractIdError`, `ActiveContract`, `EndContractKind`, etc. todos `import type`; `Contract`/`endContract` como valor | ✅ |
| `NodeNext`: extensão `.ts` nos imports | todos os relativos com `.ts` | ✅ |
| adapters/CLI: PT-BR na borda via formatters | `formatContract`/`formatErrorCode`; mapa `expiracao/distrato` | ✅ |
| adapters/CLI: não vaza `Error`; exit codes sysexits | 64 (uso) / 1 (domínio) / 74 (I/O) | ✅ |
| sem erro novo inventado | reusa `ContractError` tagged + dicionário PT existente | ✅ |
| módulo isolation (ADR-0014) | só toca `contracts/`; nada de `fin_*`/Financeiro | ✅ |

## Observações (não-bloqueantes)

- `EndContractError` inclui o union `ContractError` inteiro (14 variantes); só ~4 são
  alcançáveis. É o mesmo padrão de `createContract`/`homologateAmendment` — coerência > narrowing.
- `at = clock.now()`: decisão MVP documentada no 000-request e no W1. Sem agendamento por data.

## Gate

```
> eslint .
(zero erros / zero warnings)
```

## Veredito

**APPROVED** — nenhuma issue bloqueante. Segue para W3.
