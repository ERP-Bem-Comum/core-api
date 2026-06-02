# W1 — GREEN — PARTNERS-ETL-CORE

**Skill:** ts-domain-modeler · **Outcome:** GREEN

## Fundação
- `scripts/etl/quarantine/reason.ts` — `QuarantineReason` (tagged union, exhaustive sem throw) + `describeReason` (PT, sem PII) + `toSummary` (D12 — `{tag,field}` versionável).
- `scripts/etl/reconcile.ts` — tally puro; invariante `read = migrated + quarantined + alreadyExists`.
- `scripts/etl/legacy/rows.ts` — tipos das 4 linhas legadas (sem `password` — D6).
- `scripts/etl/mappers/shared.ts` — helpers `requireField`/`requireEmail`/`parseCnpjField`/`parseCpfField`/`parseEnumField`/`parseNullableEnumField`/`checkOverflow(Nullable)`/`statusFromActive` → `E` homogêneo p/ `combine`.

## Mappers (parse→`combine`→`rehydrate`)
- `financier.mapper.ts` · `supplier.mapper.ts` (renomeia bancaryInfo/pixInfo; payment-target obrigatório) · `collaborator.mapper.ts` (enums literais; status PT→EN; **D10** backfill `LEGACY_MIGRATION`; **D13** overflow) · `user.mapper.ts` (DTO `ValidatedLegacyUser` — `userRef`/`collaboratorRef` deferidos ao WRITER; massApprove flag).

## Decisões
- Inferência do `combine` falha com tupla de `Result` de 2 ramos → **type args explícitos** em cada call-site.
- **D10**: conflito enum resolvido via ticket `PARTNERS-DISABLE-REASON-LEGACY-MARKER` (decisão do especialista de domínio).
- **Decode layer (unknown→typed)**: deferido ao slice READER (acoplado ao typeCast do `mysql2`).

## Resultado
`tests/etl/**` → `tests 33 · pass 33 · fail 0`. Suite global `1895 · pass 1879 · fail 0`.
