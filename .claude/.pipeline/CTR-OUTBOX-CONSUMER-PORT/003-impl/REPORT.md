# W1 — implementação mínima até GREEN

> Outcome: **GREEN** — boundary 7/7, typecheck (com guard CA4 provado), lint limpo,
> integração do outbox 82/82.

## Decisão de design

Entre as hipóteses do `000-request.md`, escolhida a **(1) tipo de linha canônico no port +
guard de conformidade no mapper** — é a única que satisfaz CA4 (guard que falha o typecheck
se o schema divergir do tipo de linha *do port*, o que exige o port ter um tipo de linha).

- `application/ports/outbox.ts` passa a declarar `OutboxRow` (shape escalar `Readonly<{...}>`),
  `OutboxBatchOps` e `WorkerOutboxOps` — o contrato de consumo inteiro.
- `adapters/persistence/mappers/outbox.mapper.ts` importa `OutboxRow` do port, **reexporta**
  (compatibilidade dos importadores), e mantém `OutboxInsert = $inferInsert`. Adiciona o
  **guard CA4**:
  ```ts
  type OutboxRowSchema = typeof ctrOutbox.$inferSelect;
  type AssertTrue<T extends true> = T;
  const _outboxRowDriftGuard: [
    AssertTrue<OutboxRowSchema extends OutboxRow ? true : false>,
    AssertTrue<OutboxRow extends OutboxRowSchema ? true : false>,
  ] = [true, true];
  ```
  Bidirecional → pega coluna adicionada, removida ou retipada.

## Arquivos tocados

- `application/ports/outbox.ts` — + `OutboxRow`, `OutboxBatchOps`, `WorkerOutboxOps`.
- `worker/outbox-worker.ts` — remove as 2 declarações locais; importa `WorkerOutboxOps` +
  `OutboxQueryError` do port; remove import órfão de `OutboxRow`.
- `adapters/persistence/repos/outbox-repository.drizzle.ts` — importa `OutboxBatchOps` do
  port (não mais do worker).
- `adapters/outbox/outbox.in-memory.ts` — idem.
- `adapters/persistence/mappers/outbox.mapper.ts` — `OutboxRow` vem do port + guard CA4.
- `cli/context.ts` — importa `WorkerOutboxOps` do port (não mais do worker).

## Resultado dos invariantes (boundary W0)

`tests/modules/contracts/worker/outbox-consumer-port.boundary.test.ts`: **7 pass / 0 fail**.
INV-1 (adapters não importam de worker/), INV-2 (contrato não no worker), INV-3 (contrato
no port), INV-5 (worker importa do port) verdes; INV-4 (guard) segue verde.

### Correção do teste W0 (over-specification)

INV-5 originalmente exigia que o worker importasse **ambos** `OutboxBatchOps` e
`WorkerOutboxOps` do port. O worker consome só `WorkerOutboxOps` (em `WorkerDeps.outbox`);
`OutboxBatchOps` chega por **inferência** no handler de `withPendingBatch`. Importá-lo no
worker seria import morto (quebra `no-unused-vars`). INV-5 foi estreitado para o tipo de
entrada `WorkerOutboxOps`; INV-3 já garante que `OutboxBatchOps` mora no port.

## CA4 — guard provado

Adicionado um campo de prova ao `OutboxRow` do port → `pnpm run typecheck` quebrou em
`outbox.mapper.ts(36): error TS2344: Type 'false' does not satisfy the constraint 'true'`.
Campo revertido; typecheck verde de novo.

## Limpeza colateral

Com `OutboxRow` agora `Readonly`, o `prefer-readonly-parameter-types` deixou de disparar nos
handlers de `withPendingBatch` → 5 `eslint-disable` ficaram inúteis (port, drizzle ×2,
in-memory ×2). Removidos. Lint limpo.

## Validação (CA5)

`pnpm run test:integration` (harness canônico up+wait+test+down): **82 pass / 0 fail**,
incluindo worker CA-I1/I2/I3, repo Drizzle (CA-1..7 + markFailed) e outbox-schema. Refatoração
sem mudança de comportamento observável.

> Nota: a suíte de infra `tests/infra/mysql-compose.test.ts` (CTR-DB-COMPOSE-MYSQL, CA-3..19)
> é flaky quando o container é subido fora do harness canônico (timing/permissão de secret) e
> tem ticket próprio aberto (`CTR-INFRA-READONLY-BI-GRANT`). Independe desta refatoração (TS puro).
