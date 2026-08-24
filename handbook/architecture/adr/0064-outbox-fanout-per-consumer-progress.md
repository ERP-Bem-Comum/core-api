[← Voltar para ADRs](./README.md)

# ADR-0064: O outbox entrega a N consumidores — progresso por consumidor, DLQ por consumidor, origem preservada (estende ADR-0015 e ADR-0022)

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Gabriel Aderaldo (Tech Lead) — decisão sobre a política de dead-letter e o escopo · Claude Code — investigação e implementação · suporte de infra — medição em MySQL 8.4.11
- **Estende (não supersede):** [ADR-0015](./0015-mysql-outbox-pattern.md) — o mecanismo de outbox, o retry e a tabela `eventos_processados` permanecem vigentes; este ADR **realiza** o passo 8 do fluxo de `0015:51-55`, que nunca foi implementado · [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) — o outbox como log append-only e a projeção reconstruível permanecem inalterados; este ADR **restaura** a garantia de `0022:27-29`, que a implementação violava
- **Relacionado:** [ADR-0045](./0045-financial-supplier-read-model.md) · [ADR-0046](./0046-contracts-contractor-ref-integration-events.md) · [ADR-0047](./0047-transactional-email-via-producer-domain-event.md) — os três constroem consumidores sobre outbox de outro módulo
- **Fecha:** [#800](https://github.com/ERP-Bem-Comum/core-api/issues/800) · [#824](https://github.com/ERP-Bem-Comum/core-api/issues/824)
- **Insumo:** medição em MySQL 8.4.11 real (21/08/2026) — locks, algoritmos de ALTER e volume · evidência de perda em ambiente de simulação

---

## Contexto

O [ADR-0015](./0015-mysql-outbox-pattern.md) descreveu um fluxo com dois passos distintos (`0015:51-55`):

```
8. Consumidor processa, marca event_id como visto (idempotência)
9. Worker atualiza processed_at na origem
```

O passo 8 nunca foi implementado. A tabela que ele exige — `eventos_processados`, com PK composta `(consumer_id, event_id)` — foi criada na migration `0001`, entrou na allowlist do gate de prefixo de tabela, e **nenhum código de produção jamais a leu ou escreveu**. Medido em 21/08/2026 no ambiente de simulação: a tabela está vazia numa instância que já processou 12 eventos do `par_outbox`, todos com `processed_at` preenchido e zero pendentes. O pipeline roda de ponta a ponta passando ao lado dela.

Sem o passo 8, o passo 9 virou o critério de reivindicação. E `SELECT … WHERE processed_at IS NULL … FOR UPDATE SKIP LOCKED` + `UPDATE processed_at` é o padrão de **fila de trabalho**: N workers dividem a carga, e o `SKIP LOCKED` existe precisamente para que dois nunca peguem o mesmo item. O requisito, porém, é **fanout** — consumidores de propósitos diferentes precisam, cada um, de todos os eventos.

### O que isso custou

Dois consumidores dividiram cada outbox em produção. No `par_outbox`, `partners-outbox` (que escreve num arquivo de log) contra `supplier-view-projection`; no `ctr_outbox`, `contracts-outbox` (idem) contra `contract-count-projection`. Os grupos `outbox` e `projections` sobem juntos (`compose.yaml`, `restart: unless-stopped`), e a corrida era desigual: o grupo `outbox` faz poll a cada 100ms contra 500ms do `projections` — vantagem estrutural de 5× para o consumidor cujo destino ninguém lê.

Resultado medido: **11 fornecedores cadastrados, 1 na `fin_supplier_view`, `pendentes = 0` no outbox**. Silencioso nas duas pontas — o outbox reportava tudo entregue, e metade dos eventos "existia" num arquivo de log.

O defeito **não é histórico**: um 12º cadastro feito ~4h depois do backfill que mitigou o caso anterior também não chegou à projeção. **Backfill não é conserto** — ele recalcula o passado e apaga o rastro; enquanto dois consumidores dividirem a fila, todo backfill vale até o próximo cadastro.

Dois defeitos adicionais vinham do mesmo desenho de coluna compartilhada, e nenhum deles foi notado antes:

1. **`attempts` era global.** A falha de um consumidor gastava o orçamento de retry do outro e o mandava à dead-letter sem que jamais tivesse falhado.
2. **`moveToDeadLetter` apagava a linha de origem** (`INSERT` na DLQ + `DELETE` no outbox). Isso violava `0022:27-29` — *"o outbox **retém** as entradas após a entrega: o worker faz `markProcessed`…, **não** deleta"* — e com ela a reconstrução prometida em `0022:40`. **Esse defeito é anterior ao fanout**: valia com um consumidor só, e nenhum ADR o autorizava.

Nenhum ADR aceito declara que o outbox é single-consumer. Não há, portanto, decisão a supersedir — há uma lacuna que três ADRs (0045, 0046, 0047) atravessaram construindo consumidores sem que a pergunta "o que acontece quando dois marcarem a mesma linha?" fosse feita.

---

## Decisão

### 1. A unidade de progresso é o par (consumidor, evento)

`eventos_processados` deixa de ser um registro de sucesso e passa a carregar o progresso completo de um consumidor sobre um evento: `processed_at` (agora **nullable** — a linha nasce na primeira falha), `attempts`, `last_error` e `dead_lettered_at`. A PK composta `(consumer_id, event_id)`, que existe desde a `0001`, passa finalmente a ser usada.

O predicado de reivindicação é único e vive em `src/shared/outbox/consumer-progress.ts`; o SQL de cada adapter é tradução dele. A regra em uma linha: **pendente enquanto este consumidor não concluiu nem desistiu.**

O `consumer_id` já existia e já vinha preenchido corretamente em cada `EventDelivery` — era usado apenas em log, embora o próprio tipo prometesse "logs/idempotência".

### 2. Dead-letter é terminal, por consumidor, e não apaga a origem

Entrar na DLQ **não** é reversível automaticamente. Não existe hoje caminho de volta — nenhum job, rota ou script republica de lá — e reentregar um evento dead-lettered o devolveria ao worker a cada poll, onde falharia pelo mesmo motivo que já esgotou `maxAttempts`: giro infinito sobre evento venenoso, já que não há backoff. A recuperação existe e é **deliberada**: limpar `dead_lettered_at` torna o evento elegível de novo, porque ele nunca saiu do outbox.

A DLQ passa a ter PK `(consumer_id, event_id)` nas três tabelas (`ctr_`, `par_`, `fin_outbox_dead_letter`): o mesmo evento pode matar um consumidor e ser entregue com sucesso a outro.

**A linha de origem permanece no outbox em todos os casos.** Restaura `0022:27-29`.

### 3. `processed_at` volta a ser escrito — por um sweeper em lote, nunca pelo worker

Parar de escrever `processed_at` teve um custo que só apareceu sob volume. O índice `(processed_at, occurred_at)` funcionava porque a coluna **discriminava**: os NULLs (pendentes) ficavam agrupados e o scan era curto. Com a coluna morta, todas as linhas viraram NULL e o índice deixou de separar coisa alguma — e como a dead-letter também parou de apagar a origem (decisão 2), o outbox não esvazia sozinho.

Medido em MySQL 8.4.11, com 50.000 retidos e 10 pendentes:

| | claim | plano | linhas travadas |
| --- | --- | --- | --- |
| sem a marca | 115ms | `index` scan + `filesort` | **100.000** |
| com a marca | **2ms** | `ref`, `key_len 8` | **10** |

57× mais rápido e 10.000× menos locks. O poll do grupo `outbox` é a cada 100ms: sem isso, o claim não cabe no próprio intervalo.

**Índice não resolve** — foi medido, não suposto: um covering em `eventos_processados` mantém o mesmo plano, o mesmo filesort e os mesmos 100.000 locks, e reescrever o antijoin como `LEFT JOIN` fica **mais lento** (191ms). O gargalo nunca foi o acesso à tabela de progresso; é não haver predicado seletivo sobre o outbox.

**Quem escreve a marca é um job em lote** (`src/jobs/shared/outbox-sweeper/`), e não o `markProcessed`. Pôr o `UPDATE` no caminho do worker resolveria a leitura e custaria **19 deadlocks em 60 eventos**: os dois consumidores passariam a escrever na mesma linha do outbox, com ordens de aquisição que se cruzam — reintroduzindo exatamente o acoplamento entre consumidores que a decisão 1 existe para remover. O sweeper roda sozinho; ninguém compete com ele.

A propriedade que torna isto seguro é a **degradação graciosa**: sweeper atrasado, parado ou nunca executado significa linhas não marcadas, e o claim volta a ser o lento — que continua **correto**, porque o `NOT EXISTS` por consumidor segue lá. Este job otimiza; jamais decide entrega.

⚠️ **A lista de consumidores (`src/shared/outbox/registered-consumers.ts`) é assimétrica de propósito.** Um consumidor a mais faz a marca nunca sair (perde performance); um a menos faz a marca sair **antes** de ele processar, e ele perde o evento em silêncio. Na dúvida, sobre-declare. Um gate estrutural cobra que todo `consumerId` registrado em `src/workers/` esteja na lista.

Duas restrições de implementação, ambas medidas: o lote é **pequeno** (500 — é o número de registros travados de uma vez, e 5.000 trava 5.000 sem ganho proporcional), e a seleção dos candidatos usa **JOIN, nunca subquery correlacionada** — um `UPDATE` correlacionado sobre 50k travou 117.571 linhas por 17 minutos.

Validado com o código real (MySQL 8.4.11, cenário 50k/10): o claim volta a `type=ref`, `key_len=8`, `rows=10`, **filesort eliminado**, ~0ms de banco; o sweeper trava **504** registros por lote de 500; e 40 iterações de sweeper e dois workers **simultâneos** deram **0 deadlocks e 0 lock-wait timeouts** — o custo que derrubou a alternativa de marcar no worker não voltou por este caminho, porque aqui só o sweeper escreve na linha do outbox.

⚠️ **O teto por execução é `batchSize × maxBatches` = 10.000 linhas.** Um backlog de 50k exige cinco execuções; `reachedLimit` no resultado é o que sinaliza que sobrou trabalho. Casar a frequência do cron com a taxa de eventos é decisão a tomar conscientemente — o default não a toma.

⚠️ **O job varre as cinco tabelas por uma conexão só**, apoiado no fato de que hoje todas as `*_DATABASE_URL` apontam para o mesmo `core`. Isso não é garantido por construção: no `compose.yaml` cada uma vem de um arquivo de secret **independente**, e separar módulos em bancos distintos é o que o isolamento por prefixo existe para permitir. Sem verificação, uma URL divergente faria o sweeper varrer o banco errado e devolver `marked=0` — indistinguível de "não havia trabalho", com exit 0. O `run.ts` compara `host:porta/database` das cinco e **falha com `EX_CONFIG`** na divergência, além de registrar o alvo no log. Nenhum evento se perderia nesse cenário (o `NOT EXISTS` do claim continua correto); o que se perderia é a indexabilidade, sem ninguém saber.

### 4. O claim roda em READ COMMITTED

Medido em MySQL 8.4.11: sob `REPEATABLE READ` (o default deste servidor), o `FOR UPDATE` do claim trava **next-key** no índice secundário `(processed_at, occurred_at)` — 6 locks para 5 linhas, o sexto sendo o gap do supremum. Evento novo nasce com `processed_at = NULL` e cai nesse gap, então **o `INSERT` do produtor bloqueia e estoura `1205 Lock wait timeout`**. O consumidor passa a brigar com a transação de negócio.

Sob `READ COMMITTED` os locks viram `X,REC_NOT_GAP`, os gaps somem e o `INSERT` concorrente passa. O claim não precisa das garantias de RR: ele relê tudo na rodada seguinte por construção — verificado que a linha pulada por `SKIP LOCKED` reaparece integralmente após o commit do outro consumidor. RR também produzia deadlock no caminho normal (2 em 12 rodadas) e cegava um consumidor além das linhas efetivamente travadas.

O isolamento é da sessão do worker, nunca do servidor.

### 5. Vale para os cinco outboxes, inclusive os de um consumidor só

`ctr_outbox`, `par_outbox`, `fin_outbox`, `auth_outbox` e `par_email_outbox` adotam a mesma semântica. Os três últimos têm um consumidor apenas hoje — e é exatamente por isso: o `par_outbox` também teve um só, até o dia em que não teve, e o desenho estreito não avisou. O `par_email_outbox` chegou a ser **criado** para contornar a limitação (o comentário do schema registra que colocar o evento no `par_outbox` "canibalizaria" o consumidor existente): a restrição era conhecida e foi contornada, nunca corrigida.

---

## Consequências

**Positivas.** A perda silenciosa acaba, e com ela a necessidade de backfill periódico como paliativo. `attempts` e dead-letter passam a ser por consumidor. A garantia de reconstrução do ADR-0022 volta a valer. Um consumidor novo sobre um outbox existente deixa de ser um incidente — é o caso suportado.

**Negativas / custos.** Uma consulta a mais por batch (o progresso do lote reivindicado), porque o Drizzle não expõe `FOR UPDATE OF <tabela>` e um `JOIN` sob o claim travaria `eventos_processados` junto. `eventos_processados` cresce com N consumidores × N eventos e passa a precisar de política de retenção — **pendência registrada abaixo**. Sob concorrência, o consumidor que perde o `SKIP LOCKED` espera uma rodada (500ms típicos) em vez de zero.

**Limite conhecido.** `context/planning/ASYNC-MESSAGING-STRATEGY.md:176` fixa o gatilho de reavaliação: **> 3 consumidores distintos do mesmo evento, ou necessidade de replay histórico → broker**. Com 2 por tabela, o cursor por consumidor está dentro do orçamento do outbox-MySQL. A terceira projeção sobre a mesma tabela é o momento de reabrir o [ADR-0030](./0030-valkey-shared-store-deferred.md), não de empilhar mais um cursor.

---

## Pendências

0. ⚠️ **`eventos_processados` é criada por um journal só, e agora cinco módulos dependem dela.** A tabela nasce em `contracts/0001_motionless_wind_dancer.sql:34`, mas o claim de `partners`, `financial`, `auth` e `par_email` passa a consultá-la. Medido em MySQL 8.4.11 (21/08/2026): num banco onde só `partners` e `financial` migraram, **o claim falha com a tabela ausente**. Produção não quebra — `job:migrate` roda os sete módulos —, mas **teste por módulo e deploy parcial quebram**, e a dependência atravessa em silêncio o isolamento por journal que o repositório declara. É o custo, não previsto, da exceção cross-módulo do ADR-0014: uma tabela sem dono claro entre journals. Registrado como issue própria; enquanto não houver desfecho, **`job:migrate` completo é pré-requisito de qualquer ambiente que rode worker de outbox**.

0.5. **O custo do sweeper escala com `eventos_processados`, não com o lote.** Medido: drenando 49.990 linhas em lotes de 500, o `EXPLAIN` mostra o otimizador **liderando por `eventos_processados`** (`type=range`, ~100k linhas), montando temporária e ordenando antes de o `LIMIT 500` cortar — mediana de 505ms por lote. Como essa tabela cresce N× mais rápido que o outbox (uma linha por consumidor por evento), o custo escala pior que o próprio backlog. Não é bloqueante (job de fundo, fora de request, travando 504 registros), e há mitigação **medida**: um índice `(event_id, consumer_id, processed_at, dead_lettered_at)` inverte o plano para liderar por outbox, elimina a temporária e leva 611ms → **286ms** (2,1×). Ficou de fora por ser mais uma migration; entra quando o volume justificar.

1. **Retenção de `eventos_processados` e das DLQs.** Nenhuma das duas tem política de expurgo, e a primeira agora cresce por consumidor. Não bloqueia a correção; bloqueia o crescimento indefinido.
2. **Reprocessamento a partir da dead-letter.** A decisão 2 registra que hoje é manual (limpar `dead_lettered_at`). Uma ferramenta de reprocessamento dirigido — por consumidor, por evento — não existe e não foi desenhada.
3. **Não há guarda contra `consumer_id` duplicado.** A separação entre consumidores **é** o id, e dois consumidores do mesmo outbox com o mesmo valor voltam a dividir a fila — em silêncio, porque a PK `(consumer_id, event_id)` fica satisfeita. Hoje o arranjo está correto por acidente feliz: `compose.yaml:387` define `OUTBOX_CONSUMER_ID: worker-outbox` **só no grupo `outbox`**, e o grupo `projections` usa os literais de cada delivery. Mas **os dois loggers (`contracts` e `partners`) leem a mesma variável**, e nada impede que ela seja definida no grupo errado. `tests/cleanup/outbox-claim-per-consumer.test.ts` cobre os ids literais; o id vindo de env escapa dele. O lugar certo é uma guarda de boot no worker-runner — falhar alto ao montar um grupo com dois consumidores de mesmo id sobre o mesmo outbox.

4. **O `LoggerEventDelivery` ainda está registrado nos grupos de produção.** Ele é o "default de antes de o consumer real existir", escreve num arquivo que nenhuma tela lê, e foi o vencedor das corridas que causaram a perda. Com o fanout ele deixa de roubar eventos — mas continua consumindo banco e disco sem destinatário. Avaliar a remoção é trabalho à parte.
