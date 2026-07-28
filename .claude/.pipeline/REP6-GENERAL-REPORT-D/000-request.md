# REP6-GENERAL-REPORT-D — Relatório Geral (REP-6 · #442 · Slice D): Número do Contrato

## Escopo

Última fatia do Relatório Geral (`GET /reports/generalReport`). ADITIVO: adiciona a coluna
**Número do Contrato** (`contractNumber: string | null`) à linha plana — 20 → 21 colunas.

O número é `ctr_contracts.sequential_number`, resolvido a partir do `contractRef` (UUID do contrato,
já presente desde o Slice A) via um **novo read port cross-módulo** em `contracts/public-api`
(ADR-0006/0014 — nunca JOIN `ctr_*` × `fin_*`).

## Contrato

- **Novo port `ContractNumberReadPort`** (batch): `resolveContractNumbers(ids) → Result<Map<id, number>>`.
  `ids` vazio → `ok(Map vazio)` sem tocar o banco. Dedup antes do `IN`. Ids ausentes não entram no Map.
- **Store drizzle**: `SELECT id, sequential_number FROM ctr_contracts WHERE id IN (...)`; try/catch →
  `err('contract-number-read-unavailable')` na borda.
- **Store in-memory**: filtra um seed (Map/registro) pelos ids.
- **`buildContractsContractNumberReadPort`** no molde dos outros 3 read ports boot-scoped.
- **Stitch** (`GeneralReportReadFromFinancial`): 3º dep `resolveContractNumbers`; 1 chamada por página
  (refs distintos não-nulos); degradação graciosa (err → todos `contractNumber` null); só propaga erro
  se o `list` do financial falhar.

## Restrições

ADR-0006/0014 (número só via public-api), sem migration (`sequential_number` já existe), Result na
borda, EN no código / PT-BR nos comentários. Backward-compat: as 20 colunas A+B+C permanecem.
