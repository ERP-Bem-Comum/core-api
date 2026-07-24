# FIN-DOC-SUBCATEGORY-STAMP — W1 (GREEN)

> S1 do épico #502 · `drizzle-schema-author` (schema/migration) + `ports-and-adapters` (VO/use case/borda) · 2026-07-21.
> Carimba `subcategoryRef` (folha do plano) no documento, espelhando os refs irmãos.

## Prova do GREEN

| | tests | pass | fail | skipped |
| :-- | --: | --: | --: | --: |
| Baseline (W0) | 4255 | 4227 | 9 | 19 |
| Depois (W1) | 4258 | **4239** | **0** | 19 |

9 fails → 0; `pass` 4227 → 4239 (+12 dos alvos). **Regressão zero (CA8):** 4239 − 12 = 4227.
Gates conferidos no fio principal: `typecheck` · `lint` · `format:check` verdes. Integração (#500) pulada.

## Arquivos por camada
- **VO:** `domain/shared/refs.ts` — `SubcategoryRef` branded + `{ rehydrate }`, sem `generate`/`resolve` (ref opaco, CA5/CA7).
- **Schema:** `schemas/mysql.ts` — `subcategory_ref varchar(36)` em `finDocuments` e `finPayableView` + índice único no payable_view.
- **Migration:** `0037_natural_hedge_knight.sql` — **puramente aditiva** (2 `ADD COLUMN` + 1 `CREATE INDEX`; zero DROP/recreate — conferido).
- **Domínio:** `document/types.ts` + `document.ts` — `subcategoryRef` em `DocumentCore`/`DraftDocument`, propagado em todos os pontos de `budgetPlanRef`/`categoryRef`.
- **Mapper:** `document.mapper.ts` — os **4** pontos (2 `toRow` + 2 `toDomain`).
- **Use cases:** `save-document.ts`, `save-draft.ts` — aceitam/rehydratam/repassam.
- **Borda:** `http/schemas.ts` (create body + response DTO), `plugin.ts` (2 ramos), `dto.ts` (2 ramos).

## Confirmações (armadilhas #3/#4 do W0)
- **`budgetPlanRef` persiste no caminho mysql (CA3):** confirmado — entrou ao lado do `subcategoryRef` em cada INSERT/UPDATE; os dois convivem. Fecha o 0/91 para documentos novos.
- **`fin_payable_view`:** coluna + índice satisfazem CA1. O `payable-view.mapper.ts` **não** foi tocado — copiar o valor para a view + carregar no evento `DocumentSaved` é da **S5** (leitura), fora de escopo. Mínimo feito, projeção intacta.

## Edições em teste (verificadas por mim, não enfraquecem asserção)
1. **Typo de UUID no fixture do W0:** `5ubca7e9-...` tinha um **`u` não-hexadecimal** → `z.uuid()`/`isUuidV4` rejeitavam → CA2/CA3 **insatisfazíveis por qualquer implementação** (devolviam 400). Corrigido para `5abca7e9-...` (UUID v4 válido). **Provado no fio principal:** o literal antigo dá `false` no regex de UUID v4, o novo dá `true`. As asserções de round-trip continuam idênticas.
2. **Lint `array-type`** no bloco de integração (`Array<{...}>` → `{...}[]`) — mecânico, introduzido no W0 (gate só era `pnpm test`), pego agora no `lint`.

## Notas para o W2
- ADR-0014: VO só `rehydrate`, sem FK, sem chamar budget-plans, sem validar pertencimento.
- Espelhamento: cada `subcategoryRef` fica ao lado do `categoryRef` — diff lado-a-lado.
- Back-compat (CA4/CA8): campo nasce `null`.
- YAGNI: projeção da view + evento deliberadamente fora (S5).
- **Atenção do revisor:** as 2 edições de teste acima (typo + lint).

## Próximo passo
W2 (REVIEW) — `code-reviewer`.
