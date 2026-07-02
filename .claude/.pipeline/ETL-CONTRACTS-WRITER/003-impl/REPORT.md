# W1 — implementação (ETL-CONTRACTS-WRITER)

Arquivos novos: scripts/etl/contracts/{mapper,reader,main,exclusions}.ts,
tests/etl/contracts/{mapper.test.ts,reader.integration.test.ts}.
Estendidos: quarantine/reason.ts (+ExcludedByDecision), legacy/{rows,decode}.ts
(+LegacyContractRow/LegacyProgramRow), legacy/reader.ts (decodeAll exportado),
fixtures/legacy-mini.sql (+programs/contracts), scripts/ci/test-integration.ts
(suite etl: +arquivo novo, concurrency1=true — dois readers compartilham o
container efêmero; paralelo colidia, detectado empiricamente na VM).

Fluxo do main: programas via createProgram (idempotente por sigla) → remap de
suppliers via partnersEtlPort.findByLegacyId → contratos via Contract.create
(+terminate p/ Finalizado) + repo.save (idempotente por findBySequentialNumber)
→ reconcile ctr_contract_seq (GREATEST por ano, drizzle ODKU — batch previsto
no schema) → de-para JSONL + quarentena dupla.

Resultados: mapper 16/16; suíte ETL unit 90/90; integração gated na VM 2/2
(serializada); typecheck PASS; lint PASS.
