# Estado do Ticket CTR-AGG-CONTRACT

| Wave | Status | Skill | REPORT | Atualizado |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ done | ts-domain-modeler | [002-tests/REPORT.md](./002-tests/REPORT.md) | 2026-05-14 |
| W1 — GREEN | ✅ done | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) | 2026-05-14 |
| W2 — REVIEW | ✅ done (APPROVED round 1) | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) | 2026-05-14 |
| W3 — QUALITY | ✅ done (ALL GREEN) | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) | 2026-05-14 |

## 🎉 Ticket FECHADO

Pipeline 4-wave completa em **1 rodada**, zero rounds de retrabalho. **Primeiro agregado real do módulo Contracts.**

### Artefatos de produção entregues

- `src/modules/contracts/domain/contract/types.ts` (38 linhas) — `Contract` branded + `ContractStatus` + `ContractAdjustment` (DU) + `CreateContractInput`.
- `src/modules/contracts/domain/contract/events.ts` (17 linhas) — `ContractEvent` (3 variantes).
- `src/modules/contracts/domain/contract/errors.ts` (13 linhas) — `ContractError` (12 códigos).
- `src/modules/contracts/domain/contract/contract.ts` (202 linhas) — 4 comandos + helpers privados.
- `tests/modules/contracts/domain/contract/contract.test.ts` (361 linhas) — 30 testes em 11 suítes.

### Commit sugerido

```
feat(contracts): adiciona agregado raiz Contract com state machine

- entidade Contract (Brand<Readonly<{...}>, 'Contract'>) consumindo Money, Period, ContractId
- status Active | Expired | Terminated; transições via guards (assertActive)
- comandos: create, expire, terminate, applyHomologatedAdjustment
- discriminated union ContractAdjustment: ValueIncrease | ValueDecrease | PeriodExtension | Acknowledgment
- eventos: ContractCreated | ContractStateUpdated | ContractEnded
- idempotência via homologatedAmendmentIds[]
- invariantes R2/R3/R5 do handbook preservadas
- 30 testes verdes (11 suítes); 99 testes totais no domínio
- aderente CLAUDE.md raiz: zero class/this/any; 1 throw justificado (exhaustive)
```

### Padrões emergentes (a propagar)

- **Alias no import** quando type+namespace homônimos vivem em arquivos separados (`import type { X as XEntity }`).
- **`as unknown as XEntity`** em transições de estado de agregado (mais defensivo que `as XEntity` sob TS 6 + `verbatimModuleSyntax`).
- **Tradução PT↔EN explícita** na seção do `000-request.md` quando handbook usa nomes em PT.
- **`assert*` helpers locais privados** retornando `Result<T, SpecificError>` para early returns.
- **Pareamento `{ contract, event }`** em todo Result de comando — caller decide quando publicar.

### Próximo ticket sugerido

- **Caminho A (módulo completo):** `CTR-AGG-AMENDMENT` + use case `homologateAmendment`.
- **Caminho B (valor à P.O. cedo):** `CTR-CLI-MVP` — expõe `Contract.create/expire/terminate` via CLI com adapter InMemory.
