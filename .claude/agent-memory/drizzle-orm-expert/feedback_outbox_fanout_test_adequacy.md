---
name: feedback-outbox-fanout-test-adequacy
description: adequar teste ao contrato novo não é afrouxar — reescrever a fonte do dado, não só o argumento
metadata:
  type: feedback
---

Ao adaptar 13 arquivos de teste para o outbox por consumidor (#800/#824, ticket outbox-fanout),
o team-lead cobrou explicitamente: "adequar um teste NÃO é afrouxá-lo" — trocar só a assinatura
da chamada sem revisar se a **fonte do dado lido pela asserção** ainda existe é o jeito de deixar
um teste verde descrevendo produção errado (a doença central do repo, ver
`registro-mente-sobre-o-codigo`).

**Por que:** Sob o desenho novo, `attempts`/`processed_at`/`last_error` da linha GLOBAL do
outbox (`ctr_outbox.attempts`, `par_outbox.processed_at` etc.) **nunca mais são escritos** — só
`eventos_processados` (Drizzle) ou o `progress` store (in-memory) carregam esse estado, por
`(consumerId, eventId)`. Um teste que só trocou `outbox.pending()` → `outbox.pendingFor(id)` mas
manteve `outbox.all()[0].attempts` continua compilando e passando (o valor é sempre `0`/`null`),
porque a asserção nunca testou o caminho novo — falso-verde clássico. Aconteceu comigo em
`tests/modules/contracts/worker/outbox-worker.test.ts` (CA-T3): só foi pego pelo `pnpm test`
final, não pelo typecheck (o `.attempts` em `OutboxRow` existe nos dois formatos, então o
compilador não acusa nada).

**Como aplicar:** ao adequar QUALQUER teste que leia `attempts`/`processedAt`/`lastError` após
`markFailed`/`markProcessed`/`moveToDeadLetter`, trocar a fonte de leitura junto com a
assinatura da chamada:
- Drizzle: `db.select().from(schema.<outbox>)` → `db.select().from(schema.eventosProcessados).where(and(eq(consumerId, X), eq(eventId, Y)))`.
- In-memory: `outbox.all().find(...)` → `outbox.pendingFor(consumerId).find(...)` (que já mapeia
  `attempts` do progress store).

**Semântica que também mudou** (não só o parâmetro): `markProcessed`/`markFailed` viraram
UPSERT por `(consumerId, eventId)` — a 2ª chamada REESCREVE o carimbo com o valor mais recente,
não é mais "primeira vence, `WHERE processed_at IS NULL`". Um teste de idempotência que afirmava
"processed_at fica com o valor da 1ª chamada" precisa virar "fica com o valor da chamada MAIS
RECENTE".

E `moveToDeadLetter` deixou de fazer `DELETE`/`splice` na origem (ADR-0022:27-29) — todo teste
que afirmava `all().length === 0` ou `<tabela>.length === 0` depois de mover pra DLQ precisa virar
`=== 1` (a row de origem PERMANECE; o que sai é só a pendência DESTE consumidor).

Ver [[project-outbox-fanout-consumer-id]].
