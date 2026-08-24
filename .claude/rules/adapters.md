---
paths:
  - 'src/modules/*/adapters/**/*.ts'
  - 'tests/modules/*/adapters/**/*.ts'
verify:
  - claim: 'o read/write split existe em contracts e partners, não nos outros seis módulos'
    root: 'src/modules'
    pattern: 'readerUrl'
    expect:
      - 'src/modules/contracts/adapters/http/composition.ts'
      - 'src/modules/partners/adapters/http/composition.ts'
  - claim: 'a tabela cross-módulo sem prefixo é uma só, e é declarada fora dos módulos'
    root: 'src'
    pattern: "mysqlTable(\n  'eventos_processados'"
    expect:
      - 'src/shared/persistence/schemas/eventos-processados.ts'
  - claim: 'existe UM único ponto que compõe os decorators do EmailSender'
    root: 'src/modules/notifications'
    pattern: 'withRateLimit('
    expect:
      - 'src/modules/notifications/adapters/email/build-email-sender.ts'
  - claim: 'o hard replace dos títulos acontece num ponto só — um segundo obriga a revisar a regra de identidade abaixo'
    root: 'src/modules/financial'
    pattern: 'delete(schema.finPayables)'
    expect:
      - 'src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts'
---

Única camada que toca infra real (Drizzle, mysql2, S3, FS, processo externo). `ENUM` e JSON nativos são barrados por [`.semgrep/rules.yml`](../../.semgrep/rules.yml); `class` por ESLint; o prefixo de tabela por `tests/cleanup/table-prefix-isolation.test.ts`; o pool boot-scoped está em [`shared-persistence.md`](./shared-persistence.md). Nada disso se repete aqui.

- **A borda do adapter converte exceção em `Result` — e é a única que pode.** `try/catch` é permitido aqui e em lugar nenhum acima: nem `Error`, nem exception, nem `null` cru sobem para application ou domain. Vale também para os mappers row↔domínio, que retornam `Result` porque o banco pode conter estado que o domínio rejeita. Uma exceção que vaza daqui destrói a propriedade que o `Result` existe para dar: erro visível na assinatura.

- **O read/write split existe em `contracts` e `partners`, e só neles.** Os dois aceitam `readerUrl` opcional no composition root (`CONTRACTS_READER_URL`/`PARTNERS_READER_URL`); ausente, o reader reusa o writer — single-node, como o [ADR-0026](../../handbook/architecture/adr/0026-mysql-read-write-split-connection.md) previu. `financial` e `programs` recebem só `writerUrl` e roteiam **toda** leitura pelo writer: ligar réplica ali exige mudança de código, não configuração. Não inferir nem que o split existe, nem que não existe — depende do módulo que você está editando.

- **O `INSERT` na outbox vai DENTRO da transação da mudança de domínio** ([ADR-0015](../../handbook/architecture/adr/0015-mysql-outbox-pattern.md)). O evento existe **se e somente se** o estado foi persistido; "publicar depois do save" não satisfaz. O helper é `appendOutboxInTx`. MySQL não tem `LISTEN/NOTIFY`, então a leitura é **polling**, sempre — e o outbox É o log append-only canônico ([ADR-0022](../../handbook/architecture/adr/0022-read-models-via-projection-over-event-stream.md)): não criar event-store separado. Read-model é projeção idempotente por `eventId`, derivada, truncável e reconstruível — `ON DUPLICATE KEY UPDATE` + guard de recência por `occurred_at` absorve at-least-once e evento fora de ordem sem SELECT-then-UPDATE ([ADR-0045](../../handbook/architecture/adr/0045-financial-supplier-read-model.md)).

- **Comportamento transversal de envio é decorator, nunca código dentro do provedor.** Rate limit, redirecionamento de sandbox e retry envolvem o `EmailSender` preservando a assinatura do port (`(sender, …) => EmailSender`) e são compostos num ponto só — `buildEmailSender` em `adapters/email/build-email-sender.ts`, na ordem base → sandbox → rate limit. Embutir qualquer um deles em `nodemailer.ts` ou `resend.ts` faz o comportamento valer para UM provedor: o `in-memory` que os testes usam não o teria, e a suíte ficaria verde descrevendo produção errado. O [ADR-0010](../../handbook/architecture/adr/0010-email-port-adapter-pattern.md) previu `withRetry`/`withLogging`, que não existem — o que pegou foi a convenção `with*`, e é ela que vale para o próximo.

- **`eventos_processados` é a única tabela sem prefixo de módulo — e é deliberada.** Cross-módulo por desenho (ADR-0014 §"Exceção linguística"), com nome em PT-BR justificado no ADR-0015 §"Idempotência". É a única entrada da allowlist do gate de prefixo; qualquer outra tabela sem `<mod>_` é engano. **A declaração vive em `src/shared/persistence/schemas/`, fora de qualquer módulo** ([ADR-0064](../../handbook/architecture/adr/0064-outbox-fanout-per-consumer-progress.md)): mais de um adapter de outbox a lê, e declará-la em dois `schemas/mysql.ts` faria `drizzle-kit generate` emitir dois `CREATE TABLE` para a mesma tabela física. O `contracts` re-exporta e segue dono das migrations dela.

- **A pendência de um evento no outbox é POR CONSUMIDOR, nunca da linha.** O claim faz anti-join com `eventos_processados` (`consumer_id` + `event_id`), e `markProcessed` grava ali — **a coluna `processed_at` da própria outbox não é mais escrita**. Reivindicar por `WHERE processed_at IS NULL` é o que transformava fanout em fila: dois consumidores com propósitos distintos dividiam os eventos sob `FOR UPDATE SKIP LOCKED`, e a projeção perdia em silêncio o que o outro consumisse primeiro ([ADR-0064](../../handbook/architecture/adr/0064-outbox-fanout-per-consumer-progress.md)). Duas consequências que não se descobre lendo o adapter: **`moveToDeadLetter` não apaga a linha de origem** (a desistência é de um consumidor só, e o ADR-0022 exige que o log retenha a entrada), e a transação de claim roda em **READ COMMITTED** — sob o `REPEATABLE READ` default, o gap lock no índice `(processed_at, occurred_at)` faz o `INSERT` do **produtor** estourar `1205`. O predicado canônico é `isPendingForConsumer`; o SQL de cada adapter é tradução dele, e `tests/cleanup/outbox-claim-per-consumer.test.ts` cobra os dois.

- **Payload de evento de integração é montado no adapter, a partir do snapshot do agregado** — nunca do evento de domínio, que não muda para servir integração ([ADR-0043](../../handbook/architecture/adr/0043-partners-supplier-integration-events.md) §Opção A). Serializado com `JSON.stringify` em `varchar`. **Campo aditivo nunca quebra `schema_version = 1`**: acrescentar não exige bump, porque o consumidor ignora campo desconhecido ([ADR-0046](../../handbook/architecture/adr/0046-contracts-contractor-ref-integration-events.md)).

- **Storage e leitura fiscal têm a mesma regra de superfície.** O cliente é o SDK oficial da AWS — `@aws-sdk/client-s3` mais `@aws-sdk/s3-request-presigner` para URL assinada — sem wrapper caseiro e sem emulador custom; MinIO e S3 rodam o mesmo código, mudando só `forcePathStyle` ([ADR-0019](../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md)). E o `DocumentReaderPort` recebe **bytes** (`Uint8Array`), nunca URL vinda do cliente ([ADR-0050](../../handbook/architecture/adr/0050-document-reader-cascade-supersedes-0034.md)) — é anti-SSRF, e a cascata termina em **erro explícito**, nunca em valor errado silencioso.

- **Apontar para o id de uma entidade FILHA é um contrato com o save do agregado dono — e ele pode não ter sido avisado.** O `save` de agregado aqui é *hard replace*: apaga os filhos e reinsere o lote (`document-repository.drizzle.ts`, R8.1). Enquanto ninguém referenciava aqueles ids de fora, regenerá-los era inócuo — e o domínio registrava isso por escrito, como contrato deliberado. No dia em que uma tabela nova passou a guardar `payable_id`, a premissa virou falsa **sem que a decisão que a sustentava fosse revista**: duas verdades contraditórias no mesmo repositório, nenhuma citando a outra. O resultado foi vínculo órfão em silêncio e a trava anti-dupla-emissão deixando de reconhecer o próprio título — pagamento em dobro, que era exatamente o que a tabela existia para impedir.

  A pergunta a fazer **antes** de criar a coluna, e que não se responde lendo o schema: *o save do agregado dono preserva este id, ou o regenera?* Se regenera, ou o save passa a preservar, ou a referência tem de apontar para algo estável. Escolher a chave "certa" no papel — o grão do negócio — não basta se a coluna referenciada for endereço temporário em vez de identidade.

- **FK cross-aggregate é `RESTRICT`; `CASCADE` é para dentro do boundary.** As FKs `CASCADE` deste repositório são todas intra-agregado — hard delete do boundary, como o topo de `schemas/mysql.ts` já explica citando Evans. Quando quem referencia é **outro** agregado, `CASCADE` é pior que a ausência de FK: troca "órfão detectável" por "linha que evaporou sem rastro", e o rastro costuma ser justamente o que a tabela existe para guardar (o que foi enviado ao banco, o que foi conciliado). `RESTRICT` transforma o `DELETE` indevido em `ER_ROW_IS_REFERENCED_2` dentro da transação do save, que o `catch` da borda já converte em `Result` — o erro aparece em desenvolvimento, no lugar do defeito, sem uma linha de código nova.

  ⚠️ **Omissão de FK se justifica no comentário, ou não se distingue de esquecimento.** É assim que este repositório marca a omissão deliberada: citando o ADR que a autoriza. Uma coluna cercada de comentário explicando PK, UNIQUE e índices, e **muda** sobre FK, lê-se como descuido — e foi lida assim, corretamente, duas vezes.

Identidade de entidade e por que ela não é atributo: [`domain.md`](./domain.md). Modelagem de `mysqlTable`, índices e FKs: skill [`drizzle-schema-author`](../skills/drizzle-schema-author/SKILL.md). A lista normativa de features SQL permitidas e proibidas vive no [ADR-0020](../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — abrir lá em vez de confiar em resumo.
