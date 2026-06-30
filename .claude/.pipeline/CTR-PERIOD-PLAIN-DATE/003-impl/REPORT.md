# W1 — Implementação (GREEN)

Migração guiada por `tsc`. 21 arquivos de src + 13 de teste.

## Domínio

- `period.ts` — `start`/`end`: `PlainDate`. `create` só valida ordem (`compare`); `createIndefinite` retorna `Period`. `contains` projeta o instante com `PlainDate.fromDate`. `PeriodError` enxuto: `period-end-before-start | period-zero-duration`.
- `amendment/types.ts` — `TermChange.newEndDate: PlainDate` (2 ocorrências).
- `contract/types.ts` — `ContractAdjustment.PeriodExtension.newEnd: PlainDate`.
- `errors.ts` — `ContractCannotExpireYet`/`ContractPeriodExtensionNotAfterCurrentEnd`: campos de data → `PlainDate`.
- `contract.ts` — `expire` mantém `at: Date`, compara `PlainDate.fromDate(at)` vs `end`; `PeriodExtension` via `PlainDate.compare`.
- `amendment.ts` — removido `isValidDate(newEndDate)` (garantido pelo VO).

## Application

- `create-contract` / `create-amendment` — parse de input via `PlainDate.from`. `create-contract` usa helper `buildPeriod()` (sem `let` não-inicializado).

## Adapters

- `period.mapper` / `amendment.mapper` — colunas seguem `DATETIME`; conversão na borda (`PlainDate → Date UTC` no write, `PlainDate.fromDate` no read).
- `outbox.mapper` — (de)serializa período como `YYYY-MM-DD`.
- `state.ts` (CLI memory) — `isValidPlainDateShape` substitui validação de `Date` em período/`newEndDate`; `start`/`end`/`newEndDate` saem do `DATE_KEYS` reviver.

## CLI

- `formatters/plain-date.ts` novo (`DD/MM/YYYY` de `PlainDate`); `period.ts`/`amendment.ts` usam-no para datas-calendário; `formatDate(Date)` segue para instantes.

## GREEN

Suíte completa: 1163 pass · 0 fail · 16 skipped. Inclui as E2E de CLI (state file round-trip de período em PlainDate).
