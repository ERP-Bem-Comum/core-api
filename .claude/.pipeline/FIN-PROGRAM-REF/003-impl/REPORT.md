# W1 — Implementação GREEN · FIN-PROGRAM-REF (US3 Programa, passthrough)

**Wave**: W1 · **Resultado**: **GREEN** · **Data**: 2026-06-20

## Resultado dos testes

```
# 3 testes do US3
ℹ tests 4 · pass 4 · fail 0

# regressão HTTP financial + módulo programs
ℹ tests 223 · pass 222 · fail 0  (1 skipped — integração opt-in)

# typecheck (cross-módulo financial↔programs)
tsc --noEmit → 0 erros
```

## Programs (extensão da public-api — task adjacente, ADR-0006)

| Arquivo | Mudança |
| --- | --- |
| `adapters/persistence/repos/program-list-read.drizzle.ts` (novo) | `listAll()` — SELECT de todos os programas, ordenado por `programNumber` |
| `public-api/read.ts` | `ProgramsReadPort` += `listAll()`; `buildProgramsReadPort` compõe o list-reader. **`ProgramReadPort` (batch) intacto** — mocks do contracts preservados |

## Financial

| Arquivo | Mudança |
| --- | --- |
| `application/ports/program-read.ts` (novo) | `ProgramView = {id,name}` + `ProgramReadPort.list()` (projeção própria) |
| `adapters/persistence/repos/program-read.in-memory.ts` (novo) | stub seedado (driver memory/testes) |
| `adapters/persistence/repos/program-read.from-programs.ts` (novo) | adapta `programs/public-api` (`listAll`) → `{id,name}` (ADR-0006) |
| `adapters/http/{schemas,dto,error-mapping,composition,plugin}.ts` | schema + dto + 503 + wiring (memory: stub; mysql: `buildProgramsReadPort` adaptado, espelha `buildContractsReadPort`; fecha no shutdown) + rota `GET /financial/programs` |

## Decisões

- **`ProgramReadPort` batch preservado**: a listagem entrou como `listAll()` só no `ProgramsReadPort` (público), sem alterar o port consumido/mockado por contracts → zero regressão (222/222).
- O erro `program-read-unavailable` é o mesmo slug nos dois módulos → repassado direto pelo adapter.
- Sem migration/tabela (Programa é referência externa — research D2). Lição do US1 aplicada no teste HTTP.
