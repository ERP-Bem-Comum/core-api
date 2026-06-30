# W0 — Testes RED · FIN-PROGRAM-REF (US3 Programa, passthrough)

**Wave**: W0 · **Agente**: tdd-strategist · **Resultado**: **RED** · **Data**: 2026-06-20

## Resultado

```
ℹ tests 3 · pass 0 · fail 3
```

| Teste | Falha RED |
| --- | --- |
| `adapters/persistence/program-read.in-memory.test.ts` (T018) | módulo `program-read.in-memory.ts` inexistente |
| `adapters/http/programs.http.test.ts` (smoke) | `200/403 !== 404` (rota `GET /financial/programs` ausente) |

## Contrato exercido (alvo do W1)

- **Financial port** `application/ports/program-read.ts`: `ProgramView = { id, name }`; `ProgramReadPort.list() → Promise<Result<readonly ProgramView[], 'program-read-unavailable'>>`.
- **in-memory** `createInMemoryProgramReadStore(programs)` → devolve o stub seedado; `[]` quando vazio.
- **Borda** `GET /api/v2/financial/programs` → 200 `[{id,name}]` atrás de `reference:read`; 403 sem permissão. memory driver semeia stub.

## Pré-requisito (programs — task adjacente, ADR-0006)

- `programs/public-api` precisa de uma **listagem** (`ProgramsReadPort.listAll()`), pois o `ProgramReadPort` atual só tem `getProgramViews(ids)` (batch). Estender SÓ o `ProgramsReadPort` (público), **sem** tocar o `ProgramReadPort` interno (mockado por testes do contracts).
