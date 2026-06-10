# W1 — Implementação (GREEN)

Reescrita vertical única, commitada por camada (RED→GREEN incremental por camada):

| # | Camada | Commit | Conteúdo |
| --- | --- | --- | --- |
| 1 | Domínio | `2967dc0` | `act-number.ts` (VO), `events.ts`, `types.ts`, `errors.ts`, `act.ts` (regra de repasse condicional + validity Period + eventos). 17 testes. |
| 2 | Persistência | `39a159d` | schema `par_acts`, `act.mapper` (Period↔date + payment target), repos drizzle/in-memory, port `findByActNumber`, migration `0008` (D3) validada. 8 testes. |
| 3 | Application | `fb33ebe` | `register/edit/list/deactivate/reactivate-act` (guard actNumber duplicado; filtros). |
| 4 | HTTP | `96cbd22` | `act-schemas`/`act-dto`/`act-plugin`/`act-list-query` + `partner-aggregate` (CNPJ); rotas `/api/v1/acts`. 25 testes. |
| 5 | Export/cross-módulo/seed | `81f389d` | `act-csv`, `contractor-view` (document=CNPJ), `seed-partners`; testes cross-cutting. |
| W2 | Refactor DRY | `dcd16c7` | `act-list-query` reusa `actMatchesFilter` do use case. |

**Resultado:** typecheck global 0 erros; suíte de partners (act + cross-cutting) 83 testes verde.
