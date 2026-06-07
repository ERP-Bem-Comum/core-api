/**
 * Composição de leitura do agregador `GET /api/v1/partners` na borda (003-partners-aggregator-export).
 * Projeta os 4 tipos de parceiro (`*ReadRecord`) numa lista plana homogênea `PartnerListItem`,
 * filtra (`search`/`type`), faz merge, ordena `(name, type, id)` e pagina — tudo IN-MEMORY,
 * espelhando `supplier-list-query.ts`. Composição read-side (CQRS, Vernon p.193); não expõe o
 * agregado interno (ADR-0014). Funções puras, sem IO.
 *
 * Safety cap `MAX_TOTAL`: a soma dos 4 readers acima do teto vira `err('partners-aggregate-too-large')`
 * (→ 503 na borda) — evita OOM até a paginação no DB ser justificada por volume/SLO.
 */

import { ok, err, type Result } from '#src/shared/primitives/result.ts';
import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import type { FinancierReadRecord } from '#src/modules/partners/application/ports/financier-reader.ts';
import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import type { ActReadRecord } from '#src/modules/partners/application/ports/act-reader.ts';

export type PartnerType = 'supplier' | 'financier' | 'collaborator' | 'act';

export type PartnerListItem = Readonly<{
  type: PartnerType;
  id: string;
  name: string;
  document: string;
  active: boolean;
}>;

export type PartnersPageMeta = Readonly<{
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}>;

export type PartnersPage = Readonly<{ items: readonly PartnerListItem[]; meta: PartnersPageMeta }>;

export type PartnersAggregateError = 'partners-aggregate-too-large';

export type PartnerRecords = Readonly<{
  suppliers: readonly SupplierReadRecord[];
  financiers: readonly FinancierReadRecord[];
  collaborators: readonly CollaboratorReadRecord[];
  acts: readonly ActReadRecord[];
}>;

export type PartnersAggregateQuery = Readonly<{
  search?: string | undefined;
  type?: PartnerType | undefined;
  page: number;
  limit: number;
}>;

const MAX_TOTAL_DEFAULT = 10_000;

// Projeções: extraem id/name/document/active do agregado dentro de cada ReadRecord.
// `as unknown as string` desbranda id/cnpj/cpf (mesmo padrão de `contractor-view.mapper.ts`).
const supplierItem = (r: SupplierReadRecord): PartnerListItem => ({
  type: 'supplier',
  id: r.supplier.id as unknown as string,
  name: r.supplier.name,
  document: r.supplier.cnpj as unknown as string,
  active: r.supplier.status === 'Active',
});

const financierItem = (r: FinancierReadRecord): PartnerListItem => ({
  type: 'financier',
  id: r.financier.id as unknown as string,
  name: r.financier.name,
  document: r.financier.cnpj as unknown as string,
  active: r.financier.status === 'Active',
});

const collaboratorItem = (r: CollaboratorReadRecord): PartnerListItem => ({
  type: 'collaborator',
  id: r.collaborator.id as unknown as string,
  name: r.collaborator.name,
  document: r.collaborator.cpf as unknown as string,
  active: r.collaborator.status === 'Active',
});

const actItem = (r: ActReadRecord): PartnerListItem => ({
  type: 'act',
  id: r.act.id as unknown as string,
  name: r.act.name,
  document: r.act.cpf as unknown as string,
  active: r.act.status === 'Active',
});

const byNameTypeId = (a: PartnerListItem, b: PartnerListItem): number => {
  const n = a.name.localeCompare(b.name);
  if (n !== 0) return n;
  const t = a.type.localeCompare(b.type);
  if (t !== 0) return t;
  return a.id.localeCompare(b.id);
};

const matchesSearch = (item: PartnerListItem, term: string): boolean =>
  item.name.toLowerCase().includes(term) || item.document.toLowerCase().includes(term);

export const aggregatePartners = (
  records: PartnerRecords,
  query: PartnersAggregateQuery,
  opts: Readonly<{ maxTotal?: number }> = {},
): Result<PartnersPage, PartnersAggregateError> => {
  const maxTotal = opts.maxTotal ?? MAX_TOTAL_DEFAULT;
  const total =
    records.suppliers.length +
    records.financiers.length +
    records.collaborators.length +
    records.acts.length;
  if (total > maxTotal) return err('partners-aggregate-too-large');

  const all: readonly PartnerListItem[] = [
    ...records.suppliers.map(supplierItem),
    ...records.financiers.map(financierItem),
    ...records.collaborators.map(collaboratorItem),
    ...records.acts.map(actItem),
  ];

  const byType = query.type === undefined ? all : all.filter((item) => item.type === query.type);

  const term = query.search?.trim().toLowerCase();
  const filtered =
    term === undefined || term === '' ? byType : byType.filter((item) => matchesSearch(item, term));

  const sorted = [...filtered].sort(byNameTypeId);
  const totalItems = sorted.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit);
  const start = (query.page - 1) * query.limit;
  const items = sorted.slice(start, start + query.limit);

  return ok({
    items,
    meta: {
      itemCount: items.length,
      totalItems,
      itemsPerPage: query.limit,
      totalPages,
      currentPage: query.page,
    },
  });
};
