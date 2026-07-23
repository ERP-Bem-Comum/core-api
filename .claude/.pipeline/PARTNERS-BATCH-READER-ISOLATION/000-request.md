# PARTNERS-BATCH-READER-ISOLATION — escopo

> Size **S** (trivial, test-only). Issue **#521**. Módulo `partners`. Exposto pelo CI de integração do
> #523 (job `partners` vermelho). Solução pesquisada por `tdd-strategist` (SOL-520-521-522).

## Problema (colisão de CNPJ por ordem da suíte)

`tests/modules/partners/adapters/persistence/repos/suppliers-batch-reader.drizzle.test.ts:35` limpa a
tabela **por id** (`delete(t).where(inArray(t.id, [A, B, MISSING]))`) e reinsere o CNPJ `11222333000181`.
O `supplier-repository.drizzle.test.ts` (roda antes na suíte) limpa em `beforeEach` mas **não tem
`after`/`afterEach`**, então o último teste dele deixa um supplier residual com o mesmo CNPJ (id
aleatório). A limpeza por-id da vítima não pega o resíduo → o INSERT colide na UNIQUE
`par_suppliers_cnpj_idx`. O runner passa os arquivos irmãos no mesmo banco (`--test-concurrency=1`) sem
recriar entre arquivos → falha ordem-dependente, exit 1.

## Alvo (fix trivial — 1 linha + remover import)

No `before` da vítima, trocar limpeza por-id por limpeza da **tabela inteira** (linha 35):

```ts
// antes:  await handle.db.delete(t).where(inArray(t.id, [A, B, MISSING]));
await handle.db.delete(t); // limpa na ENTRADA, por tabela — defensivo a resíduo por qualquer id
```

Remover o import `inArray` (linha 9), que fica sem uso (`noUnusedLocals`/lint).

## Critérios de aceite

- [ ] **CA1** — `suppliers-batch-reader` passa **independente de ordem/resíduo** (limpeza por tabela na entrada).
- [ ] **CA2** — `test:integration:partners` verde; job `partners` do `integration.yml` vira verde.
- [ ] **CA3 (não-afrouxamento)** — o teste segue exercitando o WHERE IN real; só a limpeza mudou.

## Relação com #535 (sistêmico) — NÃO confundir

Este é o fix **mínimo isolado** para destravar o CI **agora**. A dívida **sistêmica** (contrato de
isolamento + helper `resetPartnersTables` + os ~22 arquivos financeiros latentes + a fonte do resíduo no
`supplier-repository` sem `after`) é a **#535** (size M). O fix mínimo é **forward-compatible**: quando o
#535 entrar, `delete(t)` vira a chamada ao helper. #535 permanece aberto.

## Disciplina

Só o módulo `partners` (ADR-0014). Alinha ao contrato do #535 (limpar na entrada, por tabela, nunca por
PK quando há UNIQUE natural). W0 = prova de que passa em ordem invertida/isolado, contra MySQL real.

## Rastreio

Issue #521 · dívida sistêmica #535 · exposto pelo #523 · solução em `SOL-520-521-522.md`.
