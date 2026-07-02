# W1 — GREEN · PRG-ETL-BOOTSTRAP

**Skill:** ports-and-adapters (+ drizzle-schema-author, ts-domain-modeler, nodejs-process-runner) · **Outcome:** GREEN ✅ · **Data:** 2026-07-01

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `src/modules/programs/application/ports/legacy-entity-store.ts` | port `LegacyEntityStore<A,Ref>` + `ProgramsEtlStoreError` + `ProvisionOutcome` |
| `src/modules/programs/adapters/persistence/repos/programs-etl-store.drizzle.ts` | adapter Drizzle: `classifyProvisionError`/`safe`/`runProvision` + `createDrizzleProgramsEtlStores` |
| `src/modules/programs/adapters/persistence/repos/legacy-entity-store.in-memory.ts` | store in-memory p/ testes |
| `src/modules/programs/public-api/etl.ts` | `buildProgramsEtlPort({connectionString})` → `{ programs, close }` |
| `scripts/etl/mappers/program.mapper.ts` | `mapLegacyProgramRow(row, clock)` — validação estrita via domínio |
| `tests/etl/mappers/program.mapper.test.ts` | 7 casos (ver W0) |
| `.../migrations/mysql/0001_grey_triathlon.sql` (+ snapshot) | migration do `legacy_id` |

## Arquivos modificados

- `src/modules/programs/adapters/persistence/schemas/mysql.ts` — `legacyId: int('legacy_id')` + `uniqueIndex('prg_programs_legacy_id_idx')` + export `ProgramRow`/`NewProgramRow`.
- `scripts/etl/legacy/{rows,decode,reader}.ts` — `LegacyProgramRow`, `decodeProgramRow`, leitura de `programs`.
- `scripts/etl/quarantine/reason.ts` — variante `DomainRejected {tag,field,code}` + `describeReason`.
- `scripts/etl/orchestrate.ts` — `programs` em `EntityName`/`MIGRATION_ORDER` (raiz, primeiro) + `programsPort`/`clock` em `OrchestrateDeps` + bloco de migração; `migrateAggregateRow` generalizado p/ `EtlStore<A,Ref,E>` (uniões de erro disjuntas entre módulos, sem cast).
- `scripts/etl/main.ts` — wiring `buildProgramsEtlPort` (guard + `close` no finally + `kind:'programs-port'`) + `clock: ClockReal()`.
- `tests/etl/orchestrate.test.ts` + `tests/etl/fixtures/legacy-mini.sql` — regressão zero (programs no helper + fixture).

## Migration gerada

```sql
ALTER TABLE `prg_programs` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `prg_programs` ADD CONSTRAINT `prg_programs_legacy_id_idx` UNIQUE(`legacy_id`);
```

## Desvios vs. plano (com base no código real)
1. `createDrizzleProgramsEtlStores(handle)` **sem** `clock` — `programToInsert(program)` já embute `createdAt`/`updatedAt` do agregado (diferente de `supplierToInsert(s, now)`).
2. `Program.create`/`deactivate` retornam `Result<{program, event}, ProgramError>` — o mapper extrai `.value.program`.
3. `director`/`description` decodificados nullable apesar de `NOT NULL` no dump — o domínio aceita `null`; evita quarentena espúria e honra `trim || null`.
4. Nova `QuarantineReason` `DomainRejected` (genérica, PII-free, carrega o erro EN do domínio) — `RequiredFieldMissing`/`EnumUnknown` não encaixavam na sigla.
5. `clock` adicionado a `OrchestrateDeps` (fallback de data do mapper) — ripple tratado em `main.ts` e no teste.
