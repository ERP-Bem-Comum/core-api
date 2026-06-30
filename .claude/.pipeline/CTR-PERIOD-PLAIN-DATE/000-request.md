# CTR-PERIOD-PLAIN-DATE — Migrar `Period` (e datas-calendário do domínio) para `PlainDate`

## Origem

Inquiry [0020](../../../handbook/inquiries/0020-temporal-api-adoption.md) — **Fase 2**. Consome o VO `PlainDate` da Fase 1 (`CTR-VO-PLAIN-DATE`). Substitui `Date` por `PlainDate` onde o dado é semanticamente data-calendário (vigência, prazo de aditivo), eliminando a mistura instante×calendário (`period.ts` usava `getTime()` e `getUTCFullYear()` no mesmo tipo).

## Escopo (mudança de tipo ATÔMICA — 21 src + ~22 testes, guiada por `tsc`)

- **Domínio:**
  - `Period` (`start`/`end`: `Date` → `PlainDate`); `create`/`createIndefinite`/`contains`/`equals`.
  - `amendment/types.ts` — `TermChange.newEndDate: Date → PlainDate`.
  - `contract.ts` — `expire` mantém `at: Date` (instante p/ `endedAt`/`occurredAt`), compara `PlainDate.fromDate(at)` vs `period.end`; `PeriodExtension` usa `PlainDate.compare`.
  - `ContractAdjustment.PeriodExtension.newEnd: Date → PlainDate`.
  - `errors.ts` — `ContractCannotExpireYet`/`ContractPeriodExtensionNotAfterCurrentEnd`: campos de data de período → `PlainDate`.
- **Application:** `create-contract`, `create-amendment`, `homologate-amendment`, `import-contracts` — parse de input vira `PlainDate.from`.
- **Adapters:** `period.mapper` converte `PlainDate ↔ Date` na borda (colunas seguem `datetime`); `outbox.mapper` (de)serializa `Period` como `YYYY-MM-DD`; `contract.mapper`/`amendment.mapper` seguem.
- **CLI:** `criar-contrato`/`criar-aditivo` (input de data), `formatters/*` (exibe datas de período/erro), `state.ts` (serialização do memory driver).

## Critérios de aceitação

- CA1: `Period` expõe `start`/`end` como `PlainDate`; `contains` compara um instante (`Date`) contra a faixa de calendário via `PlainDate.fromDate`.
- CA2: expiração e extensão de prazo comparam por calendário (sem `getTime()`); semântica preservada nos testes existentes.
- CA3: evento `ContractCreated`/`ContractStateUpdated` round-trip pelo outbox com período em `YYYY-MM-DD`.
- CA4: dedupe dos 2 formatters de data (`contracts`/`financial`) via `PlainDate.toISOString`/display.
- CA5: gate W3 verde (typecheck + lint + format + suíte completa).

## Decisões cravadas (sessão 2026-05-26)

- **Sem migration de schema** — colunas `datetime` mantidas; conversão na borda do mapper. Migrar coluna → `date` é **Fase 2b opcional** (toca hardening/migration tests).
- `expire` mantém assinatura `at: Date`.

## Fora de escopo

- Migrar `Date` que representam **instantes reais** (`occurredAt`, `endedAt`, `signedAt`, `homologatedAt`, timestamps de outbox) — continuam `Date` (corretos como instante).
- Fase 2b (schema `date`) e Fase 3 (swap backend → `Temporal.PlainDate` no Node 26 LTS).
