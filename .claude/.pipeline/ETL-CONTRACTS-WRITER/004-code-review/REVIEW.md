# W2 — Review (ETL-CONTRACTS-WRITER)

## Round 1: REJECTED
Bloqueantes: (1) erro de port engolido no remap de suppliers (infra mascarada como dado);
(2) alreadyExists sem de-para + artefatos append-only misturando runs. Médias/baixas:
(3) sem integração full-cycle; (4) portError serializando objeto (risco PII no summary);
(5) ressalvas do dry-run não documentadas.

## Round 2: APPROVED
Todas verificadas corrigidas no código (supplierLookupFailed + PortError pré-mapper;
de-para regenerado com alreadyExisted + truncate por run; writer.integration.test.ts
full-cycle executado 2/2 na VM contra DB isolado; portCode extrai só tag; ressalvas no
header + saída do --dry-run). Follow-ups registrados: ordem allowlist×lookup-failed
(inócuo no dump real), tags dedicadas, gate ETL_INTEGRATION genérico, duplicata
intra-run, contractPeriodIsIndefinite, dependência de ordem entre os 2 its do writer.
