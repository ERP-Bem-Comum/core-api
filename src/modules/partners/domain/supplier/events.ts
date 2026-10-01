import type { SupplierId } from './supplier-id.ts';
import type { SupplierDocument } from './supplier-document.ts';

// Eventos do agregado `Supplier`. PascalCase passado; `occurredAt` injetado.
// `SupplierRegistered.document` é CPF ou CNPJ (#1022). Evento de DOMÍNIO, nunca serializado:
// o contrato de integração com o `financial` é montado do snapshot do agregado e já se chama
// `document` desde o ADR-0043 (`supplier-outbox.mapper.ts`).

export type SupplierEvent = Readonly<
  | {
      type: 'SupplierRegistered';
      supplierId: SupplierId;
      document: SupplierDocument;
      occurredAt: Date;
    }
  | { type: 'SupplierDeactivated'; supplierId: SupplierId; occurredAt: Date }
  | { type: 'SupplierReactivated'; supplierId: SupplierId; occurredAt: Date }
  | { type: 'SupplierEdited'; supplierId: SupplierId; occurredAt: Date }
>;
