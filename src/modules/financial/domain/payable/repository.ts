/**
 * Port `PayableRepository` — contrato de persistência do agregado `Payable`.
 *
 * Posicionado em `domain/payable/` pelo **Critério H2** (§3.H.2 DO H§34):
 * este port é ditado pelas invariâncias do agregado (R2 do handbook —
 * Anti-Duplicidade FITID — entra na superfície do port como erro).
 *
 * **Fonte de negócio (handbook):**
 *   - `handbook/domain/04-titulos-liquidacao-context.md:57` — **R2 (Anti-
 *     Duplicidade FITID):** "O sistema deve recusar a importação de qualquer
 *     transação de extrato cujo FITID já tenha sido processado anteriormente."
 *     Enforce via `findByFitid` (consulta) + `save` retornando
 *     `payable-fitid-duplicate` quando outro Payable já consumiu o FITID.
 *
 * **Adapters esperados:**
 *   - `InMemoryPayableRepository` (este ticket) — para teste/CLI.
 *   - `DrizzlePayableRepository` (futuro) — adapter MySQL real via
 *     `drizzle-orm` + UNIQUE INDEX em `fin_payables.fitid` (ADR-0020).
 *
 * Pattern espelha `src/modules/contracts/domain/contract/repository.ts`.
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { FITID } from '../shared/fitid.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { Payable } from './types.ts';
import type { OutboxAppendError } from '../../application/ports/outbox.ts';
import type { FinancialModuleEvent } from '../../public-api/events.ts';

/**
 * Union de erros do repositório.
 *
 * Inclui `OutboxAppendError` (FIN-USECASE-APPROVE-PAYABLE) porque o adapter
 * persiste state + outbox na MESMA transação (ADR-0015 D2). Uma falha de
 * `outbox.append` é indistinguível de falha de `save` do ponto de vista do
 * use case — propagamos o erro do outbox como erro do repo.
 *
 * Pattern idêntico a `ContractRepositoryError` em `contracts/domain/contract/repository.ts`.
 */
export type PayableRepositoryError =
  | 'payable-repo-unavailable' // falha de conectividade/transient (timeout, network)
  | 'payable-repo-conflict' // optimistic lock / write conflict no adapter real
  | 'payable-fitid-duplicate' // R2 do handbook — FITID já consumido por outro Payable
  | OutboxAppendError; // ADR-0015 — falha de outbox no save atomico

export type PayableRepository = Readonly<{
  /**
   * Busca Payable por ID. `null` é o canônico "not found" (não-erro).
   */
  findById: (id: PayableId) => Promise<Result<Payable | null, PayableRepositoryError>>;

  /**
   * Busca o Payable que **consumiu** o FITID informado.
   *
   * Apenas `PaidFromBankPayable` e `SettledFromBankPayable` têm FITID — outras
   * variantes da union retornam `null` mesmo se o FITID fosse passado.
   *
   * Use case: adapter de Integração Bancária consulta antes de processar nova
   * transação de extrato (R2 — descarte silencioso se já existe).
   */
  findByFitid: (fitid: FITID) => Promise<Result<Payable | null, PayableRepositoryError>>;

  /**
   * Lista todos os Payables. MVP — paginação/filtro vem com use cases reais
   * que justifiquem (YAGNI).
   */
  list: () => Promise<Result<readonly Payable[], PayableRepositoryError>>;

  /**
   * Persiste (upsert por `id`) E enfileira eventos no outbox **na mesma operação**
   * (ADR-0015 D2 — state + outbox atomicamente).
   *
   * - Use case **não** chama `outbox.append` diretamente — apenas passa eventos
   *   produzidos pela operação de domínio (e.g., `Payable.approve` devolve
   *   `{ payable, event }` que o use case repassa: `repo.save(payable, [event])`).
   * - Lista vazia (`[]`) é no-op para o outbox — útil para testes da própria
   *   suite de persistência que não inspecionam eventos.
   *
   * Se o Payable é Bank-Paid/Settled e seu `fitid` já existe em **outro**
   * Payable, retorna `payable-fitid-duplicate` (defesa em profundidade contra
   * race entre `findByFitid` e `save`). Guard R2 vence o outbox — se duplicate,
   * nada é persistido.
   *
   * Adapter real (Drizzle/MySQL) implementa via:
   *   - UNIQUE INDEX em `fin_payables.fitid` (lista normativa ADR-0020).
   *   - SELECT-then-UPDATE-or-INSERT em transação (ADR-0020 §upsert estrito).
   *   - INSERT na tabela `fin_outbox` na MESMA transação do upsert do payable.
   */
  save: (
    payable: Payable,
    events: readonly FinancialModuleEvent[],
  ) => Promise<Result<void, PayableRepositoryError>>;
}>;
