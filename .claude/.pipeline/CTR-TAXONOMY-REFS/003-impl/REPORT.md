# CTR-TAXONOMY-REFS — W1 (GREEN)

> S3 do épico #502 (= #343) · `drizzle-schema-author` + `ports-and-adapters` · 2026-07-22.
> Centro/Categoria/Subcategoria como **refs do plano** no contrato — string simples (espelha program/budget), não VO branded.

## Arquivos por camada
- **Schema:** `ctr_contracts` + `cost_center_ref`/`category_ref`/`subcategory_ref` (varchar 36 nullable, sem FK/índice/CHECK).
- **Migration `0017_chilly_human_torch.sql`:** 3 `ADD COLUMN` com `COLLATE utf8mb4_bin` (regra §CHARSET; espelha a 0013 de program/budget). **Puramente aditiva** — conferido.
- **Domínio:** `contract/types.ts` (3× `string|null` em `ContractRegistration` + input) + `contract.ts` (`resolveMeta` `?? null`; `create`/`createPending` espalham).
- **Mapper:** `contract.mapper.ts` — 2 ramos `contractToInsert` + `contractFromRow`. String pura.
- **Application:** create / create-pending / update-metadata (`ContractMetadataPatch` += 3).
- **Borda:** `schemas.ts` (response shape + create shape + `patchContractMetadataBodySchema` .strict()), `contract-dto.ts` (list item), `plugin.ts` (POST 2 ramos; PATCH flui pelo tipo).

## Prova do GREEN
- Alvo: 20/20. `pnpm test`: **4328 tests · 4309 pass · 0 fail · 19 skip** (baseline W0 4289 pass + 20 alvo). Regressão zero.
- `typecheck` · `lint` · `format:check` verdes (conferidos no fio principal).
- Integração (#500) não executada; bloco estrutural (getTableColumns) roda e passa.

## Edições de teste (verificadas por mim — não enfraquecem)
Só inserções (+4/+4, zero deleção): os 3 refs `null` nos 2 snapshots exaustivos (list-item DTO + `BASE_ROW` do mapper) — mesma manutenção que o trabalho de program/budget fez. Mais 1 lint (`type`→`interface`) no teste W0. Conteúdo conferido: só `costCenterRef/categoryRef/subcategoryRef: null`.

## Notas para o W2
- Ref opaco (CA7): sem FK/índice/CHECK, sem budget-plans/bgp_*, sem resolver nome.
- String simples, não VO branded (cópia 1:1 de program/budget nas 5 camadas).
- Convivem com program/budget + os 2 textos livres (categorizacao/centroDeCusto ficam).
- **PATCH ampliado** vs o trabalho create-only anterior: 3 chaves no `.strict()` + `ContractMetadataPatch`.
- Migration COLLATE editada à mão (esperado) — conferir utf8mb4_bin nas 3.

## Próximo passo
W2 (REVIEW) — `code-reviewer`.
