# W0 RED — CTR-IMPORT-LEGACY (passada 1: use case `importContracts`)

> **Skill:** `tdd-strategist` · **Outcome:** RED · **Data:** 2026-05-25

## Escopo desta passada

v1 **núcleo** — use case `importContracts` (agnóstico de formato, consome `ImportContractRow[]`).
O parser CSV/JSON + CLI `importar-contratos` é sub-ticket seguinte (`CTR-IMPORT-LEGACY-CLI`),
pelo risco próprio do parser CSV (sem parser nativo no Node → possível decisão de dependência,
ADR-0011). Mantém W2 ≤ 3 rounds.

## Arquivo criado

- `tests/modules/contracts/application/use-cases/import-contracts.test.ts`

Cobre: H1 (happy persistente), H2 (dry-run não persiste), H3 (linha inválida isolada — D3),
H4 (duplicidade intra-arquivo + vs repo), H5 (CNPJ validado e descartado — D2), e falha de
infra (repo) → erro top-level que aborta o lote.

**Contrato público que o W1 deve implementar:**

```ts
export type ImportContractRow = Readonly<{
  numero: string; titulo: string; objetivo: string; assinadoEm: string;
  valorCentavos: string; inicio: string; fim: string | null; cnpj?: string;
}>;
export type ImportContractsCommand = Readonly<{ rows: readonly ImportContractRow[]; dryRun: boolean }>;
export type ImportContractsReport = Readonly<{
  total: number; succeeded: number; failed: number; dryRun: boolean;
  failures: readonly { index: number; numero: string; error: ImportRowError }[];
}>;
// importContracts(deps:{contractRepo,clock}) => (cmd) => Promise<Result<ImportContractsReport, ContractRepositoryError>>
```

Semântica: **falha de DADO** → entrada em `failures` (lote continua, D3); **falha de INFRA**
(repo `err`) → `Result.err` top-level (aborta). Dry-run faz validação + dup-check (read-only),
sem `save` nem evento.

## Saída literal do gate (`node --test`)

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../use-cases/import-contracts.ts'
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

RED por inexistência do módulo `import-contracts.ts`.

## Próximo passo (W1)

Skills `ports-and-adapters` (use case). Decisões a cravar no W1:
- **Validador de CNPJ**: função pura em `src/shared/kernel/` (formato + dígitos verificadores),
  compartilhável; não persiste (D2).
- **Reuso de `createContract`**: extrair `buildContract(cmd): Result<{contract,event}, E>` (validação
  pura, sem IO) de `create-contract.ts` para garantir **determinismo dry-run = persistente** (NFR-4)
  sem duplicar validação. Avaliar no W1.
