# FIN-REALIZED-SUBCATEGORY-GRAIN — W0 (RED)

> S5 do épico #502 · `tdd-strategist` · 2026-07-21. `src/` intocado. 1 arquivo de teste novo + registro no runner.

## Natureza do RED (importante)
O RED é **via `typecheck`** — o campo `subcategoryRef` não existe em `RealizedProvisionedRow`. Os testes de
**comportamento** (grão, regra de inclusão do manual, a nota 10) são **integração** (semeiam
`fin_manual_entries`+`fin_reconciliations`+`fin_documents`+`fin_payables`) e ficam **gated** por
`MYSQL_INTEGRATION=1` — **não executados** (#500). Não há adapter memory para este reader (é público, Drizzle-only).
Consequência honesta: a **prova comportamental** (nota 10 = R$55, exclusões) só roda quando a #500 fechar.

## Arquivo
`tests/modules/financial/public-api/realized-provisioned-subcategory.drizzle-mysql.test.ts` (novo) +1 path no
grupo `financial` de `scripts/ci/test-integration.ts` (não executado). O arquivo da fatia 2 **intocado**.

## Prova do RED
- `pnpm test`: 4278 → **4280** tests, pass 4259 → **4261** (+2 surface guards), **fail 0** — `pass` não cai
  (o bloco de integração é pulado sem a env).
- `pnpm run typecheck`: **4 erros, TODOS no arquivo novo** (`subcategoryRef` inexistente) — RED isolado, zero colateral. Reconferido no fio principal.

## Testes (gated) por CA
grão desce (CA1, doc) · provisionado desce (CA1) · doc com subcategoria nula aparece (CA7) · manual
Payment/Receipt/FeePenaltyInterest com plano soma (CA2) · manual Transfer/Investment/Redemption **não** (CA3) ·
manual sem plano **não** (CA4) · manual nunca no provisionado (CA5) · Undone não conta (CA6) ·
**âncora nota 10:** doc R$50 + manual R$5 juros mesmo plano/sub → **R$55**.

## Assinatura para o W1
- `RealizedProvisionedRow` ganha `subcategoryRef: string | null`.
- As **2 queries de documento**: `finDocuments.subcategoryRef` no select + groupBy; chave de costura vira
  `(budgetPlanRef, categoryRef, subcategoryRef, mês)` com sentinela para sub nula.
- **3ª query (manual):** `fin_manual_entries → fin_reconciliations(Active)`, `WHERE budget_plan_ref IS NOT NULL
  AND type NOT IN ('Transfer','Investment','Redemption')`, group by `(budget_plan_ref, subcategory_ref,
  date_format(reconciled_at,'%Y-%m'))`, `SUM(value_cents)` → costura **no realizado** com `categoryRef = null`.

## Armadilhas (W1/W2)
1. **Não duplicar:** as 3 fontes são disjuntas (manual não tem payable). Não juntar num FROM único.
2. **Manual entra com `categoryRef=null`** — linha própria; não forçar herança da categoria do documento. Na
   nota 10 o reader devolve 2 linhas (doc R$50 em CAT, manual R$5 em null), mesma subcategoria → soma R$55.
3. **Três eixos de data:** doc-realizado por `reconciled_at`, provisionado por `due_date`, manual por
   `reconciled_at`. `year` filtra cada fonte no seu eixo.
4. **Dois `type` distintos:** `fin_reconciliations.type='ManualEntry'` vs `fin_manual_entries.type` (a regra é sobre o segundo).
5. Limpeza FK-safe nos testes: items/manual_entries antes de reconciliations.

## Próximo passo
W1 (GREEN) — `ports-and-adapters` (par `drizzle-orm-expert`).
