/**
 * PARTNERS-CONTRACTOR-READ-PORT — Projeção (VIEW plana) do contratado exposta a
 * outros módulos pela public-api (ADR-0006/ADR-0014). NUNCA expõe o agregado
 * interno nem `par_*` cru — só os campos read-only que a tela de detalhe do
 * contrato precisa (rota gorda ADR-0032; R5 do po-feedback/0001).
 *
 * Mappers PUROS, sem IO: `(aggregate, updatedAt) → View`. O `updatedAt` é injetado
 * pela borda (vem do row `par_*.updated_at`; o agregado puro não o carrega).
 *
 * Bancário/PIX read-only existem só em `Supplier` (o domínio só modela destino de
 * pagamento em supplier — `payment-target.ts`). A View reflete o domínio.
 */

import type { Supplier } from '../domain/supplier/types.ts';
import type { Financier } from '../domain/financier/types.ts';
import type { Collaborator } from '../domain/collaborator/types.ts';
import type { Act } from '../domain/act/types.ts';
import type { BankAccount, PixKey } from '../domain/supplier/payment-target.ts';
import type { ServiceCategory } from '../domain/supplier/service-category.ts';

export type SupplierView = Readonly<{
  type: 'supplier';
  id: string;
  name: string;
  email: string;
  document: string;
  serviceCategory: ServiceCategory;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
  updatedAt: Date;
}>;

export type FinancierView = Readonly<{
  type: 'financier';
  id: string;
  name: string;
  document: string;
  corporateName: string;
  legalRepresentative: string;
  telephone: string;
  address: string;
  updatedAt: Date;
}>;

export type CollaboratorView = Readonly<{
  type: 'collaborator';
  id: string;
  name: string;
  email: string;
  document: string;
  role: string;
  occupationArea: string;
  updatedAt: Date;
}>;

// `Act` é placeholder (ADR-0036), clone enxuto de Collaborator — a View espelha
// `CollaboratorView` (mesmos campos de pré-cadastro) até o BC de Act ganhar forma própria.
export type ActView = Readonly<{
  type: 'act';
  id: string;
  name: string;
  email: string;
  document: string;
  role: string;
  occupationArea: string;
  updatedAt: Date;
}>;

/** União discriminada por `type` — útil para a borda tratar contratados uniformemente. */
export type ContractorView = SupplierView | FinancierView | CollaboratorView | ActView;

export const supplierToView = (supplier: Supplier, updatedAt: Date): SupplierView => ({
  type: 'supplier',
  id: supplier.id as unknown as string,
  name: supplier.name,
  email: supplier.email,
  document: supplier.cnpj as unknown as string,
  serviceCategory: supplier.serviceCategory,
  bankAccount: supplier.bankAccount,
  pixKey: supplier.pixKey,
  updatedAt,
});

export const financierToView = (financier: Financier, updatedAt: Date): FinancierView => ({
  type: 'financier',
  id: financier.id as unknown as string,
  name: financier.name,
  document: financier.cnpj as unknown as string,
  corporateName: financier.corporateName,
  legalRepresentative: financier.legalRepresentative,
  telephone: financier.telephone,
  address: financier.address,
  updatedAt,
});

export const collaboratorToView = (
  collaborator: Collaborator,
  updatedAt: Date,
): CollaboratorView => ({
  type: 'collaborator',
  id: collaborator.id as unknown as string,
  name: collaborator.name,
  email: collaborator.email,
  document: collaborator.cpf as unknown as string,
  role: collaborator.role,
  occupationArea: collaborator.occupationArea,
  updatedAt,
});

export const actToView = (act: Act, updatedAt: Date): ActView => ({
  type: 'act',
  id: act.id as unknown as string,
  name: act.name,
  email: act.email,
  document: act.cpf as unknown as string,
  role: act.role,
  occupationArea: act.occupationArea as unknown as string,
  updatedAt,
});
