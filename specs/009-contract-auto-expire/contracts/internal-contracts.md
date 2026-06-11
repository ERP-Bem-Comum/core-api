# Phase 1 — Contracts (internos): Expiração automática

Feature interna (sem borda HTTP). Os "contratos" aqui são as **assinaturas de port/use case** novas e o
helper de data. Tipos em EN; `Result<T,E>` em tudo que pode falhar.

## 1. Port — `ContractRepository.findExpirable`

Adicionar ao `domain/contract/repository.ts`:

```ts
// Contratos elegíveis a expiração automática: Active, vigência Fixed, current_period_end < cutoff.
// cutoff é a data-corrente no fuso de operação (BRT) — computada no use case.
findExpirable: (cutoff: PlainDate) =>
  Promise<Result<readonly ActiveContract[], ContractRepositoryError>>;
```

- **Drizzle**: `SELECT … WHERE status='Active' AND current_period_kind='Fixed' AND current_period_end < :cutoff`
  (cutoff serializado como `YYYY-MM-DD`). Mapeia rows → `ActiveContract` (reusa o mapper existente).
- **InMemory**: filtra a coleção pelo mesmo predicado.
- Retorna `ActiveContract[]` (já refinado) para o use case chamar `Contract.expire` sem re-`parseActive`
  (ainda assim o use case re-guarda defensivamente).

## 2. Use case — `expireDueContracts`

`application/use-cases/expire-due-contracts.ts`:

```ts
export type ExpireDueContractsResult = Readonly<{
  scanned: number;
  expired: number;
  failures: readonly { contractId: string; error: ExpireDueContractsError }[];
}>;

export type ExpireDueContractsError = ContractError | ContractRepositoryError;

type Deps = Readonly<{ contractRepo: ContractRepository; clock: Clock }>;

// (deps) => () => Promise<Result<ExpireDueContractsResult, ContractRepositoryError>>
export const expireDueContracts =
  (deps: Deps) => async (): Promise<Result<ExpireDueContractsResult, ContractRepositoryError>> => {
    const now = deps.clock.now();
    const cutoff = plainDateInSaoPaulo(now); // hoje em BRT (UTC-3)
    const due = await deps.contractRepo.findExpirable(cutoff);
    if (!due.ok) return due; // falha de query = infra → propaga (tick loga e tenta no próximo ciclo)

    let expired = 0;
    const failures: { contractId: string; error: ExpireDueContractsError }[] = [];
    for (const contract of due.value) {
      const transition = Contract.expire(contract, now); // reusa a transição de domínio
      if (!transition.ok) {
        failures.push({ contractId: String(contract.id), error: transition.error });
        continue;
      }
      const saved = await deps.contractRepo.save(transition.value.contract, [
        transition.value.event,
      ]);
      if (!saved.ok) {
        failures.push({ contractId: String(contract.id), error: saved.error });
        continue; // isolamento: falha individual não aborta o lote (FR-007)
      }
      expired += 1;
    }
    return ok({ scanned: due.value.length, expired, failures });
  };
```

- **Idempotência**: contratos já expirados não voltam no `findExpirable` → 2ª execução = no-op (SC-004).
- **Isolamento de falha**: `save` que falha vira `failures[]`, não interrompe o lote (FR-007).

## 3. Helper de data — `plainDateInSaoPaulo`

Em `shared/kernel/plain-date.ts` (ou util local de contracts):

```ts
// Data-calendário corrente no fuso de Brasília (UTC-3 fixo; Brasil sem DST desde 2019).
export const plainDateInSaoPaulo = (now: Date): PlainDate =>
  fromDate(new Date(now.getTime() - 3 * 60 * 60 * 1000));
```

- **Boundary**: `2026-06-11T02:00:00Z` → `2026-06-10` (BRT 23:00 do dia 10); `2026-06-11T04:00:00Z` →
  `2026-06-11` (BRT 01:00 do dia 11).

## 4. Tick — `expire-scheduler.ts` (worker)

```ts
// Agenda o sweep a cada `intervalMs`, parando no abort. Loga a contagem por execução.
export const runExpireScheduler = async (
  deps: {
    expire: ReturnType<typeof expireDueContracts>;
    abortSignal: AbortSignal;
    log: (m: string) => void;
  },
  intervalMs: number,
): Promise<void> => {
  /* setInterval/await loop com guarda de abort; chama deps.expire() */
};
```

- Wirado em `worker/run.ts` sobre um `ContractRepository` Drizzle (mesmo pool do outbox) + `ClockReal`.
- Cadência via `CONTRACTS_EXPIRE_SWEEP_MS` (default 3.600.000) lida em `worker/config.ts`.
- Falha de um ciclo (ex.: `findExpirable` indisponível) é logada e o próximo tick tenta de novo.
