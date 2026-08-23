---
name: project-outbox-fanout-consumer-id
description: outbox por consumidor (#800/#824) — modelo canônico, e o que diverge do financial
metadata:
  type: project
---

Ticket outbox-fanout (branch `fix/800-824-outbox-per-consumer`, 21/08/2026): outbox deixa de ser
fila (`processed_at` global, `FOR UPDATE SKIP LOCKED` dividindo a carga entre consumidores) e vira
fanout — cada consumidor recebe TODOS os eventos, via progresso em `eventos_processados`
(`shared/persistence/schemas/eventos-processados.ts`, cross-módulo, sem prefixo — allowlist do
gate de prefixo). Predicado canônico: `isPendingForConsumer`
(`shared/outbox/consumer-progress.ts`). Claim: `CLAIM_ISOLATION` (read committed —
`shared/outbox/claim.ts`) evita `1205 Lock wait timeout` do produtor contra o gap do claim sob
REPEATABLE READ (medido em MySQL real).

Modelo canônico a copiar: `partners/adapters/persistence/repos/outbox-repository.drizzle.ts` +
`partners/adapters/outbox/outbox.in-memory.ts` (NÃO os de e-mail). Convertidos por mim (réplica
fiel) para `financial` (fin_outbox), `auth` (auth_outbox) e `partners` e-mail (par_email_outbox).

**Divergências encontradas ao replicar, não previstas na instrução original:**

1. `financial/adapters/outbox/outbox.in-memory.ts` implementa só `FinancialOutbox.append`
   (produtor) — NUNCA teve worker ops (`WorkerOutboxOps`), nem antes do fanout. Não tem
   `pending()`/`moveToDeadLetter` para adaptar. O reader do worker é só o Drizzle
   (`fin-outbox-reader.drizzle.ts`); não existe (ainda) um in-memory equivalente para testes
   unitários do worker do financial. Deixado intocado — nada do padrão `consumerId` se aplicava.

2. `fin_outbox_dead_letter` JÁ tinha PK composta `(consumer_id, event_id)` quando cheguei ao
   typecheck — o team-lead mudou o schema em paralelo, depois de instruir "deixe TODO, sem
   consumerId, PK ainda é simples". A instrução ficou desatualizada por uma corrida de edição; o
   typecheck acusou (propriedade `consumerId` ausente e obrigatória) e resolvi passando
   `consumerId` normalmente, sem TODO. `auth_outbox_dead_letter`/`par_email_outbox_dead_letter`
   **não existem** como tabela (dark launch nessas duas fatias) — `moveToDeadLetter` ali é só
   upsert em `eventos_processados.dead_lettered_at`, sem tocar em DLQ nenhuma.

3. Achado de lint reaproveitável, e a resolução estrutural final (não `eslint-disable`):
   [[eslint-max-params-arrow-report-line]] — `markFailed` virou `(consumerId, eventId, failure:
   OutboxFailure)`, objeto em vez de posicionais soltos.

**Adaptação dos 13 testes** que consomem os cinco adapters: [[feedback-outbox-fanout-test-adequacy]]
— a armadilha central é ler `attempts`/`processedAt` da row global do outbox em vez do progresso
por consumidor; compila e passa igual (falso-verde), só o `pnpm test` acusa.

Resultado final: `pnpm run typecheck` e `pnpm exec eslint src tests` limpos em tudo que era meu;
`pnpm test` 11326/11303/3 fail (baseline 11308/11288/0) — as 3 falhas são gates de doc/governança
(`tests/cleanup/handbook-links.test.ts`, `handbook-refs.test.ts`, `rules-self-verify.test.ts`)
quebrados pela extração de `eventos_processados` para `shared/` e pela criação do ADR-0062, ambos
fora do meu escopo (arquivos do team-lead).
