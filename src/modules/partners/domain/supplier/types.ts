/**
 * Tipos do agregado `Supplier` (Fornecedor). Estados refinados por `status`
 * (Active/Inactive), igual ao `Financier`. Invariante "destino de pagamento":
 * ao menos um entre `bankAccount`/`pixKey` (imposta no `register`).
 *
 * Identidade PF × PJ (#1022) é union discriminada por `personType`: a pessoa física
 * (CPF) NÃO TEM razão social nem nome fantasia — os campos não existem no tipo, em vez
 * de existirem vazios. Só a pessoa jurídica (CNPJ) os carrega, e obrigatórios.
 * `serviceCategory` literal (D2). Campos de texto já validados na construção.
 *
 * Origem: legado `suppliers` (database.dbml:153-176).
 */

import type { SupplierId } from './supplier-id.ts';
import type { ServiceCategory } from './service-category.ts';
import type { ServiceRating } from './service-rating.ts';
import type { CnpjDocument, CpfDocument, SupplierDocument } from './supplier-document.ts';
import type {
  BankAccount,
  PixKey,
  BankAccountInput,
  PixKeyInput,
} from '../shared/payment-target.ts';

/** Pessoa física — identificada por CPF; sem razão social e sem nome fantasia. */
export type IndividualIdentity = Readonly<{ personType: 'individual'; document: CpfDocument }>;

/** Pessoa jurídica — identificada por CNPJ; razão social e nome fantasia obrigatórios. */
export type CompanyIdentity = Readonly<{
  personType: 'company';
  document: CnpjDocument;
  corporateName: string;
  fantasyName: string;
}>;

export type SupplierIdentity = IndividualIdentity | CompanyIdentity;

type SupplierCore = Readonly<{
  id: SupplierId;
  name: string;
  email: string;
  identity: SupplierIdentity;
  serviceCategory: ServiceCategory;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
  // Avaliação do prestador (opcional, independente do cadastro). `serviceRating` é Standard
  // Type (VO); `ratingComment` é texto livre. Ambos `null` quando não avaliado.
  serviceRating: ServiceRating | null;
  ratingComment: string | null;
}>;

export type ActiveSupplier = SupplierCore & Readonly<{ status: 'Active' }>;

export type InactiveSupplier = SupplierCore & Readonly<{ status: 'Inactive'; deactivatedAt: Date }>;

export type Supplier = ActiveSupplier | InactiveSupplier;

// Na entrada, `corporateName`/`fantasyName` chegam crus e opcionais: quem decide se podem
// ou devem existir é o documento (PF recusa preenchidos; PJ exige). Ausência é `null`.
export type RegisterSupplierInput = Readonly<{
  id: SupplierId;
  name: string;
  email: string;
  document: string;
  corporateName: string | null;
  fantasyName: string | null;
  serviceCategory: string;
  bankAccount: BankAccountInput | null;
  pixKey: PixKeyInput | null;
  serviceRating?: string | null;
  ratingComment?: string | null;
  registeredAt: Date;
}>;

/** Payload de edição (PUT total): campos cadastrais + payment target. `id`/estado preservados. */
export type EditSupplierInput = Readonly<{
  name: string;
  email: string;
  document: string;
  corporateName: string | null;
  fantasyName: string | null;
  serviceCategory: string;
  bankAccount: BankAccountInput | null;
  pixKey: PixKeyInput | null;
  serviceRating?: string | null;
  ratingComment?: string | null;
}>;

// Reidratação pela borda (mapper): `id`/`document`/`serviceCategory`/payment target já
// chegam tipados (revalidados no mapper). `rehydrate` só reconstrói o estado e
// reaplica as invariantes (identidade PF × PJ; destino de pagamento; Inactive exige deactivatedAt).
export type RehydrateSupplierInput = Readonly<{
  id: SupplierId;
  name: string;
  email: string;
  document: SupplierDocument;
  corporateName: string | null;
  fantasyName: string | null;
  serviceCategory: ServiceCategory;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
  serviceRating: ServiceRating | null;
  ratingComment: string | null;
  status: 'Active' | 'Inactive';
  deactivatedAt: Date | null;
}>;
