# W0 — RED · BGP-ETL-READER-MAPPER (fatia 3/3 do ETL de Orçamento)

> Skill: `tdd-strategist`. Objetivo: suíte vermelha que descreve o contrato do `mapper.ts` PURO
> (+ reconcile/idempotência gated), sem tocar `src/` nem escrever reader/mapper/main. RED por
> inexistência dos módulos. Verificado pelo orquestrador: `pnpm test` fail 2 (ERR_MODULE_NOT_FOUND
> de `scripts/etl/budget-plans/mapper.ts`), pass 4174, zero regressão.

## Arquivos criados

| Arquivo | Papel | Camada |
| :-- | :-- | :-- |
| `tests/etl/budget-plans/mapper.test.ts` | RED núcleo — funções puras do mapper, 1 `it` por regra | unit (`pnpm test`) |
| `tests/etl/budget-plans/writer.integration.test.ts` | RED gated — full-cycle contra o banco de referência (CA1–CA5) | integration (opt-in) |
| `scripts/ci/test-integration.ts` | registrado o grupo `etl:budget-plans` | runner CI |

## Contrato do mapper que o W0 fixa (o W1 implementa)

6 funções PURAS, cada uma `Result<Mapped*, readonly QuarantineReason[]>`, refs injetadas como `Map`:
`mapBudgetPlanRow(row, refs)`, `mapBudgetRow`, `mapCostCenterRow`, `mapCategoryRow`,
`mapSubcategoryRow`, `mapBudgetResultRow(row, refs)`. Cada `Mapped*` carrega `legacyId` + os
`*LegacyId` de FK + um `input` que espelha o `*EtlInput` da fatia 2 menos os UUIDs (o `main.ts`
resolve UUID + de-para + 2ª passada do parentId).

## Regras testadas (mapa ETL-BUDGET-PLANS → asserção) — 17 regras

Cobrem: `version` float→major/minor (+quarentena >1 decimal, CA6); `programRef` via sigla
(+quarentena sigla órfã, CA7); `updatedBy` via auth.legacy_id (miss=null); Rede state/município
(+quarentena uf divergente, CA6); `direction`/`launchType`/`status` diretos; `model` derivado da
releaseType (CA4); `INSTITUCIONAL`→quarentena (CA8); descartes (`data`, `totalInCents`, `mpath`,
`costCenterCategoryId`, `valueInCents`) não atravessam. Contagens (CA1) e soma por Rede (CA5) na
integration gated (reusa `isBalanced` de `reconcile.ts`).

## ⚠️ Decisão tomada (P.O., 2026-07-17): `updatedBy` — OPÇÃO A

O schema `bgp_budget_plans` tem `updated_by varchar(36)` nullable (BGP-UPDATED-BY-AUDIT/#373, "fase B"),
mas o `BudgetPlanEtlInput` da fatia 2 **não** o expõe. O legado tem o dado (2 usuários: Eduardo id=1,
Bruno id=4). Precedente do Gabriel (ETL-FINANCIAL-WRITER, D11): **migra o autor**, não deixa null
(join determinístico → userRef via provisionamento idempotente).

**Decisão: Opção A — estender a fatia 2 com `updatedBy`.** O W1 desta fatia:
1. adiciona `updatedBy: string | null` ao `BudgetPlanEtlInput` (`public-api/etl.ts` / port).
2. o store Drizzle da fatia 2 grava `updated_by`.
3. o mapper resolve `updatedById → updatedBy` via `auth.legacy_id` (de-para), miss = null (nullable,
   não quarentena — nem todo plano legado tem autor rastreável).

A fatia 2 está `closed-green` mas ainda **não mergeada** (PR #485 aberto) — estender aqui é natural, não
"reabrir produção". Não vira issue de follow-up: a autoria entra agora.

## Notas para o W1 (skill `nodejs-fs-scripter` + par `mysql2-driver-expert`)

1. **`updatedBy` (acima)** — endereçar ANTES de tocar o mapper de plano.
2. **Quarentenas novas × reuso** de `quarantine/reason.ts`: reusa `RequiredFieldMissing` (`program_ref`)
   e `EnumUnknown` (`sub_category_type`); para `version >1 decimal` e `uf divergente` os testes
   asseveram só o `.field` (`version`/`partner_uf`) — W1 escolhe reusar tag ou estender a union
   (aditivo; precedente `ExcludedByDecision`). `attempted` PII-free.
3. **Reader** (par `mysql2-driver-expert`): pré-junta no legado (`programId→sigla`, `stateId→uf`,
   `municipalityId→cod+uf`) para o mapper ficar puro. Row types são donas do mapper; não editar
   `scripts/etl/legacy/rows.ts`.
4. **`main.ts`**: ordem FK-segura (plano→cost center→categoria→subcategoria→budget→lançamento),
   `parentId` na 2ª passada. Reusa `reconcile.ts` + `quarantine/reason.ts`; de-para/quarentena em `.tmp/`.
5. **`connectReadonly`** (`ETL_LEGACY_CONNECTION_STRING`, sem Docker); env ausente → erro kebab EN
   `etl-legacy-connection-string-missing` (CA8).

## Próximo passo
W1 — GREEN: `scripts/etl/budget-plans/{reader,mapper,main}.ts` + extensão `updatedBy` na fatia 2.
