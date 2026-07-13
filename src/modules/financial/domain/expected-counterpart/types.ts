import type { CedenteAccountId } from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { Movement } from '#src/modules/financial/domain/statement/types.ts';
import type { ExpectedCounterpartId } from './expected-counterpart-id.ts';

// Contrapartida esperada (#269): a perna esperada de uma transferência A→B na conta de DESTINO (B).
// Agregado próprio — não uma StatementTransaction marcada — porque é uma *expectativa*, não um *fato*
// de extrato (Vernon, IDDD p.450, "Model True Invariants in Consistency Boundaries"). Ciclo de vida
// próprio: Pending → Matched | Discarded.

export type ExpectedCounterpartStatus = 'Pending' | 'Matched' | 'Discarded';
// MVP (Q3): só Transferência conta↔conta. Investment/Redemption = follow-up (mesmo mecanismo).
export type ExpectedCounterpartType = 'Transfer';

export type ExpectedCounterpart = Readonly<{
  id: ExpectedCounterpartId;
  destinationAccountRef: CedenteAccountId; // conta B (onde a perna é esperada)
  originAccountRef: CedenteAccountId; // conta A (rótulo "outra perna de [Conta A]")
  originReconciliationRef: ReconciliationId; // vínculo à perna de origem (A)
  originTransactionRef: string; // transação de origem conciliada em A
  type: ExpectedCounterpartType;
  movement: Movement; // OPOSTO ao da origem (Debit em A → Credit esperado em B)
  valueCents: bigint; // = valor da perna de origem
  expectedDate: Date; // ~ data da perna de origem
  status: ExpectedCounterpartStatus;
  matchedTransactionRef: string | null; // transação real de B que a consumiu (só em Matched)
}>;

export type ExpectedCounterpartError =
  | 'counterpart-value-invalid'
  | 'counterpart-same-account'
  | 'counterpart-not-pending'
  | 'counterpart-already-matched';
