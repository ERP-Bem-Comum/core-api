---
inquiry: 0031
title: 'A reserva que trava o vão antes do registro — deadlock 1213 na emissão concorrente de remessa'
state: open
opened: 2026-08-21
decided:
last_reviewed: 2026-08-21
---

[← Voltar ao Índice de Inquiries](./INDEX.md)

# Inquiry-0031: A reserva que trava o vão antes do registro — deadlock 1213 na emissão concorrente de remessa

- **Opened by:** Gabriel Aderaldo
- **Asked to:** medição própria contra MySQL 8.4.11 real (x99), com `innodb_print_all_deadlocks=ON` e `performance_schema.data_locks`; fonte primária = MySQL 8.4 Reference Manual
- **Impact:** issue [#789](https://github.com/ERP-Bem-Comum/core-api/issues/789) · PR [#814](https://github.com/ERP-Bem-Comum/core-api/pull/814) · o piloto VAN (épico #756) depende da emissão de remessa
- **Gatilho de fechamento:** existir decisão sobre QUAL das quatro alternativas da §4 adotar, com o efeito colateral do braço C medido. Enquanto não houver, o PR #814 fica aberto e a proteção contra dupla emissão **não** está em produção.

---

## 1. Contexto

A issue #789 registrou um TOCTOU (CWE-367) na emissão de remessa: `generateRemittance` consultava
`findHeldPayableIds` — `SELECT` sem lock, fora de transação — e só gravava muito depois, com a
tradução CNAB inteira no meio. Duas emissões concorrentes liam "livre" antes de qualquer uma gravar,
e ambas gravavam: o mesmo título em duas remessas, **pagamento em dobro**.

Nenhuma constraint recusa, e não por descuido de modelagem:

- a PK de `fin_remittance_payables` é `(remittance_id, payable_id)`, então remessas distintas são
  chaves distintas;
- nenhuma `UNIQUE` poderia recusar, porque a invariante é **condicional** — "não estar em duas
  remessas **vivas**", com `Discarded` devolvendo o título — e o MySQL não tem índice parcial.

Sem constraint possível, a exclusão tem de vir de **lock**. O PR #814 implementou uma reserva
atômica dentro da transação que o `save` já abria.

O CI então ficou vermelho de forma **não reprodutível**: os commits `72d94c2c` e `92d131ed` diferem
**apenas por um comentário** — código executável byte a byte idêntico — e o primeiro passou, o
segundo falhou. Isso motivou esta inquiry: um teste de concorrência que passa às vezes não prova
nada, e o mecanismo precisava ser medido, não deduzido.

---

## 2. Pergunta(s) feita(s)

1. Por que duas emissões concorrentes entram em deadlock, se a reserva foi desenhada justamente
   para que a segunda **esperasse** a primeira?
2. O ciclo envolve `fin_remittances`, `fin_payables`, ou ambas?
3. A afirmação escrita no código — _"não é preciso ordenar os ids, porque `IN (…)` sobre índice
   único é range condition normalizada pelo otimizador e a varredura segue a ordem da chave"_ —
   é verdadeira?
4. Por que o teste de 2 payables falha e o de 1 payable passa?

---

## 3. Respostas / Investigação

### 3.1. O código sob investigação

`src/modules/financial/adapters/persistence/repos/remittance-repository.drizzle.ts`, ramo de
**criação** dentro de `db.transaction`:

| # | Operação | Trava? | Origem |
| :-- | :--- | :--- | :--- |
| 1 | `SELECT id FROM fin_remittances WHERE id = ? FOR UPDATE` | sim | **pré-existente** |
| 2 | `SELECT id FROM fin_payables WHERE id IN (…) FOR UPDATE` | sim | PR #814 |
| 3 | relê o hold (`fin_remittance_payables ⋈ fin_remittances`) | não | PR #814 |
| 4 | `if (heldNow.length > 0) throw PAYABLES_ALREADY_HELD` | — | PR #814 |
| 5 | `INSERT` da remessa + vínculos + outbox | — | pré-existente |

O passo 1 busca **pelo id da remessa que está sendo criada** — uma linha que, por definição, ainda
não existe.

### 3.2. Reprodução (x99, MySQL 8.4.11, `REPEATABLE-READ`)

Base = HEAD `92d131ed`, banco dropado e recriado a cada rodada:

| métrica | resultado |
| :--- | :--- |
| rodadas em que o teste de 2 payables falha | **20/20 = 100%** |
| deadlocks registrados no error log | **39 em 20 rodadas** |
| rodadas com 2 deadlocks | 19 |
| erro devolvido pela perdedora | sempre `remittance-repository-unavailable` |

**No x99 não é intermitente — é 100%.** O não-determinismo observado no CI é de timing/carga, não
de código. A janela abre sempre porque o `beforeEach` esvazia `fin_remittances`: numa tabela vazia
existe **um único vão** (o `supremum`), então todo UUID cai nele.

### 3.3. O dump — caso 1 payable

```
*** (1) TRANSACTION:
TRANSACTION 5274, ACTIVE 0 sec starting index read
select `id` from `fin_payables` where `fin_payables`.`id` in ('259d267b-…') for update

*** (1) HOLDS THE LOCK(S):
RECORD LOCKS space id 103 index PRIMARY of table `core`.`fin_remittances` trx id 5274 lock_mode X
 0: len 8; hex 73757072656d756d; asc supremum;;

*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 109 index PRIMARY of table `core`.`fin_payables` trx id 5274
 lock_mode X locks rec but not gap waiting

*** (2) TRANSACTION:
TRANSACTION 5273, ACTIVE 0 sec inserting
insert into `fin_remittances` (…) values ('b6bd4780-…', …)

*** (2) HOLDS THE LOCK(S):
RECORD LOCKS space id 109 index PRIMARY of table `core`.`fin_payables` trx id 5273
 lock_mode X locks rec but not gap

*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 103 index PRIMARY of table `core`.`fin_remittances` trx id 5273
 lock_mode X insert intention waiting
 0: len 8; hex 73757072656d756d; asc supremum;;

*** WE ROLL BACK TRANSACTION (1)
```

### 3.4. O dump — caso 2 payables

```
*** (1) TRANSACTION 193248, ACTIVE 0 sec inserting
insert into `fin_remittances` (…) values ('4aec6b0f-…', …)
  HOLDS:   index fin_payables_status_idx of `core`.`fin_payables`  lock_mode X
           [supremum + 3 registros ('Open', <uuid>)]
  WAITING: index PRIMARY of `core`.`fin_remittances`  lock_mode X insert intention waiting [supremum]

*** (2) TRANSACTION 193249, ACTIVE 0 sec starting index read
select `id` from `fin_payables` where `fin_payables`.`id` in ('2a136381-…','534a331d-…') for update
  HOLDS:   index PRIMARY of `core`.`fin_remittances`  lock_mode X [supremum]
  WAITING: index fin_payables_status_idx of `core`.`fin_payables`  lock_mode X waiting

*** WE ROLL BACK TRANSACTION (2)
```

A vítima é sempre a transação do `FOR UPDATE` — que é por que o log do CI acusa naquela linha.

### 3.5. Prova direta do gap lock — `performance_schema.data_locks`

Sessão manual, sem interpretação de dump:

| caso | `LOCK_MODE` | `LOCK_DATA` |
| :--- | :--- | :--- |
| A — id inexistente, tabela **vazia** (é o passo 1 no teste) | `X` | `supremum pseudo-record` |
| B — id **existente** (ramo de update) | `X,REC_NOT_GAP` | `'5555…'` |
| C — id inexistente, tabela populada | `X,GAP` | `'5555…'` |
| D — dois ids inexistentes distintos no mesmo intervalo | `X,GAP`, **um único lock struct** | `'5555…'` |

O caso B é exatamente o que o comentário do código descreve — e está **correto para o ramo de
update**. O ramo de criação é o caso A/C.

### 3.6. Por que a citação do Refman não cobre o passo 1

O comentário cita §17.7.3:

> _"For a unique index with a unique search condition, InnoDB locks only the index record **found**,
> not the gap before it"_

A passagem pressupõe que o registro é **encontrado**. Numa busca que não encontra nada não há
registro a travar, e sobra o gap. A citação está correta; foi aplicada ao ramo errado.

### 3.7. Correção de uma premissa desta investigação

A premissa inicial — _"o teste de 2 payables falha e o de 1 payable passa, logo o número de títulos
importa"_ — é **falsa**. Os dois deadlockam (19 das 20 rodadas registraram dois deadlocks, um com
`in (?, ?)` e outro com `in (?)`).

O teste de 1 payable **passa mesmo deadlockando**, porque sua asserção só verifica
`ra.ok !== rb.ok` e ausência de rastro — e um deadlock satisfaz as duas coisas: a vítima sofre
rollback, então não grava cabeçalho nem outbox. Ele nunca olha **qual** erro veio.

> O teste vizinho não passa por ser imune. Passa por ser **cego**. Isso é um defeito por si só, e
> reforça o diagnóstico em vez de enfraquecê-lo: o ciclo não depende de haver mais de um título.

### 3.8. O plano de execução não é o que o comentário promete

Com **dois** ids, o otimizador **não usa a PK**: usa `fin_payables_status_idx` (`KEY (status)`, que
cobre `SELECT id` porque carrega a PK). Sob `FOR UPDATE`, isso trava **supremum + 3 registros** —
inclusive títulos que a query não pediu — e como `lock_mode X` sem `REC_NOT_GAP`, ou seja
**next-key**, não record puro.

Não é a causa **deste** deadlock, mas é superfície de lock bem maior do que o comentário afirma, e
um caminho aberto para outros deadlocks sob carga. Medido com `fin_payables` contendo 3 linhas; com
a tabela grande o otimizador pode preferir a PK.

---

## 4. Análise interna

### 4.1. O mecanismo, em quatro passos

1. A e B executam o passo 1 sobre linhas **inexistentes** → **ambas** pegam gap lock no `supremum`
   de `fin_remittances.PRIMARY`. Gap locks coexistem (§17.7.1: _"can co-exist (…) do not conflict
   with each other"_), ninguém espera.
2. A trava o título disputado em `fin_payables`; B fica esperando esse mesmo título.
3. A chega ao `INSERT INTO fin_remittances` e precisa de **insert-intention**, que **conflita** com
   o gap lock de B → A espera.
4. Ciclo → deadlock 1213. A vítima acusa na query do passo 2.

O defeito é do **passo 1**, código **pré-existente**. O PR #814 não introduziu o gap lock;
introduziu a **espera longa** entre pegá-lo e chegar ao INSERT, e foi isso que transformou um gap
lock inofensivo num ciclo.

### 4.2. Experimentos medidos

Todos em cópias `rsync` fora da worktree, com `node_modules` por symlink. A worktree do PR não foi
alterada (`git status --porcelain` e `git stash list` vazios ao fim).

| braço | rodadas | falhas | deadlocks | leitura |
| :--- | :--- | :--- | :--- | :--- |
| base (HEAD `92d131ed`) | 20 | 20 | 39 | linha de base |
| **B** — `payableIds` ordenados antes do `IN` | 15 | 15 | 28 | **hipótese refutada** |
| **C** — `fin_payables` travado **antes** de `fin_remittances` | 15 | **0** | **0** | **causalidade** |

O braço B refuta a hipótese de que a ordem dos ids importava — coerente com o ciclo não estar
dentro de `fin_payables`. O braço C é causalidade, não correlação: fixar uma ordem global de
aquisição entre as duas tabelas elimina 100% dos deadlocks, e a suíte fica inteira verde.

### 4.3. Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A** — inverter a ordem (travar `fin_payables` antes de `fin_remittances`) + reforçar o teste cego | 0 deadlocks em 15 rodadas, medido; ataca a causa; não remove proteção alguma; segue locking read, então a premissa do snapshot do passo 3 não é tocada | passa a travar `fin_payables` também no ramo de **update** — efeito colateral **não medido** | **PENDENTE** |
| **B** — inverter a ordem + `withDeadlockRetry` | defesa em profundidade; o helper já existe (`src/shared/persistence/retry-on-deadlock.ts`, criado pela #803) e o `document-repository.drizzle.ts:236` já o usa | mais superfície num PR já grande; risco de mascarar o próximo defeito de ordem | **PENDENTE** |
| **C** — só `withDeadlockRetry`, sem mexer na ordem | menor diff; CI fica verde | trata o sintoma; o ciclo continua acontecendo a **cada** emissão concorrente (100%, não raro), e repetir a transação inteira é caro | **PENDENTE** |
| **D** — redesenho: o hold vira **estado do próprio título**, não derivado por consulta à tabela de vínculo (sugerido na própria #789) | resolve corrida e regra de negócio pelo mesmo mecanismo; não depende de ordem de trava entre duas tabelas | redesenho; adia a proteção contra pagamento em dobro | **PENDENTE** |

### 4.4. O que NÃO está em risco

Comportamento é **fail-safe**: a transação vítima sofre rollback inteira, então a segunda remessa
não chega a existir. Em 35 rodadas de corrida o assert do vínculo único **nunca** quebrou — não há
gravação dupla. O prejuízo é o operador receber `remittance-repository-unavailable` ("banco
indisponível") em vez de `remittance-payables-already-held` ("o título já está em outra remessa"),
e uma emissão legítima morrer por ruído de concorrência.

---

## 5. Decisão final

**PENDENTE.** O diagnóstico está fechado com medição; a escolha entre as quatro alternativas da
§4.3 não. Bloqueador declarado: decisão do Gabriel, que pediu para aprofundar a pesquisa antes de
escolher.

O PR #814 **não deve ser mergeado** enquanto isso — o veredito da revisão foi corrigido de
`APPROVED` para `REJECTED` depois desta medição.

---

## 6. Saídas (outputs concretos)

- [ ] Decidir entre A / B / C / D (§4.3) e aplicar no PR #814
- [ ] Medir o efeito colateral do braço C sobre o ramo de **update** antes de adotá-lo
- [ ] Reforçar `a emissão que perde a corrida não deixa rastro algum` para assertir o **erro
      nomeado** — hoje passa mesmo sob deadlock (§3.7)
- [ ] Corrigir as duas afirmações falsas no comentário de `remittance-repository.drizzle.ts`:
      a do gap lock (§3.6) e a do plano de execução com 2 ids (§3.8)
- [ ] Issue para a superfície de lock do `fin_payables_status_idx` (§3.8) — não causa este
      deadlock, mas abre caminho para outros
- [ ] Medir a taxa com `fin_remittances` **populada** (§7, limitação 1)
- [ ] Issue [#808](https://github.com/ERP-Bem-Comum/core-api/issues/808) — corroborada, ver §7

---

## 7. Limitações honestas desta medição

1. **O `beforeEach` esvazia `fin_remittances`**, então todo UUID cai no mesmo gap (`supremum`). É o
   **pior caso possível**, e explica os 100% aqui contra o intermitente do CI. Em produção, com a
   tabela cheia, dois UUID v4 caem no mesmo gap com probabilidade menor — **mas não nula**: o caso
   D da §3.5 mostra que ids distintos dentro de um intervalo compartilham um único lock struct.
   A taxa com tabela populada **não foi medida**.
2. **`fin_payables` tinha 3 linhas.** Com esse volume o otimizador prefere o índice secundário. Com
   a tabela grande ele poderia escolher a PK, e o lock em `fin_payables` mudaria de forma — o ciclo
   em `fin_remittances`, não.
3. **Não foi medido sob `READ COMMITTED`.**
4. **Sobre a #808:** ao recriar o container **com** as flags de `docker/mysql/conf.d/server.cnf` as
   migrations rodaram inteiras. Isso **corrobora** o diagnóstico, mas o `errno=1267
   ER_CANT_AGGREGATE_2COLLATIONS` foi reproduzido apenas uma vez, num container **sem** aquelas
   flags; o lado negativo não foi re-executado. O schema sustenta a causa: `fin_payables.id` e
   `document_id` são `utf8mb4_bin` explícito enquanto as demais colunas herdam
   `utf8mb4_unicode_ci`, então coluna sem `COLLATE` explícito num JOIN cai na mistura.

---

## 8. Referências

- Issue [#789](https://github.com/ERP-Bem-Comum/core-api/issues/789) — TOCTOU na emissão
- PR [#814](https://github.com/ERP-Bem-Comum/core-api/pull/814) — a reserva atômica (aberto)
- PR [#802](https://github.com/ERP-Bem-Comum/core-api/pull/802) — tentativa anterior, fechada
  porque o commit do conserto nunca chegou ao remoto
- Issue [#808](https://github.com/ERP-Bem-Comum/core-api/issues/808) — `varchar` de negócio sem
  `COLLATE` (§7.4)
- Issue [#803](https://github.com/ERP-Bem-Comum/core-api/issues/803) / commit `cbc1c7e7` — origem
  de `withDeadlockRetry`
- MySQL 8.4 Reference Manual §17.7.1 (tipos de lock, coexistência de gap locks), §17.7.3
  (locking reads), §17.7.2.3 (consistent reads e snapshot), §10.2.1.2 (range conditions)
- `src/modules/financial/adapters/persistence/repos/remittance-repository.drizzle.ts` — o ramo
  de criação
- `tests/modules/financial/adapters/persistence/remittance-repository.drizzle-mysql.test.ts`
  — `describe('emissão concorrente — a janela TOCTOU (#789)')`
