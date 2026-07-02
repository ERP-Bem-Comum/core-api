# ETL-CONTRACTS-WRITER — writer domain-driven de contratos legados (+ programas)

## Contexto

Migração do dump `abc-erp-financeiro-prod` (fase contratos; decisões A/sim/sim ratificadas
em 2026-07-02 — ver `bem_comum/database/prod_dump/relatorio-decisao-3-marteladas.md` e
`mapa-migracao-legado-core.yaml`). O UC-11 (`import-contracts`) só produz `Active` e não
carrega programId/metadata → writer próprio no padrão `scripts/etl/` (100% via domínio).

## Dados (profiling do dump real)

39 contratos: 36 `Em andamento`→Active, 2 `Finalizado`→Terminated, 1 `Pendente` (id 3:
valor 0 + código duplicado + único vínculo colaborador) → EXCLUÍDO por allowlist (decisão c).
`programId`/`budgetPlanId` 100% preenchidos → migrar os 2 programas (PARC, EPV) primeiro
via use case `create-program` e remapear. Após exclusão, todos os 38 são contractor=supplier
(remap via `partnersEtlPort.suppliers.findByLegacyId`).

## Escopo (M)

1. `scripts/etl/quarantine/reason.ts`: + tag `ExcludedByDecision { field, decisionRef }`.
2. `scripts/etl/legacy/rows.ts` + `decode.ts`: `LegacyContractRow`, `LegacyProgramRow`.
3. `scripts/etl/contracts/exclusions.ts`: allowlist explícita por legacy_id (decisão c).
4. `scripts/etl/contracts/mapper.ts`: normalização do número (`000000001/2025`→`0001/2025`,
   Pacote A), status map (`Em andamento`→create; `Finalizado`→create+terminate com
   endedAt=updatedAt), signedAt=contractPeriodStart (premissa documentada), Money/Period/
   ContractorRef via VOs, quarentena acumulada.
5. `scripts/etl/contracts/reader.ts` + `main.ts`: withLegacyMysql → read → programas
   (createProgram, idempotente por sigla) → contratos (idempotente por
   findBySequentialNumber) → reconcile `ctr_contract_seq` (GREATEST por ano, batch
   pré-autorizado pelo schema mysql.ts:180) → relatório + artefatos (de-para
   legacy_id→uuid p/ contratos E programas — necessário p/ o writer financeiro —,
   metadados extras: signedContractUrl/pix/bancário/budgetPlanId legado).
6. `--dry-run` obrigatório.

## Fora de escopo (registrado)

- `observations` via PATCH de metadados (follow-up; extras ficam no artefato).
- Blobs (D3), coluna legacy_id em ctr_contracts (correlação via sequential_number+artefato).

## Critério de aceite

- W0 RED por inexistência; W3 verde total.
- Lab: dry-run → carga real → 38 contratos (36 Active + 2 Terminated), 2 programas,
  ctr_contract_seq = {2025:2, 2026:38}, idempotência no re-run, balanço
  read=migrated+quarantined+alreadyExists com 1 ExcludedByDecision.
