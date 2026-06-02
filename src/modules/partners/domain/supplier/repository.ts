/**
 * Port `SupplierRepository` — contrato de persistência do agregado `Supplier`.
 *
 * Posicionado em `domain/supplier/`: a unicidade de CNPJ é invariante do agregado
 * (legado `suppliers.cnpj` UNIQUE) e entra na superfície do port como erro
 * `supplier-cnpj-duplicate`. Espelha `FinancierRepository`.
 *
 * Sem outbox nesta fase — Supplier não publica eventos cross-módulo ainda (YAGNI).
 *
 * Adapters esperados:
 *   - `InMemorySupplierStore` (este ticket) — teste/CLI.
 *   - `DrizzleSupplierRepository` (futuro) — MySQL `par_suppliers`, UNIQUE em `cnpj` (ADR-0020).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type { SupplierId } from './supplier-id.ts';
import type { Supplier } from './types.ts';

export type SupplierRepositoryError =
  | 'supplier-repo-unavailable' // transient (timeout/conexão) no adapter real
  | 'supplier-cnpj-duplicate'; // CNPJ já usado por outro Supplier

export type SupplierRepository = Readonly<{
  findById: (id: SupplierId) => Promise<Result<Supplier | null, SupplierRepositoryError>>;
  findByCnpj: (cnpj: Cnpj) => Promise<Result<Supplier | null, SupplierRepositoryError>>;
  list: () => Promise<Result<readonly Supplier[], SupplierRepositoryError>>;
  save: (supplier: Supplier) => Promise<Result<void, SupplierRepositoryError>>;
}>;
