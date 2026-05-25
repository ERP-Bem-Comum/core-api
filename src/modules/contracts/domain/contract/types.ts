import type { AmendmentId, ContractId } from '../shared/ids.ts';
import type { Money } from '../../../../shared/kernel/money.ts';
import type { Period } from '../../../../shared/kernel/period.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

/**
 * Campos comuns a todos os estados do agregado `Contract`.
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md
 *   - DO D§20: "Um tipo refinado por estado de agregado."
 *   - DO C§29: "Estados ELIMINAM `null` — campos optional-as-state viram
 *     propriedade obrigatória do tipo refinado."
 */
type ContractCore = Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAt: Date;
  originalValue: Money;
  originalPeriod: Period;
  currentValue: Money;
  currentPeriod: Period;
  homologatedAmendmentIds: readonly AmendmentId[];
}>;

/**
 * Tipo refinado: contrato em vigor.
 *
 * `endedAt` está AUSENTE (nem `null`, nem `undefined`) — o campo simplesmente
 * não existe neste subtipo. Um `ActiveContract` retornado de `Contract.create`
 * ou `Contract.parseActive` garante estaticamente que o contrato está ativo,
 * sem checagem extra em runtime (DO D§20, DO D§21).
 */
export type ActiveContract = ContractCore & Readonly<{ status: 'Active' }>;

/**
 * Tipo refinado: contrato expirado (estado terminal).
 *
 * `endedAt` é obrigatório e tipado como `Date` — não pode ser `null`
 * (DO C§29: "campos optional-as-state viram propriedade do tipo refinado").
 */
export type ExpiredContract = ContractCore & Readonly<{ status: 'Expired'; endedAt: Date }>;

/**
 * Tipo refinado: contrato terminado por motivo de negócio (estado terminal).
 *
 * Assim como `ExpiredContract`, carrega `endedAt: Date` obrigatório.
 */
export type TerminatedContract = ContractCore & Readonly<{ status: 'Terminated'; endedAt: Date }>;

/**
 * Union discriminada do agregado `Contract` (o tipo público).
 *
 * O discriminador `status` permite narrowing automático pelo compilador:
 * dentro de `if (c.status === 'Active')`, TS sabe que `c` é `ActiveContract`.
 */
export type Contract = ActiveContract | ExpiredContract | TerminatedContract;

/**
 * Status do agregado — derivado da union para compatibilidade com
 * `errors.ts` (payload de `ContractNotActive`) e formatters CLI.
 *
 * Transições válidas:
 *   - `Active`     → `Expired`    (via `Contract.expire`)
 *   - `Active`     → `Terminated` (via `Contract.terminate`)
 *   - `Expired`    → terminal
 *   - `Terminated` → terminal
 */
export type ContractStatus = Contract['status'];

/**
 * Campos imutáveis após a criação do contrato.
 *
 * Nunca entram em `ContractUpdate` — id, número sequencial, dados
 * de identificação e valores originais são fixados em `Contract.create`
 * e jamais editados por transição.
 */
type ContractImmutableField =
  | 'id'
  | 'sequentialNumber'
  | 'title'
  | 'objective'
  | 'signedAt'
  | 'originalValue'
  | 'originalPeriod';

/**
 * Patch parcial aceito por `updateContract`.
 *
 * Após CTR-DOMAIN-STATE-MACHINE-CONTRACT, **mudanças de `status` (e o
 * `endedAt` associado) NÃO entram aqui** — transições de estado passam
 * exclusivamente pelas operações refinadas (`Contract.expire`, `terminate`,
 * `applyHomologatedAdjustment`). `updateContract` cobre apenas os campos
 * mutáveis dentro da mesma variante do agregado.
 */
export type ContractUpdate = Partial<Omit<ContractCore, ContractImmutableField>>;

/**
 * Helper canônico de transição intra-variante (DO A§4 do master doc).
 *
 * Genérico `<T extends Contract>` preserva o subtipo refinado de `prev` no
 * retorno — `updateContract(activeContract, ...)` continua produzindo um
 * `ActiveContract`. Isto está alinhado com DO D§20 (transições preservam
 * tipo refinado) e CTR-DOMAIN-DEBRAND-AGG (sem `Brand` na casca, spread
 * preserva tipo sem casts).
 *
 * `immutable()` aplica `Object.freeze` shallow (DON'T B§5: não usar
 * `Object.freeze` direto no domínio — usar a facade).
 */
export const updateContract = <T extends Contract>(prev: T, patch: ContractUpdate): T =>
  immutable({ ...prev, ...patch });

export type ContractAdjustment = Readonly<
  | { kind: 'ValueIncrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'ValueDecrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'PeriodExtension'; newEnd: Date; amendmentId: AmendmentId }
  | { kind: 'Acknowledgment'; amendmentId: AmendmentId }
>;

export type CreateContractInput = Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAt: Date;
  originalValue: Money;
  originalPeriod: Period;
}>;
