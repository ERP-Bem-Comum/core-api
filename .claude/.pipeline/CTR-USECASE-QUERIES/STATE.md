# Estado do Ticket CTR-USECASE-QUERIES

| Wave | Status |
| :--- | :--- |
| W0 | ✅ |
| W1 | ✅ — 176/176 |
| W2 | ✅ APPROVED |
| W3 | ✅ ALL GREEN |

## 🎉 Ticket FECHADO

**Artefatos:**
- `src/modules/contracts/application/use-cases/list-contracts.ts` (13 linhas) — wrapper finíssimo do `contractRepo.list()`
- `src/modules/contracts/application/use-cases/get-contract.ts` (32 linhas) — valida ID + busca + `contract-not-found`
- `tests/modules/contracts/application/use-cases/queries.test.ts` (88 linhas, 5 testes)

**Mudanças no Port:**
- `ContractRepository.list(): Promise<Result<readonly Contract[], ContractRepositoryError>>` adicionado.
- `InMemoryContractRepository` implementa `list()` retornando `[...map.values()]`.

**Padrões:**
- Use case de **query** (read-only): sem EventBus, sem Clock, sem persistência — só `repo` na `Deps`.
- `Result` ainda é o canal — erros de repo (`'contract-repo-unavailable'`) podem acontecer em adapter real.
- `getContract` re-valida ID na borda (mesma defesa que commands).

## ✅ Cadeia de use cases COMPLETA

Os 5 use cases necessários para a CLI estão prontos:

1. `createContract` — cria Contract Active
2. `createAmendment` — cria Amendment Pending
3. `attachSignedDocument` — anexa documento
4. `homologateAmendment` — orquestra Amendment+Contract (use case grande, fechado anteriormente)
5. `listContracts` / `getContract` — queries para CLI exibir

**Próximo:** `CTR-CLI-MVP` — entrypoint + format helpers + dispatcher de subcomandos. P.O. brinca com regras pelo terminal.
