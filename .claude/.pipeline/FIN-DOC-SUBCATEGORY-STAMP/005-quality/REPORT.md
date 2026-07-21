# FIN-DOC-SUBCATEGORY-STAMP — W3 (QUALITY)

> S1 do épico #502 · `ts-quality-checker` · 2026-07-21. Gates locais verdes; integração MySQL não-executada (#500).

## Gates (rodados no fio principal)

| Gate | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` | ✅ limpo |
| `pnpm test` | ✅ **4258 tests · 4239 pass · 0 fail · 19 skipped** |

Baseline: 4246 / 4227. Δ = +12 tests / +12 pass / 0 fail. **Regressão zero.**

## Integração MySQL — NÃO executada (#500)
O bloco de integração de `subcategory-ref-stamp.drizzle-mysql.test.ts` (CA1/CA8 via `information_schema`)
exige MySQL na 3306 (ocupada) e o runner é destrutivo (#500). Registrado no grupo `financial`,
**não-executado** — jamais marcado verde. A prova de persistência real fica para a leva conjunta.

## Herança para a S5 (Minor do W2, não-bloqueante)
`fin_payable_view.subcategory_ref` existe (coluna+índice) mas nasce **nulo** — o `payable-view.mapper.ts`
não copia o valor. Deliberado (leitura por subcategoria = S5). A S5 fia **3 pontos**: `.values`,
`onDuplicateKeyUpdate.set` e `rowToPayableView`+tipo `PayableView`.

## Estado
S1 pronta e verde nos gates locais. Bloqueio de integração é externo (#500). Fundação entregável — o VO
`SubcategoryRef` e a coluna que S2/S4/S5 reusam existem.
