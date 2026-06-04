/**
 * Tipos do agregado `Supplier` (Fornecedor). Estados refinados por `status`
 * (Active/Inactive), igual ao `Financier`. Invariante "destino de pagamento":
 * ao menos um entre `bankAccount`/`pixKey` (imposta no `register`).
 *
 * `cnpj` reusa o VO `Cnpj` do kernel. `serviceCategory` literal (D2). Campos de
 * texto já validados na construção.
 *
 * Origem: legado `suppliers` (database.dbml:153-176).
 */

import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type { SupplierId } from './supplier-id.ts';
import type { ServiceCategory } from './service-category.ts';
import type { BankAccount, PixKey, BankAccountInput, PixKeyInput } from './payment-target.ts';

type SupplierCore = Readonly<{
  id: SupplierId;
  name: string;
  email: string;
  cnpj: Cnpj;
  corporateName: string;
  fantasyName: string;
  serviceCategory: ServiceCategory;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
}>;

export type ActiveSupplier = SupplierCore & Readonly<{ status: 'Active' }>;

export type InactiveSupplier = SupplierCore & Readonly<{ status: 'Inactive'; deactivatedAt: Date }>;

export type Supplier = ActiveSupplier | InactiveSupplier;

export type RegisterSupplierInput = Readonly<{
  id: SupplierId;
  name: string;
  email: string;
  cnpj: string;
  corporateName: string;
  fantasyName: string;
  serviceCategory: string;
  bankAccount: BankAccountInput | null;
  pixKey: PixKeyInput | null;
  registeredAt: Date;
}>;

/** Payload de edição (PUT total): campos cadastrais + payment target. `id`/estado preservados. */
export type EditSupplierInput = Readonly<{
  name: string;
  email: string;
  cnpj: string;
  corporateName: string;
  fantasyName: string;
  serviceCategory: string;
  bankAccount: BankAccountInput | null;
  pixKey: PixKeyInput | null;
}>;

// Reidratação pela borda (mapper): `id`/`cnpj`/`serviceCategory`/payment target já
// chegam tipados (revalidados no mapper). `rehydrate` só reconstrói o estado e
// reaplica as invariantes (destino de pagamento; Inactive exige deactivatedAt).
export type RehydrateSupplierInput = Readonly<{
  id: SupplierId;
  name: string;
  email: string;
  cnpj: Cnpj;
  corporateName: string;
  fantasyName: string;
  serviceCategory: ServiceCategory;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
  status: 'Active' | 'Inactive';
  deactivatedAt: Date | null;
}>;
