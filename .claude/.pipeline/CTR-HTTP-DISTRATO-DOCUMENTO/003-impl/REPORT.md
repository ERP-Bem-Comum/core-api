# 003 — W1 (GREEN) — CTR-HTTP-DISTRATO-DOCUMENTO

## Decisão (opção c, fundamentada — ver 006-traceability)

Persistir o motivo do distrato **no agregado** (coluna + detalhe, consulta O(1)) **e no evento**
`ContractEnded` (timeline/auditoria). Convergência de duas consultas: MCP ACDG (Vernon, IDDD cap.8
— o evento carrega o "porquê") + agente `mysql-database-expert` (a coluna é a fonte de verdade).

## Implementação — 3 fatias, 11 arquivos de produção

- **Domínio**: `TerminatedContract` += `terminationReason: string | null`; `Contract.terminate(at, reason?)`
  normaliza (trim, vazio→null); `expire` emite `null`; evento `ContractEnded` += `terminationReason`.
- **Application**: `endContract` propaga `cmd.reason`.
- **Persistência**: `ctr_contracts.termination_reason varchar(1000)` + CHECK lenient
  (`reason IS NULL OR status='Terminated'` — retrocompat de Terminated legado) + migration `0009`
  (CHARSET/COLLATE explícito); `contract.mapper` (to/from row); `outbox.mapper` (serial/deserial +
  retrocompat v1→null).
- **HTTP**: `contract-dto` + `schemas` expõem `terminationReason` no detalhe Terminated.
- **CLI**: formatter exibe "Motivo do distrato".

## Retrocompat (riscos críticos do mapa de impacto)

- Terminated legado sem motivo → `null` (CHECK lenient, não bicondicional).
- Evento `ContractEnded` v1 sem o campo no payload → desserializa como `null`.

## Gate

typecheck ✅ · lint ✅ · format ✅ · `pnpm test` 2657 pass/0 fail · `test:integration` 88 pass.
