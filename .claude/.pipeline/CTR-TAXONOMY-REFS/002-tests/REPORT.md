# CTR-TAXONOMY-REFS — W0 (RED)

> S3 do épico #502 (= #343) · `tdd-strategist` · 2026-07-22. `src/` intocado. Módulo contracts.
> Os 3 refs do plano (`costCenterRef`/`categoryRef`/`subcategoryRef`) — **string simples, NÃO VO branded**
> (espelha `programId`/`budgetPlanId`; a S1 do financial usou VO, aqui é string).

## Testes (4 novos + registro; nenhum existente editado — CA8)
| Arquivo | Natureza | CAs |
| :-- | :-- | :-- |
| `.../domain/contract/contract-taxonomy-refs.test.ts` | domínio unit (puro) | CA2,3,4 |
| `.../adapters/persistence/contract-taxonomy-refs.mapper.test.ts` | mapper round-trip (puro) | CA2,3,4 |
| `.../adapters/persistence/contract-taxonomy-refs.drizzle-mysql.test.ts` | estrutural (puro) + integração gateada | CA1,2,8 |
| `.../adapters/http/contract-taxonomy-refs.http.test.ts` | DTO + borda memory (puro) | CA2,3,4,5,6 |
Integração gateada `MYSQL_INTEGRATION=1` registrada no grupo `contracts`, **não executada** (#500).

## Prova do RED
| | tests | pass | fail | skipped |
| :-- | --: | --: | --: | --: |
| Antes | 4308 | **4289** | 0 | 19 |
| Depois | 4328 | **4289** | 20 | 19 |
`pass` estável (**regressão zero, CA8**). 20 fails = os 20 novos, motivo certo (reconferido no fio principal:
colunas/campos inexistentes; create malformado hoje 201→esperado 400; CA4 undefined vs null).

## Assinatura para o W1
- **Schema** (`contracts`): `cost_center_ref`/`category_ref`/`subcategory_ref` varchar(36) nullable, ao lado
  de program_id/budget_plan_id. **Sem FK/índice/CHECK** (opaco). Migration `0017_*` aditiva + `COLLATE utf8mb4_bin`.
- **Domínio** (`contract/types.ts`+`contract.ts`): 3× `string | null` em `ContractRegistration` + input; `resolveMeta` `?? null`. `ContractUpdate` já herda.
- **Mapper** (`contract.mapper.ts`): copiar nos **2 ramos** de `contractToInsert` + em `contractFromRow`. String pura, sem rehydrate.
- **Borda** (`http/schemas.ts`): create shape += 3× `z.uuid().nullable().optional()`; `patchContractMetadataBodySchema` (`.strict()`) += 3 chaves; response shape += 3× `z.string().nullable()`. `plugin.ts` POST (2 ramos) + PATCH + `updateContractMetadata`; `contract-dto.ts` list item.

## Armadilhas (do W0)
1. **String simples, NÃO VO branded** (copie program_id/budget_plan_id).
2. **3 refs novos convivem** com os 2 textos livres (categorizacao/centroDeCusto ficam) + program_id/budget_plan_id — CA3 testa os 7 juntos.
3. **Create E update** — este ticket amplia o PATCH (o CTR-NUMBER-PROGRAM era create-only).
4. **PATCH-malformado→400 não testado** (o `.strict()` já dá 400 por chave desconhecida — seria falso-verde). Formato coberto pelo create malformado.
5. DTO tem 3 saídas (list/detalhe/escrita).
6. Ref opaco (CA7): sem FK/índice/CHECK, sem budget-plans, sem tocar bgp_*.
7. Migration só ADD COLUMN (aditiva/INSTANT).
8. Regressão zero: não editar os testes existentes de contrato.

## Próximo passo
W1 (GREEN) — `drizzle-schema-author` + `ports-and-adapters`.
