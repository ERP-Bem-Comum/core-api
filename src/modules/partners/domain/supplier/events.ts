import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type { SupplierId } from './supplier-id.ts';

// Eventos do agregado `Supplier`. PascalCase passado; `occurredAt` injetado.

export type SupplierEvent = Readonly<
  | { type: 'SupplierRegistered'; supplierId: SupplierId; cnpj: Cnpj; occurredAt: Date }
  | { type: 'SupplierDeactivated'; supplierId: SupplierId; occurredAt: Date }
  | { type: 'SupplierReactivated'; supplierId: SupplierId; occurredAt: Date }
>;
