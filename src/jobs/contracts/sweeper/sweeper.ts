import { type Result, ok, isErr } from '#src/shared/primitives/result.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '#src/modules/contracts/domain/contract/repository.ts';
import type { Clock } from '#src/shared/ports/clock.ts';

// Sweep de auto-expiração — lógica PURA do job (CTR-AUTO-EXPIRE / issue #39 · ADR-0041).
// O job é o Imperative Shell (repo async + Clock port); a regra D+1 vive no Functional Core
// (`Contract.expire`). Declara só os métodos do repositório que usa (Pick) — baixo acoplamento.

export type SweepDeps = Readonly<{
  contractRepo: Pick<ContractRepository, 'findExpirable' | 'save'>;
  clock: Clock;
}>;

export type SweepConfig = Readonly<{
  /** Teto do lote por execução (pré-fetch). O adapter usa `LIMIT` + `FOR UPDATE SKIP LOCKED`. */
  batchSize: number;
}>;

export type SweepResult = Readonly<{
  /** Contratos efetivamente transicionados para `Expired`. */
  expired: number;
  /** Contratos lidos do `findExpirable` (elegíveis pré-guarda). */
  scanned: number;
}>;

/**
 * Aplica o auto-expire (`Active → Expired`) nos contratos elegíveis.
 *
 * Sequência (ports-and-adapters): buscar (`findExpirable` na timezone do negócio) → operar
 * (`Contract.expire`, guarda D+1) → persistir estado + evento `ContractEnded{kind:Expired}` no
 * **OUTBOX** via `repo.save` (mesma transação — ADR-0015).
 *
 * **Transporte trocável:** o evento NUNCA é publicado direto. A entrega real (log/HTTP/Redis/NATS/
 * RabbitMQ) é responsabilidade do `EventDelivery` port do outbox-worker — trocar o adapter de
 * delivery não toca este job. O disparo (cron one-shot hoje; fila de jobs no futuro — ADR-0041)
 * também é externo: `runSweep` é agnóstico a quem o chama.
 */
export const runSweep = async (
  deps: SweepDeps,
  config: SweepConfig,
): Promise<Result<SweepResult, ContractRepositoryError>> => {
  const cutoff = deps.clock.today();
  const found = await deps.contractRepo.findExpirable(cutoff, config.batchSize);
  if (isErr(found)) return found;

  const at = deps.clock.now();
  let expired = 0;
  for (const active of found.value) {
    const transition = Contract.expire(active, at);
    // Corrida benigna: um elegível que um aditivo de prazo homologado estendeu entre o SELECT e
    // o `expire` cai na guarda D+1 — pula sem derrubar o lote (idempotência — Newman).
    if (isErr(transition)) continue;
    const saved = await deps.contractRepo.save(transition.value.contract, [transition.value.event]);
    if (isErr(saved)) return saved;
    expired += 1;
  }

  return ok({ expired, scanned: found.value.length });
};
