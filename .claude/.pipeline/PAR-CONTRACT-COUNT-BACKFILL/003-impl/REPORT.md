# W1 — Implementação GREEN · PAR-CONTRACT-COUNT-BACKFILL (#110)

**Agentes:** espinha pura + composition root (main, skill `nodejs-process-runner`) · camada Drizzle/query (agente `drizzle-orm-expert`)
**Outcome:** GREEN — unit 3/3, typecheck/lint/format limpos.

## Arquivos

**Criados:**
- `src/jobs/partners/contract-count-backfill/backfill.ts` — lógica pura (`backfillContractCounts`; `setCount` absoluto por contraparte).
- `src/jobs/partners/contract-count-backfill/run.ts` — composition root: lê `contracts/public-api` → escreve `partners` store. Env `CONTRACTS_DATABASE_URL` + `PARTNERS_DATABASE_URL`, exit sysexits (78 config).
- `src/modules/contracts/application/ports/contract-count-read.ts` — port `ContractCountReadPort` (type puro).
- `src/modules/contracts/adapters/persistence/repos/contract-count-read.drizzle.ts` — `SELECT contractorId, COUNT(*) … WHERE status IN ('Pending','Active') GROUP BY contractorId` (aproveita `ctr_contracts_contractor_idx`).
- `src/modules/contracts/adapters/persistence/repos/contract-count-read.in-memory.ts` — `makeInMemoryContractCountRead(seed)`.

**Alterados:**
- `src/modules/partners/application/ports/contract-count-store.ts` — `setCount({contractorRef, activeCount})` (absoluto, idempotente; não registra eventId).
- `src/modules/partners/adapters/persistence/repos/contract-count-store.{in-memory,drizzle}.ts` — `setCount`. Drizzle: `INSERT … ON DUPLICATE KEY UPDATE activeCount = <literal absoluto>` (ADR-0020).
- `src/modules/contracts/public-api/{read,index}.ts` — `buildContractsContractCountReadPort({connectionString})` + exports.
- `package.json` — script `job:partners:contract-count-backfill`.

## Decisões de design

- **setCount absoluto, não applyDelta** — a recomputação é a fonte da verdade → idempotente (CA2) e reconcilia drift (#129). `applyDelta` somaria em re-execução.
- **Semântica CA1 espelha o worker** — `activeCount = #{status ∈ (Pending,Active)}` ⟺ `endedAt IS NULL`, pois `ContractCreated` é emitido para ambos (contract.ts:130/:209) e `ContractEnded`/`ContractCancelled` decrementam.
- **Isolamento (ADR-0006)** — contracts exposto só via public-api (read); write no partners via adapter no composition root (padrão do worker `contract-count-projection`).

## Verificação

- `node --test tests/jobs/partners/contract-count-backfill.test.ts` → pass 3 / fail 0.
- `pnpm run typecheck` → limpo. `pnpm run format:check` → limpo. `pnpm run lint` → limpo.
- **Pendente W3:** a query GROUP BY (read do contracts) é validada em `test:integration` (contra MySQL) — cobre CA1 end-to-end.
