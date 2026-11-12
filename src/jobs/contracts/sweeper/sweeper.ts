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
  /** Linhas elegíveis puladas por estarem corrompidas no banco (o adapter loga id e causa). */
  skipped: number;
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
  for (const active of found.value.contracts) {
    const transition = Contract.expire(active, at);
    // Corrida benigna: um elegível que um aditivo de prazo homologado estendeu entre o SELECT e
    // o `expire` cai na guarda D+1 — pula sem derrubar o lote (idempotência — Newman).
    if (isErr(transition)) continue;
    const saved = await deps.contractRepo.save(transition.value.contract, [transition.value.event]);
    if (isErr(saved)) return saved;
    expired += 1;
  }

  return ok({
    expired,
    scanned: found.value.contracts.length,
    skipped: found.value.unreadable.length,
  });
};

/** sysexits.h — dado de entrada incorreto: linha corrompida no banco. */
export const EX_DATAERR = 65;

/** Código de saída e mensagens do processo para o resultado de um sweep. */
export type SweepExit = Readonly<{ code: number; stdout: string | null; stderr: string | null }>;

/**
 * Traduz o resultado do sweep em código de saída. Linha pulada NÃO interrompe a expiração (os
 * legíveis já foram processados), mas sai com `EX_DATAERR` para o cron alertar — distinto do `1` de
 * erro de infraestrutura, para o alerta dizer qual dos dois aconteceu.
 */
export const sweepExit = (result: Result<SweepResult, ContractRepositoryError>): SweepExit => {
  if (!result.ok) {
    const detail = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
    return { code: 1, stdout: null, stderr: `[contracts-sweeper] erro no sweep: ${detail}\n` };
  }
  const { expired, scanned, skipped } = result.value;
  const stdout = `[contracts-sweeper] expired=${expired} scanned=${scanned} skipped=${skipped}\n`;
  if (skipped === 0) return { code: 0, stdout, stderr: null };
  return {
    code: EX_DATAERR,
    stdout,
    stderr:
      `[contracts-sweeper] ${skipped} contrato(s) ignorado(s) por linha corrompida no banco; ` +
      'os demais foram processados. Corrija os dados: o id e a coluna de cada um estão no log ' +
      '[contract-repo:findExpirable].\n',
  };
};
