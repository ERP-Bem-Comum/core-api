# PRG-ETL-BOOTSTRAP — Migração ETL da entidade legada `programs` → módulo `programs`

> **Size:** M · **Módulo:** `programs` (apenas `prg_*` + `scripts/etl/` — não tocar outros módulos) ·
> **Slice:** 1 da migração completa legado→core-api (as 32 tabelas). Primeira fatia vertical de um módulo
> que ainda **não** tinha ETL (só `auth` e `partners` tinham).
> **Origem:** decidido na sessão 2026-07-01 (migração completa, validação estrita, runtime EC2+Docker).
> Runbook operacional em `ERP-INFRA/docs/runbooks/dump-migration.md`; plano mestre das 32 tabelas à parte.
>
> **Nota de formalização:** esta fatia foi implementada como spike (código + testes juntos, gate verde) e
> formalizada no pipeline **retroativamente**. O W0 RED foi **genuinamente reproduzido** (removido o mapper
> → teste falha com `ERR_MODULE_NOT_FOUND`, evidência no REPORT do W0). Da fatia 2 em diante: fail-first
> genuíno (RED antes de `src/`).

## Contexto

O ETL one-shot (legado → core-api, `scripts/etl/`) migra hoje só 4 entidades (suppliers, financiers,
collaborators, users). O módulo `programs` tem agregado (`Program.create`) e schema (`prg_programs`), mas
**não** tinha: coluna de proveniência `legacy_id`, port de ETL na `public-api`, nem mapper legado→domínio.
Este ticket entrega essa maquinaria e prova o padrão de extensão (espelhando `partners`) para um módulo novo.

Zero regra de negócio nova: reusa `Program.create`/`Program.deactivate`, `Sigla.create`, o `program.mapper`
de persistência e o driver `openMysqlPrograms` existentes.

## Escopo

### 1. Coluna de proveniência `prg_programs.legacy_id`
- `legacy_id INT NULL` + `uniqueIndex('prg_programs_legacy_id_idx')` no schema Drizzle
  (`src/modules/programs/adapters/persistence/schemas/mysql.ts`). NULL = nativo; não-NULL = migrado.
- Migration via `pnpm run db:generate:programs` (journal `__drizzle_migrations_programs`).
- Exportar `ProgramRow`/`NewProgramRow` (`$inferSelect`/`$inferInsert`). Skill: `drizzle-schema-author`.

### 2. Port de ETL na `public-api` do programs
- `src/modules/programs/application/ports/legacy-entity-store.ts` — `LegacyEntityStore<A,Ref>` genérico
  (cópia do padrão partners; erros `programs-etl-store-unavailable | programs-etl-store-integrity-violation`).
- `src/modules/programs/adapters/persistence/repos/programs-etl-store.drizzle.ts` — `provision` idempotente
  (SELECT `.for('update')` by `legacy_id` → INSERT ou skip `already-exists`, **nunca UPDATE**);
  `classifyProvisionError` (1062 no `_legacy_id_idx` → already-exists; 1062 em outra UNIQUE `prg_*` →
  integrity-violation; resto → unavailable).
- `legacy-entity-store.in-memory.ts` (testes) + `src/modules/programs/public-api/etl.ts`
  (`buildProgramsEtlPort({connectionString})` → `openMysqlPrograms({applyMigrations:true})` → `{ programs, close }`).
  Importado por path direto (ADR-0006), fora do barrel.

### 3. Fatia ETL em `scripts/etl/`
- `legacy/rows.ts` (`LegacyProgramRow`, sem segredos), `legacy/decode.ts` (`decodeProgramRow`),
  `legacy/reader.ts` (lê tabela `programs`).
- `mappers/program.mapper.ts` — `mapLegacyProgramRow(row, clock)`: **validação estrita** via `Program.create`
  (+ `Program.deactivate` quando `active=0`), `combine` acumulando erros → quarentena `DomainRejected`.
- `quarantine/reason.ts` (nova variante `DomainRejected {tag,field,code}`), `orchestrate.ts`
  (`programs` em `MIGRATION_ORDER`, raiz), `main.ts` (wiring `buildProgramsEtlPort`).

### Mapeamento de negócio (decisões travadas)
- `legacyId = programNumber = row.id` (int legado reusado como número de exibição, determinístico).
- id do agregado = `ProgramId.generate()` (novo UUID). `name`→name (≥2), `abbreviation`→sigla (`Sigla.create`),
  `director`/`description` → `trim || null`, `logoKey = null` SEMPRE (o `logo` legado é URL, não chave S3;
  re-upload fica p/ fatia futura), `now = createdAt` legado ou clock.
- `active === 0` → `create` + `deactivate` (estado Inativo sempre via transição de domínio).

## Critérios de aceite
- [x] `prg_programs.legacy_id` (nullable, UNIQUE) + migration `0001` gerada; `db:generate:programs` limpo.
- [x] Reconstrução passa pelo domínio: `Program.create` revalida nome/sigla; dado inválido → quarentena `DomainRejected` (nunca INSERT direto).
- [x] `active=0` → agregado Inativo via `Program.deactivate` (não injeta estado).
- [x] Idempotência por `legacy_id` (SELECT FOR UPDATE → skip `already-exists`, nunca UPDATE).
- [x] Teste unit do mapper: 7 casos (ativo, inativo, nome curto→quarentena, sigla inválida→quarentena, programNumber=legacyId, acúmulo de erros).
- [x] W3 verde: `pnpm run typecheck` + `format:check` + `lint` + `pnpm test`.

## Fora de escopo
- Re-upload do `logo` legado como `logoKey` S3 (fatia futura).
- Asserções nos testes de integração gated (`*_INTEGRATION`) e execução real contra DB/Docker (fixture pronta).
- Read-side/backfill de `programs` além do write-port.
- Qualquer outro módulo (anti-padrão #4) — as demais tabelas legadas são fatias separadas.

## Notas de disciplina
- Módulo único `programs` nesta sessão. Idioma: erros internos EN kebab-case; doc PT-BR.
- Reusar agregados/VOs/repos existentes; zero regra de negócio nova.
