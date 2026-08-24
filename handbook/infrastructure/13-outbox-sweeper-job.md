# 13 — Job `outbox-sweeper`: contrato de execução

> Operacionaliza o sweep de outbox decidido no [ADR-0064](../architecture/adr/0064-outbox-fanout-per-consumer-progress.md) §3.
> Materializa a disciplina one-shot do [ADR-0041](../architecture/adr/0041-specialized-workers-and-oneshot-jobs.md).
>
> **Este documento descreve o QUE executar e sob quais garantias — não COMO agendar.** A infraestrutura de QA e produção é escrita e operada pela equipe de infra, com ferramental próprio; o `compose.yaml` deste repositório serve ao desenvolvimento local e não é o agendador de nenhum ambiente real.

---

## Antes de tudo: este job é dispensável

Comece por aqui, porque muda a prioridade de agendá-lo.

**Se este job nunca rodar, nada quebra.** A consulta que o worker de outbox usa para reivindicar eventos volta a ser a lenta, e **continua correta** — nenhum evento se perde, nenhuma projeção fica para trás. O `NOT EXISTS` por consumidor, que é o que garante a entrega, não depende deste job em nada.

O que se perde é **velocidade da consulta conforme a tabela cresce**. É otimização que, ao falhar, degrada performance em vez de corromper dado — e foi desenhada assim de propósito.

**Consequência prática:** não há urgência em agendar. Em ambiente com poucas dezenas de eventos acumulados o ganho é indistinguível de zero. O momento de agendar é quando o outbox começar a acumular milhares de linhas — e o próprio job avisa quando isso acontece (ver **`reachedLimit`** abaixo).

---

## Por que ele existe

O worker de outbox reivindica eventos com uma consulta que precisa de um predicado seletivo para usar o índice `(processed_at, occurred_at)`. Até o ADR-0064, esse predicado era `processed_at IS NULL`, escrito pelo próprio worker ao concluir a entrega.

Com o fanout por consumidor, a conclusão passou a ser registrada **por consumidor**, em `eventos_processados` — e a coluna `processed_at` da linha do outbox deixou de ser escrita. Todas as linhas passaram a ser `NULL`, e o índice deixou de discriminar. Somado à dead-letter que também parou de apagar a linha de origem (exigência do [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md)), o outbox não esvazia sozinho.

Medido em MySQL 8.4.11, com 50.000 linhas acumuladas e 10 pendentes:

| | consulta do worker | plano | linhas travadas |
| --- | --- | --- | --- |
| sem o sweep | 115ms | `index` scan + `filesort` | **100.000** |
| com o sweep | **2ms** | `ref`, `key_len 8` | **10** |

O worker verifica a fila a cada 100ms: sem a marca, a consulta não cabe no próprio intervalo.

O job devolve a marca `processed_at`, mas com **outro significado** — "todos os consumidores registrados já resolveram este evento", e não "alguém entregou". E ela é escrita **em lote, fora do caminho do worker**: pôr o `UPDATE` dentro da conclusão de cada entrega custou, na medição, **19 deadlocks em 60 eventos**, porque os consumidores passariam a escrever na mesma linha.

---

## Pré-requisitos

1. **Migrations aplicadas.** O job usa `applyMigrations: false` (prod-safe) e depende de `eventos_processados` — criada pelo journal do **`contracts`**. ⚠️ Essa tabela é cross-módulo e não tem dono entre os journals ([#830](https://github.com/ERP-Bem-Comum/core-api/issues/830)): **`job:migrate` completo é pré-requisito**, não só o journal do módulo que se pretende varrer.
2. **As quatro `*_DATABASE_URL` apontando para o mesmo banco** — ver §"Falha de configuração" abaixo.
3. Nenhuma outra dependência: sem fila, sem cache, sem rede externa.

---

## Comando canônico

```bash
CONTRACTS_DATABASE_URL=... \
PARTNERS_DATABASE_URL=... \
FINANCIAL_DATABASE_URL=... \
AUTH_DATABASE_URL=... \
  pnpm run job:outbox-sweeper
```

Equivalente direto, para ambiente sem `pnpm` no PATH:

```bash
node --experimental-strip-types --enable-source-maps --no-warnings \
  src/jobs/shared/outbox-sweeper/run.ts
```

O job é **one-shot**: conecta, executa, fecha o pool e sai. Sem loop, sem `setInterval`, sem listener de sinal. `SIGTERM` no meio faz rollback, e a próxima execução refaz — a operação é idempotente por construção (`processed_at IS NULL` na cláusula do `UPDATE`).

### Variáveis

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `CONTRACTS_DATABASE_URL` | **sim** | é a conexão que o job abre |
| `PARTNERS_DATABASE_URL` | não, mas recomendada | entra na verificação de consistência |
| `FINANCIAL_DATABASE_URL` | não, mas recomendada | idem |
| `AUTH_DATABASE_URL` | não, mas recomendada | idem |
| `OUTBOX_CONSUMER_ID` | não | se definida, precisa ser **o mesmo valor** que os workers do grupo `outbox` usam — ver §"O risco de configuração" |

---

## Exit codes

| Código | Significa | O que fazer |
| --- | --- | --- |
| **0** | sucesso — **inclusive com `marked=0`** | nada. Zero é resultado válido: significa "não havia evento totalmente resolvido para marcar" |
| **78** | `EX_CONFIG` — configuração inválida | **não retentar sem corrigir.** Ver a mensagem: ou falta `CONTRACTS_DATABASE_URL`, ou as URLs apontam para bancos diferentes |
| **1** | erro de runtime (conexão, I/O) | retentável. A próxima execução refaz do zero |

Uma falha em um outbox **não impede os outros**: são independentes, e marcar quatro é melhor que marcar nenhum. O exit code final reflete que houve falha.

---

## Saída e como lê-la

```
[outbox-sweeper] alvo: db.exemplo.interno:3306/core
[outbox-sweeper] ctr_outbox: marked=0 batches=1
[outbox-sweeper] par_outbox: marked=1500 batches=3
[outbox-sweeper] fin_outbox: marked=0 batches=1
[outbox-sweeper] auth_outbox: marked=0 batches=1
[outbox-sweeper] par_email_outbox: marked=0 batches=1
```

- **`alvo:`** — host, porta e database, **sem credencial**. Existe para tornar `marked=0` auditável: sem ele não há como distinguir "não havia trabalho" de "marcou no lugar errado".
- **`marked=N`** — linhas marcadas nesta execução.
- **`(teto de lotes atingido — sobrou trabalho)`** — aparece quando o job para por limite, e **é o sinal de que a frequência está baixa demais para o volume**. É o gatilho para rever o agendamento.

---

## Dimensionamento

O job processa no máximo **`batchSize × maxBatches` = 500 × 20 = 10.000 linhas por execução**. Os valores são constantes no código (`run.ts`, `SWEEP_CONFIG`), deliberadamente:

- **Lote pequeno (500)** porque o lote é o número de registros travados de uma vez. Medido: lote de 500 trava 504 registros e leva ~199ms; lote de 5.000 trava 5.000 sem ganho proporcional.
- **Teto de 20 lotes** para que um job one-shot não rode indefinidamente.

**A frequência precisa cobrir `taxa de eventos × número de consumidores por outbox`.** Um backlog de 50.000 linhas exige cinco execuções para drenar.

**Ponto de partida sugerido:** a cada **5 minutos**. Com o volume observado nos ambientes atuais (dezenas de eventos acumulados), isso tem folga de três ordens de grandeza. Ajuste para cima se `reachedLimit` aparecer com regularidade; para baixo (ou remova) se o outbox permanecer pequeno.

Executar com frequência maior que a necessária não causa dano — só consome conexão à toa. Duas execuções simultâneas também são seguras: o `UPDATE` reconfirma `processed_at IS NULL`.

---

## Falha de configuração: bancos diferentes

O job abre **uma** conexão e varre as **cinco** tabelas de outbox, apoiado no fato de que hoje todas as `*_DATABASE_URL` apontam para o mesmo database `core`.

Isso **não é garantido por construção**: cada URL vem de um arquivo de secret independente, e separar módulos em bancos distintos é justamente o que o isolamento por prefixo de tabela permite. Se as URLs divergirem, o job compara `host:porta/database` das quatro e **sai com `78`**, listando-as:

```
[outbox-sweeper] as *_DATABASE_URL apontam para bancos DIFERENTES, e este job varre as
cinco tabelas por uma conexão só: CONTRACTS_DATABASE_URL=... · PARTNERS_DATABASE_URL=...
```

A verificação existe porque, sem ela, o job varreria o banco errado e devolveria `marked=0` — **indistinguível de "não havia trabalho"**, com exit 0 e log de sucesso. A otimização se desligaria sozinha e em silêncio. Se os bancos forem realmente separados no futuro, o job precisa de um pool por URL: é mudança de código, não de configuração.

---

## O risco de configuração que nenhum código pega

O job decide "todos os consumidores já resolveram" a partir da lista em `src/shared/outbox/registered-consumers.ts`. A assimetria dessa lista importa:

| erro | consequência |
| --- | --- |
| consumidor **a mais** (não existe de verdade) | a marca nunca sai. **Perde performance, nunca evento** |
| consumidor **a menos** (existe e não está na lista) | a marca sai antes de ele processar, e **ele perde o evento em silêncio** |

Um gate estrutural (`tests/cleanup/outbox-claim-per-consumer.test.ts`) cobra que todo `consumerId` **literal** declarado em `src/workers/` esteja na lista. O que escapa dele: os dois `LoggerEventDelivery` recebem o id por **variável de ambiente** (`OUTBOX_CONSUMER_ID`).

⚠️ **Portanto: se `OUTBOX_CONSUMER_ID` for definida para os workers, ela precisa ter o mesmo valor no ambiente onde este job roda.** Valores diferentes fazem o sweeper contar um consumidor que não existe — o que, pela tabela acima, é o lado seguro (a marca não sai), mas desliga a otimização sem avisar. Registrado como pendência 3 do ADR-0064.

---

## Verificação

Que o job está fazendo efeito:

```sql
-- deve crescer a cada execução, enquanto houver eventos resolvidos por todos
SELECT COUNT(*) FROM par_outbox WHERE processed_at IS NOT NULL;
```

Que ele **não** está marcando cedo demais — o teste que importa:

```sql
-- eventos marcados como resolvidos que algum consumidor registrado NÃO processou.
-- Deve ser SEMPRE zero. Qualquer resultado > 0 é perda de evento em curso.
SELECT o.event_id
FROM par_outbox o
WHERE o.processed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM eventos_processados ep
    WHERE ep.event_id = o.event_id
      AND ep.consumer_id = 'financial-supplier-view'
      AND (ep.processed_at IS NOT NULL OR ep.dead_lettered_at IS NOT NULL)
  );
```

Trocar `'financial-supplier-view'` pelo `consumer_id` de cada consumidor daquele outbox.

---

## Relacionados

- [ADR-0064](../architecture/adr/0064-outbox-fanout-per-consumer-progress.md) — a decisão, com as medições
- [06 — contracts-sweeper](./06-contracts-sweeper-job.md) — o outro job one-shot, mesmo molde de disciplina
- [09 — supplier-view backfill](./09-supplier-view-backfill-runbook.md) — recomposição de read-model, que é operação **diferente** desta: aquela conserta dado, esta só acelera consulta
