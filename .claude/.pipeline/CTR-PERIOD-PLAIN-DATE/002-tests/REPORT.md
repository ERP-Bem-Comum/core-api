# W0 — Testes (RED)

Migração de tipo atômica: mudar `Period.start/end` de `Date` para `PlainDate`
quebra a compilação de todo o grafo que toca período. O "RED" é a suíte
existente re-apontada para a nova API.

## Especificação nova (período = calendário)

`tests/modules/contracts/domain/shared/period.test.ts` reescrito para a semântica
de calendário:
- `create`/`createIndefinite` recebem `PlainDate` (validade/ano migraram para o VO `PlainDate`).
- `createIndefinite` retorna `Period` direto (não mais `Result`).
- `contains(p, instant)` projeta o instante para data-calendário UTC — novo teste
  prova que hora-do-dia é ignorada (`2026-12-31T23:59:59Z` ainda contido).
- removidos os casos de `period-invalid-*`/`period-year-out-of-range` (agora cobertos por `plain-date.test.ts`).

## RED inicial

`pnpm run typecheck` listou ~48 erros em 21 src + 12 testes (compilador como worklist da migração).
