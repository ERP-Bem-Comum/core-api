# W1 GREEN — CTR-USECASE-END-CONTRACT

> **Skills:** `ports-and-adapters` (use case) → `application-cli-builder` (CLI) · **Outcome:** GREEN · **Data:** 2026-05-25

## Objetivo da wave

Implementar o mínimo para tornar verdes os testes da W0: use case `endContract` +
comando CLI `encerrar-contrato`.

## Arquivos criados/editados

| Arquivo | Ação | Conteúdo |
| :--- | :--- | :--- |
| `src/modules/contracts/application/use-cases/end-contract.ts` | criado | `endContract` factory `(deps:{contractRepo,clock}) => (cmd) => Result`. Sequência: rehydrate id → findById → parseActive → expire/terminate (switch exaustivo, sem default) → save(contract,[event]). |
| `src/modules/contracts/cli/commands/encerrar-contrato.ts` | criado | Flags `--contrato`/`--motivo`; mapa PT `expiracao→Expire`, `distrato→Terminate`; motivo inválido/ausente → exit 64; erro de domínio → exit 1; sucesso → `formatContract`. |
| `src/modules/contracts/cli/registry.ts` | editado | Registra `'encerrar-contrato'`. |

## Decisões de design

- **`at = clock.now()`** (YAGNI): sem agendamento automático por data nem flag de data
  explícita no MVP. `Contract.expire` já rejeita `at < currentPeriod.end` (CA-3) e período
  `Indefinite` (CA-4); a borda da CLI só traduz o motivo PT→kind.
- **Switch exaustivo sem `default`** em `applyTransition` — `EndContractKind` tem 2 variantes;
  `noFallthroughCasesInSwitch` garante exaustividade (regra domain/application).
- **Nenhum erro novo inventado**: reusa `ContractError` (tagged) e `ContractIdError`; o
  formatter PT (`error.ts`) já cobre `ContractCannotExpireYet`/`ContractNotActive`/etc.

## Saída literal dos gates

`node --test` (use case + E2E):

```
ℹ tests 14
ℹ suites 6
ℹ pass 14
ℹ fail 0
```

`pnpm test` (suíte completa — zero regressão):

```
ℹ tests 1120
ℹ suites 380
ℹ pass 1104
ℹ fail 0
```

`pnpm run typecheck`:

```
> tsc --noEmit
(zero erros)
```

## Próximo passo

W2 REVIEW — skill `code-reviewer` (audit read-only; `pnpm run lint` + releitura do diff).
