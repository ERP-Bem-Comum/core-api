# 000 — Request CTR-OUTBOX-INTEGRATION-IN-REPOS

> **Ticket #4/7 da série Outbox. Size: L (maior).** Refactor `repo.save(aggregate, events)` + atualiza 4 use cases write-side + remove `eventBus.publish` separado.
> Depende de `CTR-OUTBOX-ADAPTER-DRIZZLE` ✅ (ticket #3).
> 21º ticket Opção B.

## Decisão aplicável

- **D2** ✅ — `repo.save(aggregate, events)`. Repo abre transação interna que persiste state + outbox atomicamente. Use case **não conhece tx**.

## Escopo

### 1. Ports — assinatura nova

```ts
// application/ports/contract-repository.ts
export type ContractRepositoryError =
  | 'contract-repo-unavailable'
  | 'contract-repo-conflict'
  | OutboxAppendError;   // ← união adicional (Padrão D)

export type ContractRepository = Readonly<{
  findById: (id: ContractId) => Promise<Result<Contract | null, ContractRepositoryError>>;
  findBySequentialNumber: (n: string) => Promise<Result<Contract | null, ContractRepositoryError>>;
  list: () => Promise<Result<readonly Contract[], ContractRepositoryError>>;
  save: (
    contract: Contract,
    events: readonly ContractsModuleEvent[],  // ← NOVO 2º argumento
  ) => Promise<Result<void, ContractRepositoryError>>;
}>;
```

Idem `AmendmentRepository`.

> **Nota:** `ContractRepositoryError` continua string literal por enquanto (`OutboxAppendError` é union heterogênea). Migrar repos para fully tagged é ticket separado (housekeeping).

### 2. Adapter Drizzle — `repo.save` consome `OutboxRepository.append`

```ts
// adapters/persistence/repos/contract-repository.drizzle.ts
const handle: MysqlHandle = ...;
const outboxRepo = createDrizzleOutboxRepository(handle);

return {
  save: async (contract, events) =>
    safe('save', async () => {
      await db.transaction(async (tx) => {
        await persistContract(tx, contract);                // mesmo que hoje
        if (events.length > 0) {
          // outboxRepo.append precisa receber `tx` para participar da mesma transação
          // Solução: criar helper `appendInTx(tx, events)` no outbox-repository.drizzle.ts
          //          OU expor uma versão "transacional" do append.
          await appendOutboxInTx(tx, schema, events);
        }
      });
    }),
};
```

→ **Adicionar em `outbox-repository.drizzle.ts`** (ticket #3) função exportada `appendOutboxInTx(tx, schema, events)` que faz batch INSERT na `ctr_outbox` recebendo a tx ativa. O método `append()` do port continua funcionando standalone (abre própria tx interna).

### 3. Adapter InMemory — `repo.save` consome `InMemoryOutbox.append`

```ts
// adapters/contract-repository.in-memory.ts
export const InMemoryContractRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,  // dependency injection com default
): { repo: ContractRepository; ... } => ({
  repo: {
    save: async (contract, events) => {
      // memory map update
      this.contracts.set(contract.id, contract);
      // outbox append (mesmo array em memória)
      if (events.length > 0) {
        const r = await outbox.append(events);
        if (!r.ok) return err(r.error);  // OutboxAppendError virou parte da union
      }
      return ok(undefined);
    },
    ...
  },
  ...
});
```

> **Mantém `InMemoryEventBus` como adapter alternativo** — tests rápidos podem injetar `InMemoryEventBus` que internamente armazena os eventos numa array (signature compatible com OutboxPort.append). Hoje `InMemoryEventBus.publish` recebe 1 evento; vamos manter por compat mas o use case NÃO chama mais — só repo orquestra.

### 4. Use cases (4 write-side) — passar `events` no save, remover `eventBus.publish`

#### `create-contract.ts`

```ts
// Antes
const saveResult = await deps.contractRepo.save(created.value.contract);
if (!saveResult.ok) return saveResult;
const publishResult = await deps.eventBus.publish(created.value.event);
if (!publishResult.ok) return publishResult;

// Depois
const saveResult = await deps.contractRepo.save(
  created.value.contract,
  [created.value.event],
);
if (!saveResult.ok) return saveResult;
// (sem publish — repo orquestrou tudo na mesma tx)
```

Remover `eventBus` do `Deps` do use case? Não — manter por compat com tests que ainda inspecionam eventBus. Mas use case não chama mais.

> **Decisão pragmática:** remover `eventBus` do `Deps` agora. Tests que usavam `eventBus.published` para verificar precisam mudar para inspecionar `outbox.all()` ou similar. Refactor mais limpo.

#### `create-amendment.ts`, `attach-signed-document.ts` — mesma lógica.

#### `homologate-amendment.ts` — caso especial (2 agregados, 2 events)

```ts
// Antes (2 saves + 2 publishes)
await amendmentRepo.save(homologated.value.amendment);
await contractRepo.save(contractUpdated.value.contract);
for (const event of events) {
  await eventBus.publish(event);
}

// Depois (2 saves; cada um leva seus events)
await amendmentRepo.save(homologated.value.amendment, [homologated.value.event]);
await contractRepo.save(contractUpdated.value.contract, [contractUpdated.value.event]);
```

**Atomicidade entre os 2 agregados:** NÃO garantida (2 transações sequenciais). É o estado atual do código (mesma sequência). Documentar essa limitação no comentário do use case — full distributed atomicity (one transaction across both aggregates) é fora de escopo do MVP. Atomicidade LOCAL de cada agregado + seus eventos é garantida.

### 5. Use cases read-side (2) — sem mudança

`get-contract.ts`, `list-contracts.ts` — leitura, sem eventos. Sem refactor.

### 6. Tests — atualizar

- **Tests que verificavam `eventBus.published`** → inspecionar `outbox.pending()` ou `outbox.all()` (helpers do InMemoryOutbox).
- **Tests de use case** — passar `OutboxPort` mock em `deps` em vez de `eventBus`.
- **`EventBus` continua importável** mas marcado como `@deprecated — substituído por OutboxPort embutido em repos`. Mantém para não quebrar.

### 7. CLI driver — atualizar context

```ts
// cli/drivers/memory.ts e cli/drivers/mysql.ts
// Antes:
const eventBus = InMemoryEventBus();
const contractRepo = InMemoryContractRepository();

// Depois:
const outbox = InMemoryOutbox();
const contractRepo = InMemoryContractRepository(outbox.port);
const amendmentRepo = InMemoryAmendmentRepository(outbox.port);
// (sem eventBus separado)
```

CLI fixtures + state file precisam continuar funcionando.

## Critérios de aceitação

- **CA1** — `ContractRepository.save` aceita `events` como 2º argumento.
- **CA2** — `AmendmentRepository.save` idem.
- **CA3** — Adapter Drizzle de cada repo usa `db.transaction` envolvendo state + outbox.
- **CA4** — Adapter InMemory de cada repo recebe `OutboxPort` (default: `InMemoryOutbox().port`).
- **CA5** — Os 4 use cases write-side passam events no save; **não chamam mais `eventBus.publish`**.
- **CA6** — Use cases write-side **removem `eventBus`** do `Deps` (forçar callers atualizar — bem mais limpo que manter como no-op).
- **CA7** — Tests atualizados para inspecionar `outbox.all()` / `outbox.pending()` em vez de `eventBus.published`.
- **CA8** — CLI drivers (memory + mysql) instanciam `InMemoryOutbox` + injetam no repo.
- **CA9** — Gates: typecheck/test/test:integration/lint/format verdes.
- **CA10** — `homologateAmendment` continua emitindo 2 events em saves separados (limitação MVP documentada no código).

## Não-objetivos

- Atomicidade distribuída entre amendment + contract — fora de escopo MVP.
- Worker loop — ticket #5.
- CLI run-outbox-worker — ticket #6.
- `public-api/events.ts` exporta union — ticket #7.
- Migrar `ContractRepositoryError` para fully tagged — housekeeping futuro.

## Risco / pontos de atenção

1. **Refactor amplo (~10+ arquivos `src/` + tests):** dependency injection do OutboxPort no InMemoryRepo é o ponto de mudança que se propaga.
2. **`appendOutboxInTx(tx, schema, events)` precisa ser adicionado ao `outbox-repository.drizzle.ts`** (ticket #3 não previu). Função pública adicional.
3. **Tests que mockam `eventBus`** vão precisar mockar `OutboxPort` agora. Substituição direta na maioria dos casos.
4. **CLI state file** — não persiste outbox em JSON do `cli-state.json` atualmente. Manter assim (efêmero) ou adicionar? **Pragmático:** manter efêmero — eventos só persistem com driver MySQL (atomicidade real). Driver memory é só para testes da P.O.
5. **Mitigação Bug #47936** — refactor extenso. Aceitar fallback admin se sub-agent parar mid-task.
