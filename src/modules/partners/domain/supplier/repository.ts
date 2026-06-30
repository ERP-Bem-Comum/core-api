/**
 * Port `SupplierRepository` — contrato de persistência do agregado `Supplier`.
 *
 * Posicionado em `domain/supplier/`: a unicidade de CNPJ é invariante do agregado
 * (legado `suppliers.cnpj` UNIQUE) e entra na superfície do port como erro
 * `supplier-cnpj-duplicate`. Espelha `FinancierRepository`.
 *
 * Outbox (PAR-SUPPLIER-EVENTS / ADR-0043): `save` recebe os eventos de domínio
 * emitidos pela operação e os publica no outbox `par_outbox` na MESMA transação da
 * escrita do agregado (atomicidade — ADR-0015). O adapter monta o payload de
 * integração a partir do snapshot do agregado (`supplier-outbox.mapper.ts`). Callers
 * sem eventos a publicar passam `[]`.
 *
 * Adapters esperados:
 *   - `InMemorySupplierStore` (este ticket) — teste/CLI.
 *   - `DrizzleSupplierRepository` (futuro) — MySQL `par_suppliers`, UNIQUE em `cnpj` (ADR-0020).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type { SupplierId } from './supplier-id.ts';
import type { Supplier } from './types.ts';
import type { SupplierEvent } from './events.ts';

export type SupplierRepositoryError =
  | 'supplier-repo-unavailable' // transient (timeout/conexão) no adapter real
  | 'supplier-cnpj-duplicate'; // CNPJ já usado por outro Supplier

export type SupplierRepository = Readonly<{
  findById: (id: SupplierId) => Promise<Result<Supplier | null, SupplierRepositoryError>>;
  findByCnpj: (cnpj: Cnpj) => Promise<Result<Supplier | null, SupplierRepositoryError>>;
  list: () => Promise<Result<readonly Supplier[], SupplierRepositoryError>>;
  save: (
    supplier: Supplier,
    events: readonly SupplierEvent[],
  ) => Promise<Result<void, SupplierRepositoryError>>;
}>;
