import type { AmendmentId, ContractId } from '../shared/ids.ts';
import type { Money } from '../../../../shared/kernel/money.ts';
import type { Period } from '../../../../shared/kernel/period.ts';
import type { PlainDate } from '../../../../shared/kernel/plain-date.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

/**
 * Campos de **cadastro** — comuns a TODOS os estados, inclusive `Pending`.
 *
 * São os dados que o contrato carrega desde o registro inicial, antes de
 * qualquer efetividade. `signedAt` e a vigência efetiva NÃO entram aqui —
 * pertencem aos estados que já vigoram (ver `EffectiveContractCore`).
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md (DO D§20,
 * DO C§29: estados eliminam null; campos optional-as-state viram propriedade
 * do tipo refinado).
 */
type ContractRegistration = Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  originalValue: Money;
  originalPeriod: Period;
}>;

/**
 * Núcleo dos estados COM vigência efetiva (`Active`/`Expired`/`Terminated`).
 *
 * Adiciona, sobre o cadastro, os campos que só existem depois que o contrato
 * passou a vigorar (assinatura + estado vigente derivado). Por isso `Pending`
 * — que não tem efetividade (ADR-0023) — NÃO os possui.
 */
type EffectiveContractCore = ContractRegistration &
  Readonly<{
    signedAt: Date;
    currentValue: Money;
    currentPeriod: Period;
    homologatedAmendmentIds: readonly AmendmentId[];
  }>;

/**
 * Tipo refinado: contrato `Pendente` (estado inicial sem documento assinado).
 *
 * ADR-0023: cadastrado mas SEM efetividade — não inicia vigência, não aceita
 * aditivos, sem vínculo financeiro. Carrega apenas os campos de cadastro
 * (`ContractRegistration`); `signedAt`/`currentValue`/`currentPeriod`/
 * `homologatedAmendmentIds` simplesmente NÃO existem neste subtipo (acessá-los
 * é erro de compilação). A transição `activate` (próximo ticket) leva a `Active`.
 */
export type PendingContract = ContractRegistration & Readonly<{ status: 'Pending' }>;

/**
 * Tipo refinado: contrato em vigor.
 *
 * `endedAt` está AUSENTE (nem `null`, nem `undefined`) — o campo simplesmente
 * não existe neste subtipo. Um `ActiveContract` retornado de `Contract.create`
 * ou `Contract.parseActive` garante estaticamente que o contrato está ativo,
 * sem checagem extra em runtime (DO D§20, DO D§21).
 */
export type ActiveContract = EffectiveContractCore & Readonly<{ status: 'Active' }>;

/**
 * Tipo refinado: contrato expirado (estado terminal).
 *
 * `endedAt` é obrigatório e tipado como `Date` — não pode ser `null`
 * (DO C§29: "campos optional-as-state viram propriedade do tipo refinado").
 */
export type ExpiredContract = EffectiveContractCore &
  Readonly<{ status: 'Expired'; endedAt: Date }>;

/**
 * Tipo refinado: contrato terminado por motivo de negócio (estado terminal).
 *
 * Assim como `ExpiredContract`, carrega `endedAt: Date` obrigatório.
 */
export type TerminatedContract = EffectiveContractCore &
  Readonly<{ status: 'Terminated'; endedAt: Date }>;

/**
 * Union discriminada do agregado `Contract` (o tipo público).
 *
 * O discriminador `status` permite narrowing automático pelo compilador:
 * dentro de `if (c.status === 'Active')`, TS sabe que `c` é `ActiveContract`.
 */
export type Contract = PendingContract | ActiveContract | ExpiredContract | TerminatedContract;

/**
 * Estados COM vigência efetiva — todos exceto `Pending`.
 *
 * Usado por operações que só fazem sentido sobre um contrato já vigente (ex.:
 * persistência via `ContractRepository.save`). A persistência de `PendingContract`
 * depende de migration de schema (colunas `signedAt`/`current*` nuláveis) e entra
 * num ticket próprio (ADR-0023, plano de implementação) — até lá, o tipo impede
 * salvar um contrato Pendente.
 */
export type EffectiveContract = ActiveContract | ExpiredContract | TerminatedContract;

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
export type ContractUpdate = Partial<Omit<EffectiveContractCore, ContractImmutableField>>;

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
  | { kind: 'PeriodExtension'; newEnd: PlainDate; amendmentId: AmendmentId }
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

/**
 * Input de criação de contrato `Pendente` (ADR-0023) — SEM `signedAt`.
 *
 * `createdAt` é o timestamp do evento `ContractCreated` (injetado pelo use case
 * via clock), já que `signedAt` não existe num contrato que ainda não foi assinado.
 */
export type CreatePendingContractInput = Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  originalValue: Money;
  originalPeriod: Period;
  createdAt: Date;
}>;
