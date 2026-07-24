import type { Result } from '../../../../shared/primitives/result.ts';
import type { PayableListFilter, PayableListItem, Page } from '../../domain/payable/query.ts';
import type { DocumentStatus } from '../../domain/document/types.ts';

// Read port da listagem de Contas a Pagar orientada a TÍTULO (#201/#221). Read-model leve: pai + filhos
// como itens distintos, cada um com status/vencimento próprios (base da baixa/conciliação por título).
export type PayableListViewError = 'payable-list-view-failure';

// #536: contagem agregada de títulos por status (chips do grid). `total` = todos os status; `byStatus`
// só carrega os status presentes (ausente = 0 na leitura do front).
export type PayableStatusCounts = Readonly<{
  total: number;
  byStatus: Readonly<Partial<Record<DocumentStatus, number>>>;
}>;

export type PayableListView = Readonly<{
  findPaged: (
    filter: PayableListFilter,
    page: number,
    pageSize: number,
  ) => Promise<Result<Page<PayableListItem>, PayableListViewError>>;
  // #536: 1 query `GROUP BY status` — o filtro NÃO deve trazer `status` (queremos o breakdown completo).
  countByStatus: (
    filter: PayableListFilter,
  ) => Promise<Result<PayableStatusCounts, PayableListViewError>>;
}>;
