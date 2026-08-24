# 13 — Job `outbox-sweeper`: contrato de execução

> Operacionaliza o sweep de outbox decidido no [ADR-0064](../architecture/adr/0064-outbox-fanout-per-consumer-progress.md) §3.
> Materializa a disciplina one-shot do [ADR-0041](../architecture/adr/0041-specialized-workers-and-oneshot-jobs.md).
>
> **Este documento descreve o QUE executar e sob quais garantias — não COMO agendar.** A infraestrutura de QA e produção é escrita e operada pela equipe de infra, com ferramental próprio; o `compose.yaml` deste repositório serve ao desenvolvimento local e não é o agendador de nenhum ambiente real.

---

## Antes de tudo: o que este job é, e o que ele NÃO é

**Se este job nunca rodar, nada quebra.** A consulta que o worker usa para reivindicar eventos volta a ser a lenta, e **continua correta** — nenhum evento se perde. O `NOT EXISTS` por consumidor, que garante a entrega, não depende dele em nada. O que se perde é velocidade conforme a tabela cresce.

⚠️ **Mas ligá-lo tem uma consequência que não se desfaz.** A marca `processed_at` que ele escreve **poda a linha do claim de TODOS os consumidores** — inclusive de um que venha a existir depois. Um consumidor acrescentado a um outbox já varrido **nasce cego para o histórico já marcado** e precisa de backfill próprio para recompô-lo. Não é hipótese: `financial-supplier-view` foi exatamente esse caso, e é por isso que existe `src/jobs/financial/supplier-view-backfill/`.

Portanto, **antes de agendar num ambiente**, tenha certeza de que a lista de consumidores (`src/shared/outbox/registered-consumers.ts`) está completa — não só porque um a menos perde evento (ver §"O risco de configuração"), mas porque o que for marcado hoje é histórico que um consumidor futuro não alcança.

**Não há urgência em agendar.** Em ambiente com poucas dezenas de eventos o ganho é indistinguível de zero. O gatilho é o outbox começar a acumular milhares de linhas — e essa avaliação é externa ao job: **`reachedLimit` só aparece se ele já estiver agendado**, e na primeira execução sobre um backlog existente ele dispara por drenagem normal, não por frequência insuficiente. Para decidir *quando* agendar, meça a tabela, não espere o job avisar.

---

## Por que ele existe

O claim do worker precisa de um predicado seletivo para usar o índice `(processed_at, occurred_at)`. Até o ADR-0064 esse predicado era `processed_at IS NULL`, escrito pelo próprio worker ao concluir a entrega.

Com o fanout por consumidor, a conclusão passou a ser registrada **por consumidor**, em `eventos_processados` — e a coluna `processed_at` da linha do outbox deixou de ser escrita. Todas as linhas viraram `NULL`, e o índice deixou de discriminar. Somado à dead-letter que também parou de apagar a origem (exigência do [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md)), o outbox não esvazia sozinho.

Medido em MySQL 8.4.11, com 50.000 linhas acumuladas e 10 pendentes:

| | consulta do worker | plano | linhas travadas |
| --- | --- | --- | --- |
| sem o sweep | 115ms | `index` scan + `filesort` | **100.000** |
| com o sweep | **2ms** | `ref`, `key_len 8` | **10** |

O worker verifica a fila a cada 100ms: sem a marca, a consulta não cabe no próprio intervalo.

A marca volta com **outro significado** — "todos os consumidores registrados já resolveram este evento", não "alguém entregou" — e é escrita **em lote, fora do caminho do worker**: pôr o `UPDATE` dentro da conclusão de cada entrega custou, na medição, **19 deadlocks em 60 eventos**.

---

## Pré-requisitos

1. **`job:migrate` COMPLETO** (os sete módulos). O job usa `applyMigrations: false` (prod-safe) e depende de `eventos_processados`, criada pelo journal do **`contracts`**. ⚠️ Essa tabela é cross-módulo e não tem dono entre os journals ([#830](https://github.com/ERP-Bem-Comum/core-api/issues/830)): migrar só o módulo que se pretende varrer **não basta**.
2. **As quatro `*_DATABASE_URL` presentes na execução.** ⚠️ Não basta que apontem para o mesmo banco — elas precisam **estar setadas**, porque a verificação de consistência só compara as que existem (ver §"Falha de configuração"). Medido em `erp-prod-sim`: **só o container do core-api tem as quatro**; os workers têm duas ou três. Rodar o job na imagem de um worker reduz a proteção sem aviso.
3. Nenhuma outra dependência: sem fila, sem cache, sem rede externa.

---

## Comando canônico

```bash
CONTRACTS_DATABASE_URL=... \
PARTNERS_DATABASE_URL=... \
FINANCIAL_DATABASE_URL=... \
AUTH_DATABASE_URL=... \
  node --experimental-strip-types --enable-source-maps --no-warnings \
    src/jobs/shared/outbox-sweeper/run.ts 2>&1
```

⚠️ **Duas coisas nesse comando não são detalhe de estilo — sem elas ele falha ou fica mudo:**

**1. `node` direto, não `pnpm run`.** Medido na VM ao rodar os backfills: o `pnpm` **está** no PATH (`/usr/local/bin/pnpm`), mas é o shim do corepack, que na primeira invocação tenta baixar a versão fixada em `packageManager` — e o host não tem internet própria:

```
! Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-11.18.0.tgz
Error: ... ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR
```

Falha **antes de o job existir**. Não confira com `command -v pnpm`: ele existe; o que falta é rede. O script `pnpm run job:outbox-sweeper` continua válido para **desenvolvimento local**, onde há rede e o corepack já resolveu.

**2. `2>&1`.** **Toda** a saída do job vai para **stderr** — inclusive a linha `alvo:` e os `marked=`. Um cron que capture apenas stdout recebe **arquivo vazio**: sem alvo, sem contagem, sem `reachedLimit`. A auditabilidade descrita abaixo depende desse redirecionamento.

O job é **one-shot**: conecta, executa, fecha o pool e sai. Sem loop, sem `setInterval`, sem listener de sinal.

### Variáveis

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `CONTRACTS_DATABASE_URL` | **sim** | é a conexão que o job abre |
| `PARTNERS_DATABASE_URL` | **sim, na prática** | sem ela a verificação de consistência perde um comparando |
| `FINANCIAL_DATABASE_URL` | **sim, na prática** | idem |
| `AUTH_DATABASE_URL` | **sim, na prática** | idem |
| `OUTBOX_CONSUMER_ID` | não | se definida, precisa ser **o mesmo valor** que os workers do grupo `outbox` usam — ver §"O risco de configuração" |

---

## Exit codes

| Código | Significa | O que fazer |
| --- | --- | --- |
| **0** | sucesso — **inclusive com `marked=0`** | nada. Zero é resultado válido: "não havia evento totalmente resolvido para marcar" |
| **78** | `EX_CONFIG` | **não retentar sem corrigir.** Três causas: (a) falta `CONTRACTS_DATABASE_URL`; (b) alguma `*_DATABASE_URL` **mal-formada** (não parseia como URL) — a mais provável por erro de digitação num cron; (c) as URLs apontam para **bancos diferentes** |
| **1** | erro de runtime (conexão, I/O) | retentável. A próxima execução refaz do zero |

Falha em um outbox **não impede os outros** — são independentes. O exit code final reflete que houve falha.

**Interrupção no meio é inofensiva**, mas não por atomicidade: os `UPDATE` saem em autocommit, um por lote, e lote concluído **está commitado**. O que torna a interrupção segura é a **idempotência** (`AND processed_at IS NULL` no `UPDATE`) somada ao fato de o sweeper só marcar linha que **já estava resolvida** por todos.

---

## Saída e como lê-la

Lembrando: tudo abaixo sai em **stderr**.

```
[outbox-sweeper] alvo: db.exemplo.interno:3306/core
[outbox-sweeper] ctr_outbox: marked=0 batches=1
[outbox-sweeper] par_outbox: marked=1500 batches=3
[outbox-sweeper] fin_outbox: marked=0 batches=1
[outbox-sweeper] auth_outbox: marked=0 batches=1
[outbox-sweeper] par_email_outbox: marked=0 batches=1
```

- **`alvo:`** — host, porta e database, **sem credencial**. Existe para tornar `marked=0` auditável: sem ele não há como distinguir "não havia trabalho" de "marcou no lugar errado".
- **`marked=N`** — ⚠️ conta os **candidatos selecionados**, não as linhas efetivamente afetadas. Sob duas execuções simultâneas sobre o mesmo lote, a segunda marca zero e **reporta o mesmo N da primeira**. Não é erro de correção (o `UPDATE` reconfirma `processed_at IS NULL`), mas o número não serve para auditar concorrência.
- **`(teto de lotes atingido — sobrou trabalho)`** — o job parou por limite. Na **primeira** execução sobre um backlog existente isso é esperado e não indica frequência baixa; em execuções de regime, indica.

---

## Dimensionamento

O job processa no máximo **`batchSize × maxBatches` = 500 × 20 = 10.000 linhas por TABELA**, e varre **cinco** tabelas — teto real de **50.000 linhas por execução**. Os valores são constantes em `run.ts` (`SWEEP_CONFIG`), deliberadamente:

- **Lote pequeno (500)** porque o lote é o número de registros travados de uma vez. Medido: 500 trava 504 registros e leva ~199ms; 5.000 trava 5.000 sem ganho proporcional.
- **Teto de 20 lotes por tabela** para que um job one-shot não rode indefinidamente.

**A frequência precisa cobrir `taxa de eventos × número de consumidores por outbox`.** Um backlog de 50.000 **numa única tabela** exige cinco execuções; distribuído entre as cinco, uma basta.

**Ponto de partida sugerido:** a cada **5 minutos**. Com o volume observado nos ambientes atuais (dezenas de eventos), isso tem folga de três ordens de grandeza. Executar com frequência maior que a necessária não causa dano — só consome conexão à toa.

---

## Falha de configuração: bancos diferentes

O job abre **uma** conexão e varre as **cinco** tabelas, apoiado no fato de que hoje todas as `*_DATABASE_URL` apontam para o mesmo database `core`.

Isso **não é garantido por construção**: cada URL vem de um arquivo de secret independente. Se divergirem, o job compara `host:porta/database` e **sai com `78`**, listando-as.

⚠️ **A verificação só enxerga as variáveis SETADAS.** Com apenas `CONTRACTS_DATABASE_URL` definida, há um único comparando, `distinct.size === 1`, e o gate passa — a proteção desaparece sem deixar rastro. Por isso as quatro constam como obrigatórias na prática no pré-requisito 2. Sem elas, uma URL divergente faria o sweeper varrer o banco errado e devolver `marked=0`, indistinguível de "não havia trabalho".

---

## O risco de configuração que nenhum código pega

A separação entre consumidores **é** o `consumer_id`, e a lista em `src/shared/outbox/registered-consumers.ts` é assimétrica:

| erro | consequência |
| --- | --- |
| consumidor **a mais** (não existe) | a marca nunca sai. **Perde performance, nunca evento** |
| consumidor **a menos** (existe e não está na lista) | a marca sai antes de ele processar, e **ele perde o evento em silêncio** |
| consumidor **acrescentado depois** | nasce cego para o que já foi marcado — **exige backfill próprio** |

`tests/cleanup/outbox-claim-per-consumer.test.ts` cobra que todo `consumerId` **literal** de `src/workers/` esteja na lista. O que escapa: os dois `LoggerEventDelivery` recebem o id por **variável de ambiente** (`OUTBOX_CONSUMER_ID`).

⚠️ Se `OUTBOX_CONSUMER_ID` for definida para os workers, **precisa ter o mesmo valor onde este job roda**. Valores diferentes fazem o sweeper contar um consumidor inexistente — que, pela tabela, é o lado seguro (a marca não sai), mas desliga a otimização sem avisar. Pendência 3 do ADR-0064.

---

## Verificação

**Que o job está fazendo efeito:**

```sql
SELECT COUNT(*) FROM par_outbox WHERE processed_at IS NOT NULL;
```

**Que ele não está marcando cedo demais** — o teste que importa:

```sql
-- Eventos marcados como resolvidos que um consumidor registrado NÃO processou.
-- ⚠️ Requer as migrations 0020+ aplicadas: `dead_lettered_at` não existe antes delas,
--    e sem ela a consulta falha com ERROR 1054, não com resultado.
SELECT o.event_id
FROM par_outbox o
WHERE o.processed_at IS NOT NULL
  -- ⚠️ Corte temporal: sem ele, a consulta devolve também o RESÍDUO LEGADO — linhas marcadas
  --    pelo código anterior ao ADR-0064, que nunca tiveram registro em `eventos_processados`.
  --    Use o carimbo do deploy do fanout naquele ambiente.
  AND o.processed_at > '<AAAA-MM-DD HH:MM:SS do deploy>'
  AND NOT EXISTS (
    SELECT 1 FROM eventos_processados ep
    WHERE ep.event_id = o.event_id
      AND ep.consumer_id = 'financial-supplier-view'
      AND (ep.processed_at IS NOT NULL OR ep.dead_lettered_at IS NOT NULL)
  );
```

**Como usar isto sem se enganar** — três avisos que valem mais que a consulta:

1. **Repita para cada consumidor daquele outbox, e enumere de `src/workers/`, NÃO de `registered-consumers.ts`.** Copiar a lista de lá torna a consulta uma re-execução da lógica do sweeper contra os mesmos dados: devolve zero por construção, e a garantia é falsa. A lista do sweeper é justamente o que esta consulta existe para auditar.
2. **Para o `consumer_id` dos loggers, resolva `OUTBOX_CONSUMER_ID` do container** — e leia por `cut -z -d= -f1 < /proc/1/environ | tr '\0' '\n'`, **nunca** por `docker exec env`: nesta stack as variáveis vêm de `export` num wrapper, que um processo novo não herda.
3. **Desistência conta como resolvido.** `dead_lettered_at IS NOT NULL` fecha a condição, então a consulta devolve **zero mesmo com a DLQ cheia**. Ela audita marcação prematura, não saúde de entrega — para esta, olhe as tabelas `*_outbox_dead_letter`.

O resultado esperado é **zero**. Resultado > 0 **dentro da janela do corte** é marcação prematura, e o remédio é revisar a lista de consumidores. Fora da janela, é resíduo legado (ver ADR-0064 §"Estado legado"), e o remédio é backfill.

---

## Relacionados

- [ADR-0064](../architecture/adr/0064-outbox-fanout-per-consumer-progress.md) — a decisão, com as medições e a seção do estado legado
- [06 — contracts-sweeper](./06-contracts-sweeper-job.md) — o outro job one-shot, mesmo molde
- [09 — supplier-view backfill](./09-supplier-view-backfill-runbook.md) — recomposição de read-model, operação **diferente** desta: aquela conserta dado, esta só acelera consulta
