---
name: sql-or-undefined-where-predicate
description: função WHERE-builder deve retornar `SQL | undefined`, nunca `SQL` com cast — as duas regras de null-assertion se contradizem
metadata:
  type: reference
---

Quando uma função monta o predicado de `.where()` combinando `and(...)`/`or(...)` do
`drizzle-orm`, o retorno de `and()`/`or()` é `SQL | undefined` (podem, em tese, receber zero
condições). Duas regras de ESLint deste projeto colidem exatamente nesse ponto quando se tenta
forçar o tipo para `SQL` não-nulo:

- `@typescript-eslint/non-nullable-type-assertion-style` reprova `and(...) as SQL` — pede `!`.
- `@typescript-eslint/no-non-null-assertion` (banida no projeto) reprova `and(...)!`.

**Não há saída por cast/assertion — a saída é não remover o `undefined`.** O idioma já
estabelecido no repositório é declarar a função como `(): SQL | undefined =>` e deixar `and(...)`
retornar seu tipo natural, sem `as`/`!` nenhum. `.where()` do Drizzle aceita `SQL | undefined`
diretamente (`undefined` = sem filtro). Precedentes: `contract-repository.drizzle.ts:146`
(`listWhere`), `payable-list-view.drizzle.ts:34`, `user-query.drizzle.ts:50`,
`program-repository.drizzle.ts:28`, `budget-plan-repository.drizzle.ts:67`,
`general-report-projection.ts:149`, `cashflow-projection.ts:99`.

Achado durante o ticket outbox-fanout (#800/#824, 23/08/2026): o team-lead aplicou
`and(isNull(...), notExists(...)) as SQL` em `pendingForConsumer` (contracts e partners) como
parte do ADR-0064 §3 (índice `processed_at IS NULL` precisa vir primeiro, sweeper em lote marca a
coluna — ver [[project-outbox-fanout-consumer-id]]); reproduzi o `as SQL` nos meus três adapters
e o lint reprovou. Troquei a assinatura para `SQL | undefined` e removi o cast — os dois arquivos
dele mantêm o `as SQL` com a mesma pendência, fora do meu escopo corrigir.
