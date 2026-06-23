import type { Result } from '../../../../shared/primitives/result.ts';
import type { PayableListFilter, PayableListItem, Page } from '../../domain/payable/query.ts';

// Read port da listagem de Contas a Pagar orientada a TÍTULO (#201/#221). Read-model leve: pai + filhos
// como itens distintos, cada um com status/vencimento próprios (base da baixa/conciliação por título).
export type PayableListViewError = 'payable-list-view-failure';

export type PayableListView = Readonly<{
  findPaged: (
    filter: PayableListFilter,
    page: number,
    pageSize: number,
  ) => Promise<Result<Page<PayableListItem>, PayableListViewError>>;
}>;
