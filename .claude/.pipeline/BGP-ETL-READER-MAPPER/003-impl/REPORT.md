# W1 — GREEN · BGP-ETL-READER-MAPPER (fatia 3/3 do ETL de Orçamento)

> Skill: `nodejs-fs-scripter` (par `mysql2-driver-expert` no reader). Objetivo: levar os 2 RED do W0
> ao verde — `reader.ts` + `mapper.ts` (puro) + `main.ts`, mais a extensão da fatia 2 com `updatedBy`
> (decisão P.O. Opção A). Verificado pelo orquestrador: `pnpm test` pass 4191/0 fail; typecheck,
> lint, format verdes; ADR-0006 intacto.

## Arquivos tocados

### Novos — fatia 3 (`scripts/etl/budget-plans/`)
| Arquivo | Papel |
| :-- | :-- |
| `mapper.ts` | 6 funções PURAS `Result<Mapped*, readonly QuarantineReason[]>` + `Legacy*Row` + refs. |
| `reader.ts` | Lê o legado via `connectReadonly`; pré-junta siglas/UF; carrega `budgets.valueInCents` só p/ reconciliação (CA5). |
| `main.ts` | Wiring reader → refs core → mapper → `buildBudgetPlansEtlPort` → reconcile + quarentena. UUID/de-para/2ª passada do `parentId` aqui (mapper puro). |

### Extensão da fatia 2 — `updatedBy` (decisão P.O. Opção A)
| Arquivo | Mudança |
| :-- | :-- |
| `application/ports/legacy-entity-store.ts` | `+ updatedBy: string \| null` no `BudgetPlanEtlInput` (nullable). |
| `repos/budget-plans-etl-store.drizzle.ts:181` | `plans.provision` grava `updatedBy: input.updatedBy` (coluna já existe — sem migration). |
| `tests/.../budget-plans-etl-port.integration.test.ts` | `aPlan()` ganhou `updatedBy: null`. |

### Aditivo — `scripts/etl/quarantine/reason.ts`
2 tags novas (aditivo, precedente `ExcludedByDecision`): `PrecisionUnsupported` (version >1 decimal) e
`CrossFieldMismatch` (UF divergente) + ramos em `describeReason` (switch exaustivo). `attempted`
PII-free. `reconcile.ts` **reusado**.

## Como cada regra foi implementada (mapa → código)
- **version float→major/minor** via repr. string (`String(1.1)==='1.1'`); >1 decimal → `PrecisionUnsupported` field `version`, sem arredondar (CA6).
- **programId→programRef via sigla**; órfã → `RequiredFieldMissing` field `program_ref` (CA7).
- **updatedById→updatedBy** via `auth.legacy_id` (Map); miss/null → `null` (não quarentena).
- **Rede**: município → `('municipality', cod)`; senão `('state', abbreviation)`; `m.uf ≠ s.abbreviation` → `CrossFieldMismatch` field `partner_uf` (CA6).
- **model DERIVADO** da releaseType (Map); sem launchType → `RequiredFieldMissing` field `model` (CA4).
- **INSTITUCIONAL** → `EnumUnknown` field `sub_category_type` (CA8).
- **status/direction/launchType diretos**; descartes (`data`, `totalInCents`, `mpath`, `costCenterCategoryId`, `valueInCents`) não entram no `input` (prova: `Object.keys(input)` == `['model','month','valueCents']`, CA7/CA9).

## `updatedBy` (Opção A — precedente Gabriel D11)
Input nullable + store grava `updated_by` (coluna existente, sem migration) + mapper resolve via de-para
`auth_user (id, legacy_id)` lido pelo `main`. Fatia 2 `closed-green` mas não-mergeada (PR #485) → estender aqui é natural.

## Prova do GREEN (verificada pelo orquestrador)
| Métrica | W0 (RED) | W1 |
| :-- | :-- | :-- |
| tests | 4192 | 4210 |
| pass | 4174 | 4191 |
| fail | 2 | 0 |
| skipped | 19 | 19 |
+17 testes do mapper; `writer.integration` gated (carrega e pula). typecheck/lint/format verdes.
ADR-0006 reverificado: `scripts/etl/budget-plans` importa só `budget-plans/public-api`.

## Notas para o W2 (audit read-only)
1. **SQL do reader é suposição documentada** — nomes de coluna/JOIN das tabelas legadas seguem o mapa;
   NÃO validável em `pnpm test` (integração gated, `legacy-mini.sql` não tem tabelas de budget-plans).
   W3 confere contra o banco de referência. Atenção: `municipalityUf` via `partner_municipalities → partner_states`.
2. **`legacy-mini.sql` precisa das tabelas de budget-plans** p/ o `writer.integration` rodar de fato
   (CA1 5/5/4679/36/38/390). Preparação de W3, não bug de W1.
3. **`byModel` tem 3 chaves** (IPCA/PESSOAIS/LOGÍSTICAS; CAED medido 0) — consistente com o dado.
4. **`valueDiffCents`** = Σ|soma por Rede − `budgets.valueInCents` legado|; o campo é lido só p/ reconciliação, não migra.
5. **2 tags novas de quarentena** — aditivas, com ramo em `describeReason`.

## Próximo passo
W2 — REVIEW (`code-reviewer`, read-only). Foco: ADR-0006, mapper puro, a extensão da fatia 2, o SQL do reader (nota 1).
