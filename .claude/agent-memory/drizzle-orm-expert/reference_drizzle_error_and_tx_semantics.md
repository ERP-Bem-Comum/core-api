---
name: drizzle-error-and-tx-semantics
description: Onde vive o errno do mysql2 sob o wrapper do Drizzle 0.45.2, e a semântica exata de db.transaction (rollback, release, ausência de retry) — medido no pacote instalado
metadata:
  type: reference
---

Medido em 2026-08-21 contra `drizzle-orm@0.45.2` + `mysql2@3.22.3` instalados (laudo da issue #803).
Todos os caminhos são relativos a `node_modules/`.

**Ponto de embrulho de erro é ÚNICO em todo o dialeto MySQL:** `drizzle-orm/mysql-core/session.js:20-84`,
método `MySqlPreparedQuery.queryWithCache`. Sem `cache` configurado (o caso deste repo — os drivers
chamam `drizzle(pool, { schema, mode: 'default' })`), a sessão instala `NoopCache`
(`drizzle-orm/mysql2/session.js:136`) e o fluxo cai no primeiro ramo, `:21-27`.

Consequências que economizam re-investigação:

- O erro do mysql2 fica em `.cause`, **profundidade 1**, e isso vale igual para `db.execute`,
  `db.select`, `tx.insert/update/delete` dentro de `db.transaction`, e até para os
  `begin`/`commit`/`rollback` (emitidos via `tx.execute`, `drizzle-orm/mysql2/session.js:202-211`).
  Não é peculiaridade de `db.execute` — generaliza o que a memória de usuário
  `drizzle-execute-error-cause-errno` registrava só para aquele método.
- `DrizzleQueryError` (`drizzle-orm/errors.js:10-20`) **não define `this.name`** (logo `String(e)`
  produz `Error: Failed query: …`) e **não tem `entityKind`** (logo `is(e, DrizzleQueryError)` do
  Drizzle não funciona; sobra `instanceof` ou duck-typing). `String()` nunca percorre `.cause`.
- Campos do mysql2 (`errno`/`code`/`sqlState`/`sqlMessage`) são anexados em
  `mysql2/lib/packets/packet.js:788-793` e sobrevivem intactos ao encapsulamento — vão por
  referência, nada é serializado.
- Exceção única: `MySql2Session.all()` (`drizzle-orm/mysql2/session.js:177-181`) chama
  `client.execute` fora do `queryWithCache` e **não** embrulha.

**`db.transaction` (`drizzle-orm/mysql2/session.js:182-218`):** tira conexão dedicada do pool via
`getConnection()`; emite ROLLBACK explícito no `catch` (`:211`) e relança; devolve a conexão no
`finally` (`:214-216`) em qualquer desfecho — **não vaza**. Não existe retry automático em lugar
nenhum do dialeto. Depois de um deadlock o `tx` é inutilizável por duas razões independentes: o
InnoDB reverteu a transação inteira, e o `finally` já liberou a conexão. Retry tem de envolver a
chamada a `db.transaction`, nunca o corpo dela — savepoint (`:220-241`) não ajuda, porque o InnoDB
não desfaz até o savepoint.

⚠️ Furo do próprio Drizzle: o `await tx.execute(sql\`rollback\`)`de`:211`não está protegido. Se
ele lançar, o`throw err`nunca executa e o erro do rollback **substitui** o erro original —
um classificador de deadlock vê`false` e não retenta. Falha conservadora, mas invisível.

`MySqlTransactionConfig` (`drizzle-orm/mysql-core/session.d.ts:49-53`) tem `isolationLevel`
**obrigatório**: passar só `accessMode` não compila.

`values([])` lança `Error("values() must be called with at least one value")` no BUILDER
(`drizzle-orm/mysql-core/query-builders/insert.js:20-24`), síncrono, sem `errno`, e **nunca chega ao
mysql2** — o comentário "mysql2 lança ER_PARSE_ERROR" espalhado pelos repos é folclore. O guard
segue necessário; a justificativa é que está errada.

Ver [[drizzle-adapter-errno-extraction-pattern]].
