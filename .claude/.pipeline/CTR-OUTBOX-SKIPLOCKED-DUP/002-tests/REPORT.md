# W0 — RED + diagnóstico empírico

> Outcome: **RED** — `CA-I2` falha (`12 !== 6`). Causa raiz confirmada por experimento.

## Falha

`tests/modules/contracts/worker/outbox-worker.integration.test.ts:136` —
`CA-I2: 2 workers paralelos não duplicam delivery`: total entregue 12 (= 2×6). Ambos os
workers processaram as 6 mensagens.

## Causa raiz

`findPendingForUpdate` (`outbox-repository.drizzle.ts:191-204`) roda o
`SELECT ... FOR UPDATE SKIP LOCKED` **fora de `db.transaction`** → autocommit. Em
autocommit, o `FOR UPDATE` adquire e **libera os locks no mesmo statement**. O lock não
sobrevive até o `markProcessed` (que ocorre depois, em statement separado no
`runOnce`). Logo o 2º worker relê as mesmas rows (`processed_at IS NULL`).

## Evidência empírica (experimento descartável, MySQL real)

Inserir 6 eventos; comparar 2 leituras concorrentes:

```
[A autocommit] worker1 viu=6 worker2 viu=6   (← bug: SKIP LOCKED não isola)
[B transação ] tx1 travou=6  tx2 viu=0        (← fix: isola dentro de db.transaction)
```

- **A** reproduz o caminho atual (`findPendingForUpdate` em autocommit) → sem isolamento.
- **B** envolve o mesmo `SELECT ... FOR UPDATE SKIP LOCKED` numa `db.transaction`
  mantida aberta → o 2º leitor pula as rows travadas (vê 0). **Confirma a abordagem B.**

## Conclusão

O `FOR UPDATE SKIP LOCKED` exige uma transação aberta que sobreviva até a marcação. A
correção deve fazer **claim + delivery + markProcessed compartilharem a transação**
(at-least-once preservado — ADR-0015 §"fluxo do worker" + idempotência no consumer).

Decisão de design final (B transação-envolve-batch vs C claim-com-coluna) registrada na
conversa antes de W1.
