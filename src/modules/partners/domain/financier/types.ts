/**
 * Tipos do agregado `Financier` (Financiador).
 *
 * Estados refinados por `status` (DO D§20): `Active` | `Inactive`. O ciclo de
 * vida active/inactive é o "soft-delete" do módulo `partners` — desativar não
 * apaga, transiciona. `InactiveFinancier` carrega `deactivatedAt` (estados
 * eliminam optional — DO C§29).
 *
 * `cnpj` reusa o VO `Cnpj` do shared-kernel (ADR-0031 §4). Campos de texto são
 * `string` já validados (não-vazios) na construção via smart constructor.
 *
 * Origem: legado `financiers` (handbook/legacy_docs/database-er.md:175-184).
 */

import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type { FinancierId } from './financier-id.ts';
import type {
  BankAccount,
  PixKey,
  BankAccountInput,
  PixKeyInput,
} from '../shared/payment-target.ts';

// Banco/PIX são opcionais no Financier (sem a invariante "ao menos um destino" do Supplier).
type FinancierCore = Readonly<{
  id: FinancierId;
  name: string;
  corporateName: string;
  legalRepresentative: string;
  cnpj: Cnpj;
  telephone: string;
  address: string;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
}>;

export type ActiveFinancier = FinancierCore & Readonly<{ status: 'Active' }>;

export type InactiveFinancier = FinancierCore &
  Readonly<{ status: 'Inactive'; deactivatedAt: Date }>;

export type Financier = ActiveFinancier | InactiveFinancier;

/** Payload de edição (PUT total): campos cadastrais + payment target. `id`/estado preservados pela operação. */
export type EditFinancierInput = Readonly<{
  name: string;
  corporateName: string;
  legalRepresentative: string;
  cnpj: string;
  telephone: string;
  address: string;
  bankAccount?: BankAccountInput | null;
  pixKey?: PixKeyInput | null;
}>;

export type RegisterFinancierInput = Readonly<{
  id: FinancierId;
  name: string;
  corporateName: string;
  legalRepresentative: string;
  cnpj: string;
  telephone: string;
  address: string;
  bankAccount?: BankAccountInput | null;
  pixKey?: PixKeyInput | null;
  registeredAt: Date;
}>;

/**
 * Input de reidratação (a partir de dados persistidos). VOs já reconstruídos
 * pela borda (mapper): `id` e `cnpj` chegam tipados. `rehydrate` só valida a
 * coerência do estado (`status` × `deactivatedAt`) e monta o agregado.
 */
export type RehydrateFinancierInput = Readonly<{
  id: FinancierId;
  name: string;
  corporateName: string;
  legalRepresentative: string;
  cnpj: Cnpj;
  telephone: string;
  address: string;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
  status: 'Active' | 'Inactive';
  deactivatedAt: Date | null;
}>;
