# CTR-TAXONOMY-REFS — W2 (REVIEW, read-only)

> S3 do épico #502 (= #343) · `code-reviewer` · Round 1 · 2026-07-22 · branch `feat/ctr-subcategory-refs`.
> Escopo: Centro de Custo / Categoria / Subcategoria como **refs do plano** no contrato — string simples
> (espelha `programId`/`budgetPlanId`), não VO branded. Audit read-only sobre o diff não-commitado.

## Veredito: **APPROVED** ✅

Nenhum Blocker, nenhum Major. Implementação mínima, aditiva, espelha 1:1 o padrão program/budget nas 5 camadas. Regressão zero comprovada. 2 Minor informativos abaixo (não bloqueiam).

---

## Gates (rodados no fio principal desta review)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ verde, zero erros |
| Lint | `pnpm run lint` (`eslint .`) | ✅ verde, zero erros |
| Test | `pnpm test` | ✅ **4328 tests · 4309 pass · 0 fail · 19 skip** |

Baseline W0 = 4289 pass; W1 = 4309 pass (+20 alvo). Contagem idêntica ao REPORT do W1 → **regressão zero (CA8)** confirmada de forma independente. Integração (#500) registrada e **não executada** — conforme escopo, **não tratada como achado**.

---

## Foco 1 — As 3 edições de teste (armadilha: W1 mexeu em teste)

Verificado `git diff` das duas edições em testes existentes: **puramente aditivas (+4/+4, zero deleção)**.

- **(a) `contract-dto.test.ts:39`** — snapshot exato do list-item ganhou `costCenterRef/categoryRef/subcategoryRef: null` ao lado de `categorizacao/centroDeCusto/program`. O objeto DTO estruturalmente ganhou 3 campos; o `deepStrictEqual` exaustivo precisa refleti-los. **Nenhuma asserção removida ou enfraquecida.** É manutenção de snapshot, não afrouxamento. ✅
- **(b) `contract.mapper.test.ts:59`** — o fixture compartilhado `BASE_ROW` (`Omit<ContractRow, 'status'|'endedAt'>`, exaustivo) ganhou os 3 refs `null`. Como `ContractRow` ganhou 3 colunas, o fixture exaustivo precisa cobri-las senão o `tsc` reprova (`exactOptionalPropertyTypes`). Manutenção de fixture. ✅
- **(c) `type`→`interface`** — nos **novos** arquivos W0 (`contract-taxonomy-refs.http.test.ts:172 DetailRefs`, `contract-taxonomy-refs.mapper.test.ts:38 Refs`). Regra `@typescript-eslint/consistent-type-definitions`. Helper types locais para ler o shape da resposta — cosmético, sem impacto em asserção. ✅

Conclusão do Foco 1: **as 3 edições são manutenção legítima; nenhuma enfraquece o RED**.

## Foco 2 — Espelhamento completo (padrão program/budget)

Os 3 refs foram propagados em **todos** os pontos onde `programId`/`budgetPlanId` aparecem — conferido ponto a ponto:

| Ponto | Arquivo | Status |
| :-- | :-- | :-- |
| Domínio — registration + input | `domain/contract/types.ts` (`ContractRegistration`, `ContractRegistrationMetaInput`) | ✅ |
| Domínio — resolveMeta | `domain/contract/contract.ts` (`ResolvedMeta` + `resolveMeta … ?? null`) | ✅ |
| Mapper — 2 ramos toRow + toDomain | `contract.mapper.ts` (2× `contractToInsert` + `contractFromRow`) | ✅ |
| Use case create | `create-contract.ts` (command + `buildContract … ?? null`) | ✅ |
| Use case create-pending | `create-pending-contract.ts` (command + build) | ✅ |
| Use case update-metadata | `update-contract-metadata.ts` (`ContractMetadataPatch`) | ✅ |
| Borda — create shape | `http/schemas.ts` `contractWriteShape` (`z.uuid().nullable().optional()`) | ✅ |
| Borda — PATCH shape | `http/schemas.ts` `patchContractMetadataBodySchema.strict()` | ✅ |
| Borda — response shape | `http/schemas.ts` `registrationShape` (`z.string().nullable()`) | ✅ |
| Borda — DTO list-item | `contract-dto.ts` `contractToListItem` | ✅ |
| Borda — plugin POST (2 ramos) | `plugin.ts:389,420` | ✅ |

**Nenhum ponto faltante.** Espelhamento 1:1.

## Foco 3 — O PATCH ampliado (editar categorização de contrato existente)

- `patchContractMetadataBodySchema` (`.strict()`) ganhou as 3 chaves `z.uuid().nullable().optional()`. ✅
- `ContractMetadataPatch` (application) ganhou as 3 props. ✅
- **Propagação real confirmada:** o handler PATCH (`plugin.ts:288`) repassa `req.body as ContractMetadataPatch` inteiro ao use case; `updateContractMetadata` aplica via `updateContract(load.value, cmd.patch)`; o domínio `updateContract` faz `immutable({ ...prev, ...patch })` — **spread genérico**. Como os 3 refs estão em `ContractRegistration` → `EffectiveContractCore` e **não** em `ContractImmutableField`, entram em `ContractUpdate = Partial<Omit<EffectiveContractCore, ContractImmutableField>>` e o spread os propaga **sem código extra**. ✅
- Prova: `contract-taxonomy-refs.http.test.ts` — `PATCH /contracts/:id` com os 3 refs → **200 + eco** (não 400 por chave desconhecida). Editar a categorização de um contrato existente funciona. ✅

## Foco 4 — Migration 0017 (aditiva/INSTANT + COLLATE)

`0017_chilly_human_torch.sql`:
```
ALTER TABLE `ctr_contracts` ADD `cost_center_ref` varchar(36) COLLATE utf8mb4_bin;
ALTER TABLE `ctr_contracts` ADD `category_ref` varchar(36) COLLATE utf8mb4_bin;
ALTER TABLE `ctr_contracts` ADD `subcategory_ref` varchar(36) COLLATE utf8mb4_bin;
```
- **3× `ADD COLUMN`**, nullable (INSTANT no MySQL 8) — aditiva, **nenhum DROP/recreate**. ✅
- `COLLATE utf8mb4_bin` nas 3 — bate **literalmente** com a 0013 (`program_id`/`budget_plan_id`). ✅
- `_journal.json` consistente (idx 17, tag `0017_chilly_human_torch`, `version 5`). ✅

## Foco 5 — String simples, NÃO VO branded

Schema `varchar(36)`; domínio `string | null`; mapper "string pura, sem rehydrate"; use cases repassam cru. **Nenhum smart constructor, nenhum `Brand`, nenhuma cópia do VO do financial.** Coerente com `programId`/`budgetPlanId`. ✅

## Foco 6 — ADR-0014/CA7 (ref opaco) + CA4/CA8

- **Sem FK / índice / CHECK** nas 3 colunas (schema e migration conferidos). ✅
- **Sem importar budget-plans**, sem tocar `bgp_*`, sem validar pertencimento — os únicos matches de `bgp_*`/`financial` no diff são **comentários** explicativos. ✅
- **CA4/CA8:** opcionais, nascem `null` (`?? null` em resolveMeta/use cases/plugin), back-compat (`categorizacao`/`centroDeCusto` mantidos). Teste `CA4: create sem os refs → nascem null` verde. ✅

---

## Rastreabilidade dos 8 CAs

| CA | Evidência | Status |
| :-- | :-- | :-- |
| CA1 | 3 colunas nullable + migration aditiva 0017 | ✅ |
| CA2 | http `CA2+CA6` roundtrip (POST→GET eco); mapper roundtrip | ✅ |
| CA3 | http `CA3` — os 7 campos (3 refs + program/budget + 2 textos) coexistem | ✅ |
| CA4 | http `CA4` — sem refs → null | ✅ |
| CA5 | http `CA5` — `costCenterRef`/`subcategoryRef` malformado → 400 (2 testes) | ✅ |
| CA6 | DTO list + detalhe ecoam os 3 refs | ✅ |
| CA7 | opaco: sem FK/índice/CHECK/import/bgp_* | ✅ |
| CA8 | pass estável 4289→4309 (só +20 alvo); testes existentes intocados na lógica | ✅ |

---

## Achados

### Minor (não bloqueiam — informativos)

1. **[Minor/informativo] Integração não executada (#500).** `contract-taxonomy-refs.drizzle-mysql.test.ts` está registrado no suite `contracts` de `scripts/ci/test-integration.ts` mas não roda nesta janela (bloqueio #500). O bloco estrutural puro (`getTableColumns`) roda em `pnpm test` e passa; o round-trip real fica pendente do runner de integração. Coerente com o escopo declarado — **registrado, não é regressão**.
2. **[Minor/informativo] Histórico não migrado (por decisão).** `categorizacao`/`centroDeCusto` seguem texto livre nos contratos existentes; os refs nascem `null`. Fora de escopo por decisão da P.O. (mesma dos 91 documentos da S1) — **não é achado**.

### Major / Blocker
Nenhum.

---

## Próximo passo
W3 (QUALITY) — `ts-quality-checker`. Gates já verdes nesta review (typecheck + lint + test); W3 confirma com `format:check` incluso.
