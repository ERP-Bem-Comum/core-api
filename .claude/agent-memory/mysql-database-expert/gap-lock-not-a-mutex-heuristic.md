---
name: gap-lock-not-a-mutex-heuristic
description: FOR UPDATE sobre chave AUSENTE em índice não-único não serve de mutex entre SELECTs — vira deadlock 1213 na hora do INSERT, não espera limpa
metadata:
  type: project
---

Heurística validada em duas sessões independentes (revisão de `72d94c2c`, branch `fix/remittance-hold-toctou` — memória original em `remittance-toctou-789-lock-review.md` daquela branch, não mergeada em `dev` — e nesta sessão, revisão do laudo `fin-remittance-payables-lock-order-review.md`):

Antes de propor `SELECT ... FOR UPDATE`/`FOR SHARE` como trava de "isso já existe / já está preso?",
perguntar primeiro: **a busca é por índice ÚNICO com valor que EXISTE (record lock, mutex de
verdade), ou por índice NÃO-único, ou por valor AUSENTE (gap lock)?**

- Índice único + valor existente → record lock puro (Refman 8.4 §17.7.3, `17-innodb-storage-
  engine.part01.md:3272-3274,3636-3637`): X↔X conflita, segunda transação ESPERA. Seguro como mutex.
- Índice não-único, OU busca por valor que ainda não existe (mesmo em índice único) → gap lock
  (mesmo arquivo, `:3147-3153`: "If id is not indexed or has a nonunique index, the statement does
  lock the preceding gap"; e para único-sem-match, a exceção "locks only the record found" não se
  aplica porque não há record). Gap locks **não conflitam entre si** (`:3154-3156`: "can co-exist...
  do not conflict with each other") — duas transações passam JUNTAS pelo SELECT, e só colidem depois,
  no INSERT (insert-intention lock vs gap lock retido) → **deadlock 1213 detectado na hora**, não
  proteção silenciosa.

Exemplo real onde isso decidiu o design: `remittance-repository.drizzle.ts` (branch `fix/remittance-
hold-toctou`, commit `72d94c2c`) trava `fin_payables` por PK (existe, único → record lock) e
DELIBERADAMENTE evita travar `fin_remittance_payables` (não-único, valor ainda ausente) para o mesmo
propósito.

Contra-exemplo que eu mesmo quase recomendei nesta sessão: uma "releitura sob lock" de
`findHeldPayableIds` dentro da tx de `adjust-document`, batendo em `fin_remittance_payables_payable_idx`
(não-único) buscando um `payable_id` que tipicamente NÃO existe ainda — exatamente o padrão que este
heurístico reprova. Ver [[fin-remittance-payables-lock-order-review]].

**How to apply:** todo pedido de "adicionar um `FOR UPDATE`/`FOR SHARE` pra impedir corrida de
existência" neste repositório passa primeiro por essa pergunta, antes de qualquer citação de Refman
sobre lock em geral.
