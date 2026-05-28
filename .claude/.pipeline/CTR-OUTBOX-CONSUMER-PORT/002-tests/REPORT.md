# W0 — RED (testes de fronteira arquitetural)

> Outcome: **RED** — 7 de 8 falham pela razão certa; 1 passa (guard intencional).

## Teste criado

`tests/modules/contracts/worker/outbox-consumer-port.boundary.test.ts` — testes
estruturais via `readFileSync`/`readdirSync` (precedente: `tests/cleanup/docs-update.test.ts`).
Descrevem o estado-alvo da refatoração **sem prescrever o mecanismo** (extender `outbox.ts`
vs novo arquivo de port; `OutboxRow` canônico vs contrato genérico — decisão do W1).

## Invariantes e resultado

| Inv | CA | Verifica | Resultado |
| :-- | :-- | :--- | :--- |
| INV-1 | CA3+CA1 | `outbox-repository.drizzle.ts` e `outbox.in-memory.ts` **não** importam de `worker/` | 🔴 RED (2 falham) |
| INV-2 | CA1 | `worker/outbox-worker.ts` **não** declara `OutboxBatchOps`/`WorkerOutboxOps` | 🔴 RED (2 falham) |
| INV-3 | CA1+CA3 | algum arquivo em `application/ports/` declara os dois tipos | 🔴 RED |
| INV-5 | CA3 | worker **importa** os dois tipos de `application/ports/` | 🔴 RED (2 falham) |
| INV-4 | CA2 | nenhum arquivo de `application/` importa de `adapters/` | 🟢 GREEN (guard) |

```
ℹ tests 8 · pass 1 · fail 7
```

## Por que cada falha é legítima (RED pela razão certa)

- **INV-1**: `outbox-repository.drizzle.ts:15` e `outbox.in-memory.ts:8` importam
  `OutboxBatchOps` de `../../../worker/outbox-worker.ts` — a dependência invertida que o
  ticket existe para eliminar.
- **INV-2**: o worker ainda declara `export type OutboxBatchOps` e `export type WorkerOutboxOps`.
- **INV-3**: nenhum port em `application/ports/` declara o contrato hoje.
- **INV-5**: o worker usa os tipos mas os define localmente, em vez de importá-los do port.

## Guard verde por design (INV-4)

`application/` não importa de `adapters/` hoje — e **deve continuar assim** após o W1. É a
trava contra a "correção" errada: trazer `OutboxRow` (= `typeof ctrOutbox.$inferSelect`,
`outbox.mapper.ts:20`) do mapper para dentro do port violaria `.claude/rules/application.md`.
O W1 precisa desacoplar o tipo de linha por outro caminho (hipóteses no `000-request.md`).

## Fora do alcance do node:test (validar no W1/W3)

- **CA4** — guard type-level que falha o `typecheck` se o schema divergir do tipo de linha
  do port. É um artefato de tipo (apagado em runtime); validado por `pnpm run typecheck`.
- **CA5** — ausência de regressão de comportamento; validada pela suíte de integração do
  outbox (worker CA-I1..I3 + repo Drizzle) no gate W3.

## Definição de GREEN para o W1

INV-1/2/3/5 passam (contrato migrado para um port, adapters e worker importam de lá),
INV-4 permanece verde, `typecheck` verde com o guard de CA4, e a integração do outbox
permanece verde (CA5).
