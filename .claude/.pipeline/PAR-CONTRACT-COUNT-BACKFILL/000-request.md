# PAR-CONTRACT-COUNT-BACKFILL — escopo

> Issue **#110**. Módulos **partners** (escrita no read-model) + **contracts** (novo read no public-api, ADR-0006). Size **M** (2 módulos + job novo — corrigido de S após recon; bate com o comentário da issue "M / código novo (2 módulos)"). Prioridade **P3** (display; não bloqueia front).
> `par_contract_count_view` existe (ticket `PAR-AGG-CONTRACT-COUNT` fechado). Molde estrutural: backfill de `fin_supplier_view` (#47/US2) em `src/jobs/financial/supplier-view-backfill/`.

## Problema
`par_contract_count_view` só é alimentado por eventos `ContractCreated`/`ContractEnded`/`ContractCancelled` **após** a feature entrar (worker `contract-count-projection`). Contratos **pré-existentes** não foram backfillados → `GET /api/v1/partners` retorna `contractCount: 0` para todos.

## Semântica travada no recon (fonte da verdade p/ CA1 — NÃO divergir)
`applyContractCountEvent` define: `ContractCreated → +1`, `ContractEnded`/`ContractCancelled → −1`, resto no-op. Logo:

```
activeCount(contractorRef) = #{ContractCreated} − #{ContractEnded + ContractCancelled}
```

O backfill recomputa esse **valor absoluto** por contraparte a partir do estado atual dos contratos em `contracts`. O read novo no `contracts/public-api` DEVE espelhar exatamente essa regra (contratos não-encerrados/não-cancelados por `contractorRef`), senão o backfill diverge do worker incremental.

## Escopo (in)
1. **`partners`** — novo método **`setCount`** (valor **absoluto**, idempotente) no port `ContractCountStore` + adapters `.drizzle.ts` e `.in-memory.ts`. NÃO reusar `applyDelta` (delta não é idempotente sob re-execução → violaria CA2). Drizzle: `INSERT … ON DUPLICATE KEY UPDATE activeCount = <valor absoluto>` (permitido ADR-0020). Não mexe em `par_contract_count_processed` (backfill não é evento).
2. **`contracts`** — novo read no `public-api` (espelha `buildContractsReadPort`/`listSuppliersForProjection`): retorna contagem de contratos vivos agrupada por `contractorRef`. Read-only, sem `applyMigrations`.
3. **Job one-shot** `src/jobs/partners/contract-count-backfill/` (`backfill.ts` lógica pura testável + `run.ts` composition root): lê contagens via `contracts/public-api` → aplica `setCount` por contraparte via `partners`. Env: `PARTNERS_DATABASE_URL` + `CONTRACTS_DATABASE_URL`. Exit code sysexits.

## Fora de escopo
- Reconciliador contínuo/cron (#129 — separado). Este é one-shot manual.
- Recency-guard/occurredAt (o molde fin_supplier usa; aqui é `setCount` absoluto, não precisa).

## Critérios de aceite
- **CA1** após backfill, `GET /api/v1/partners` (+ grids supplier/financier/act/collaborator) retorna `contractCount` coerente com os contratos vivos atuais de cada contraparte.
- **CA2** **idempotente** — rodar 2× produz o mesmo `activeCount` (setCount absoluto, não soma).

## Pipeline (agentes por wave) — declarado antes de cada wave
| Wave | Atividade | Especialista/Skill |
| :-- | :-- | :-- |
| W0 | RED — `backfill.ts` puro (recompõe absoluto) + idempotência CA2 + read do public-api | skill **`tdd-strategist`** |
| W1 | `setCount` (port+2 adapters), read `contracts/public-api`, job | agente **`drizzle-orm-expert`** (query/tx `setCount` + read) + skill **`nodejs-process-runner`** (composition root do job) |
| W2 | audit read-only (idempotência, isolamento cross-módulo via public-api, query) | skill **`code-reviewer`** |
| W3 | gate `typecheck`+`format:check`+`lint`+`test` + `test:integration:partners` | skill **`ts-quality-checker`** |

## Research (fundamento canônico)
- **`acdg-skills`** (MCP): backfill idempotente / recomputação absoluta de read-model (ADR-0022 projeção evento-carregada; ADR-0045 read-model de fornecedor como precedente).
- Molde estrutural já lido: `src/jobs/financial/supplier-view-backfill/{backfill,run}.ts`.

## DoD
Gate W3 verde. `contractCount` correto pós-backfill, idempotente (CA1+CA2). Comentar #110 com evidência. Destrava #240/#242 (fornecedor↔contrato) e habilita #129.
