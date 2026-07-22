# FIN-REALIZED-SUBCATEGORY-GRAIN — W1 (GREEN)

> S5 do épico #502 · `ports-and-adapters` (par `drizzle-orm-expert`) · 2026-07-21.

## Arquivos
- `src/modules/financial/public-api/realized-provisioned-projection.ts` — o reader estendido.
- `tests/.../realized-provisioned-subcategory.drizzle-mysql.test.ts` — edição declarada (CAT_B morto removido).

## Shape (CA1)
`RealizedProvisionedRow` ganhou `subcategoryRef: string | null`.

## Parte A — grão subcategoria
As 2 queries de documento ganharam `finDocuments.subcategoryRef` no select + groupBy; chave de costura
`(plano, categoria, subcategoria, mês)` com sentinela `NULL_SUBCATEGORY`.

## Parte B — a query do manual (só no realizado)
`fin_manual_entries → fin_reconciliations(status='Active')`, `WHERE isNotNull(budget_plan_ref) AND
notInArray(type, ['Transfer','Investment','Redemption'])`, group by `(budget_plan_ref, subcategory_ref,
date_format(reconciled_at,'%Y-%m'))`, `SUM(value_cents)`. Costurada no realizado com `categoryRef=null`.
Cobre CA2 (orçamentário com plano entra), CA3 (tesouraria sai por tipo), CA4 (sem plano sai), CA5 (nunca
no provisionado), CA6 (Undone sai pelo JOIN Active). Usa `finManualEntries.type` (não o da reconciliação).

## Não-duplicação
3 fontes disjuntas (manual sem payable), cada uma agregada no seu grão antes da costura em memória — sem
FROM único. Na nota 10: doc R$50 (CAT_A) + manual R$5 (categoria null), mesma subcategoria → soma R$55.

## Edições/decisões (atenção do W2)
- **CAT_B removido do teste** — constante morta (0 usos; conferido no fio principal). Nenhuma asserção/seed alterado.
- **`bucketFor` → param objeto** (`Grain`) — o 5º param posicional estourava o lint `max-params` (4). Zero mudança de comportamento.

## Prova (fio principal)
`typecheck` 0 erros · `pnpm test` 4280/4261 pass/0 fail · `lint` limpo · `format:check` limpo.

## Ressalva (#500)
O comportamento das 3 fontes (grão, regra de inclusão, nota 10 = R$55) é **integração gated, não executada**
(#500). O rigor da query aqui é por inspeção, não por execução — registrar no W3 como não-verificado.

## Próximo passo
W2 (REVIEW) — `code-reviewer`.
