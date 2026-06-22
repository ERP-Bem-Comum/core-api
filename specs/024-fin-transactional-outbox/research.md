# Research — Outbox transacional do Financeiro (024 / #127)

Fase 0. As decisões-chave foram resolvidas no `/speckit-clarify` via **discussão de 3 especialistas com pesquisa** (drizzle-orm-expert, mysql-database-expert, general-purpose sobre a base canônica ACDG). Consolidação abaixo (Princípio IX).

---

## D1 — Achado de recon que reformula a issue: o Financeiro não tem outbox persistente

**Decision**: introduzir a tabela `fin_outbox` (MySQL) — não existe hoje.

**Rationale**: `composition.ts:340` usa `createInMemoryOutbox()` **mesmo no driver mysql** (Fatia 1 deixou o outbox in-memory; comentário em `composition.ts:11`). Não há tabela `fin_outbox` nem adapter drizzle. Logo, "tornar atômico" exige **primeiro** construir o outbox persistente. A issue assumiu paridade com `contracts` (que tem `ctr_outbox`) e por isso classificou como M "sem schema" — é **L com migration**.

---

## D2 — Escopo: incluir a conciliação (decisão de clarify, 3 especialistas)

**Decision**: a atomicidade cobre os 7 use-cases de documento **E** as operações de conciliação (confirm/confirmManualEntry/undo).

### Posição drizzle-orm-expert (mecânica transacional)

As duas `db.transaction` **já existem**: `document-repository.drizzle.ts:224` (save: documents+payables+retentions+taxes) e `reconciliation-repository.drizzle.ts:51` (confirm/confirmManualEntry/undo, que já escrevem `fin_payables`/`fin_statement_transactions`). O INSERT no `fin_outbox` encaixa como **último passo** de cada tx, via helper `appendFinOutboxInTx` (tipo estrutural `{ insert: ... }`, igual ao `appendOutboxInTx` de contracts, `outbox-repository.drizzle.ts:65`). Os use-cases do Financeiro produzem o evento **após** chamar o repo → a solução **passa os eventos para dentro** da operação do repo (como contracts passa `contractor`). Custo de incluir = marginal; risco de adiar = mesma janela, mais grave na conciliação.

### Posição mysql-database-expert (atomicidade + tabela)

`fin_outbox` espelha `ctr_outbox` (`schemas/mysql.ts:315`): `event_id` char(36) PK (idempotência), `payload` **varchar(8192)** (não JSON — ADR-0020), índice `(processed_at, occurred_at)`. Atomicidade garantida: `db.transaction` emite `START TRANSACTION` (autocommit off — Refman §15.3.1); rollback cobre estado **e** outbox incondicionalmente (Refman 17-innodb §atomicity). Sem `ON DUPLICATE KEY UPDATE` (ADR-0020) — idempotência pela PK (`ER_DUP_ENTRY` reverte a tx). Mesmo `FinancialMysqlHandle` ⇒ **mesma transação MySQL**, sem coordenação distribuída — o "dois repos" não tem peso no nível de DB. Incluir a conciliação = +1 INSERT na tx já existente (trivial; sem novo lock — InnoDB já segura o X-lock até o COMMIT).

### Posição DDD canônico (Vernon / Newman)

A atomicidade é **propriedade do emissor, não condicionada a haver consumidor**. Critério de inclusão = "a operação publica um Domain Event?", não "já há assinante?".

> `ddd/ddd--vernon-livro-vermelho.md:7562` — "You create a special storage area (for example, a database table) for Events in the same persistence store that is used to store your domain model… An out-of-band component… uses the Event Store to publish all stored, unpublished Events… your model and your Events are **guaranteed to be consistent within a single, local transaction**."

> `architecture/building-microservices--sam-newman.md:2966` — "…by decomposing this operation into two separate database transactions, we've lost guaranteed atomicity of the operation as a whole." (dual-write problem)

→ Escopo de princípio = todas as fontes de evento do módulo. A conciliação emite os eventos cross-módulo reais (`PayableReconciled`/`ReconciliationUndone`) — é onde o dual-write já machuca. "Documento primeiro, adiar conciliação" seria o pior dos três.

**Alternatives considered**: só os 7 de documento (deixa a janela na conciliação — rejeitado); só a conciliação primeiro (válido como fatiamento por custo, mas a decisão é fazer ambos; pode-se fatiar o ticket em A=documento, B=conciliação).

---

## D3 — Como threading: eventos para dentro do repo (não no use-case após commit)

**Decision**: as operações do repo (`save`/`confirm`/`confirmManualEntry`/`undo`) passam a **receber os eventos** e chamam `appendFinOutboxInTx` na própria tx. O `outbox.append` separado é removido dos use-cases; o port `FinancialOutbox` standalone é absorvido pela assinatura do repo (espelha contracts: `contract-repository.save` faz `appendOutboxInTx` internamente).

**Rationale**: é o único jeito de o INSERT do outbox ficar na MESMA tx do estado. A alternativa (use-case orquestrando uma tx explícita passada aos 2 ports) exigiria o use-case dono da conexão transacional — mais invasivo na camada de aplicação. Threading nos repos mantém a tx encapsulada no adapter (onde ela já vive). Paridade in-memory: o `save`-com-eventos do adapter in-memory grava num outbox in-memory (mesma assinatura), preservando os testes unitários.

---

## D4 — Fora de escopo

**Decision**: o **worker de entrega** e a **DLQ `fin_outbox_failed`** ficam fora (a spec excluiu o worker; a DLQ é concern do consumidor). O escopo é a **durabilidade atômica na produção** do evento. A infra de worker genérica (`src/shared/outbox`) é acionável depois sobre a `fin_outbox`.
