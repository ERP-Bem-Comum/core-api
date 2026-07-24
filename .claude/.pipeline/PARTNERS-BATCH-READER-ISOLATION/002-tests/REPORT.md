# W0 — REPORT (RED) · PARTNERS-BATCH-READER-ISOLATION (#521)

> Size S, test-only. Skill: `tdd-strategist`. Bug ordem-dependente — o teste passa ISOLADO mas falha na
> suíte `partners` (resíduo de CNPJ do `supplier-repository`). RED provado rodando a SUÍTE inteira.

## RED — suíte partners completa (13 arquivos) contra MySQL 8.4 real (x99 isolado)

```
ℹ tests 50 · pass 49 · fail 0 · cancelled 1  (exit 1)
✖ suppliers-batch-reader — e2e par_suppliers (CA7 WHERE IN)  (test:66)
    cause: Duplicate entry '11222333000181' for key 'par_suppliers.par_suppliers_cnpj_idx' (errno 1062)
```

**Mecanismo confirmado:** `supplier-repository.drizzle.test.ts` (roda antes, `beforeEach` sem `after`)
deixa um supplier residual com CNPJ `11222333000181`. `suppliers-batch-reader:35` limpa **por id**
(`inArray([A,B,MISSING])`) — não pega o resíduo (id diferente) — e insere o mesmo CNPJ → colisão na
UNIQUE `par_suppliers_cnpj_idx`. `--test-concurrency=1`, mesmo banco entre arquivos → falha
ordem-dependente. Sai `fail 0 / cancelled 1` (o before lança, cancela o CA7) → exit 1.

## Falso alarme descartado

O log mostrou também `Duplicate '11144477735'` (CPF de collaborator), MAS é do teste
`store ETL: violacao de UNIQUE secundaria -> integrity-violation`, que **insere duplicata de propósito**
(é `✔`). Não é um segundo bug. **Única** falha real = o batch-reader (CNPJ), que é o #521.

## Premissa para o W1

`suppliers-batch-reader.drizzle.test.ts:35`: `delete(t).where(inArray(t.id,[A,B,MISSING]))` →
`delete(t)` (tabela inteira, na entrada). Remover o import `inArray` (linha 9, fica órfão). Alinha ao
contrato do #535 (limpar por tabela, não por PK quando há UNIQUE natural). Forward-compatible: vira
`resetPartnersTables(handle)` quando o #535 entrar.
