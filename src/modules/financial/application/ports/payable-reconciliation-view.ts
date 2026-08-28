import type { Result } from '../../../../shared/primitives/result.ts';
import type { PayableSnapshot } from '../../domain/reconciliation/types.ts';

// Read port dos títulos para a conciliação: snapshots (validação do domínio `confirm`) e a lista de
// títulos `Paid` (GET /payables?status=Paid). Read-only — as mutações de status são do ReconciliationRepository.
export type PayableReconciliationViewError = 'payable-view-failure';

export type PaidPayableView = Readonly<{
  id: string;
  documentId: string;
  valueCents: number;
  dueDate: Date;
  paymentMethod: string;
  // M2/#268: a classificação VIGENTE do título, de volta na leitura. Ela é gravada desde sempre e
  // nunca era devolvida — a coluna CATEGORIA da aba "Buscar/Criar vários" mostrava "—" mesmo com o
  // documento classificado, e é isso que fazia parecer que a categorização se perdia.
  //
  // `kind` acompanha porque a tela precisa saber quem é fonte de reclassificação e quem é alvo
  // (RN-M2-11): o botão "Editar" só habilita com título `Parent` na seleção.
  kind: string;
  programRef: string | null;
  budgetPlanRef: string | null;
  costCenterRef: string | null;
  categoryRef: string | null;
  subcategoryRef: string | null;
}>;

export type PayableReconciliationView = Readonly<{
  findSnapshotsByIds: (
    ids: readonly string[],
  ) => Promise<Result<readonly PayableSnapshot[], PayableReconciliationViewError>>;
  searchPaid: () => Promise<Result<readonly PaidPayableView[], PayableReconciliationViewError>>;
}>;
