/**
 * Tipos do agregado `Act` — **Acordo de Cooperação Técnica** firmado com uma
 * instituição parceira (CNPJ). Reescreve o placeholder pessoa-física (EPIC-PAR-ACT-ACORDO).
 *
 * Estados refinados por `status` (Active/Inactive), como o `Supplier`. Invariante de
 * **repasse condicional**: `hasFinancialTransfer = true` ⇒ ao menos um entre
 * `bankAccount`/`pixKey` (imposta no `register`/`edit`). `validity` é um `Period` (kind
 * `Fixed`). `cnpj` reusa o VO do kernel; `BankAccount`/`PixKey` reusam o VO do Supplier.
 */

import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type { Period } from '#src/shared/kernel/period.ts';
import type { ActId } from './act-id.ts';
import type { ActNumber } from './act-number.ts';
import type { OccupationArea } from '../collaborator/occupation-area.ts';
import type {
  BankAccount,
  PixKey,
  BankAccountInput,
  PixKeyInput,
} from '../supplier/payment-target.ts';

type ActCore = Readonly<{
  id: ActId;
  actNumber: ActNumber;
  name: string; // objeto/título do acordo
  email: string; // contato
  cnpj: Cnpj;
  corporateName: string; // razão social
  fantasyName: string; // nome fantasia/sigla
  occupationArea: OccupationArea; // área de atuação
  legalRepresentative: string; // representante legal / ponto de contato (ex-`role`)
  validity: Period; // vigência (startDate + endDate)
  hasFinancialTransfer: boolean;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
}>;

export type ActiveAct = ActCore & Readonly<{ status: 'Active' }>;

export type InactiveAct = ActCore & Readonly<{ status: 'Inactive'; deactivatedAt: Date }>;

export type Act = ActiveAct | InactiveAct;

export type RegisterActInput = Readonly<{
  id: ActId;
  actNumber: string;
  name: string;
  email: string;
  cnpj: string;
  corporateName: string;
  fantasyName: string;
  occupationArea: string;
  legalRepresentative: string;
  startDate: string; // ISO YYYY-MM-DD — vigência
  endDate: string; // ISO YYYY-MM-DD — vigência
  hasFinancialTransfer: boolean;
  bankAccount: BankAccountInput | null;
  pixKey: PixKeyInput | null;
  registeredAt: Date;
}>;

/** Payload de edição (PUT total): campos do acordo + payment target. `id`/estado preservados. */
export type EditActInput = Readonly<{
  actNumber: string;
  name: string;
  email: string;
  cnpj: string;
  corporateName: string;
  fantasyName: string;
  occupationArea: string;
  legalRepresentative: string;
  startDate: string;
  endDate: string;
  hasFinancialTransfer: boolean;
  bankAccount: BankAccountInput | null;
  pixKey: PixKeyInput | null;
}>;

// Reidratação pela borda (mapper): `id`/`actNumber`/`cnpj`/`occupationArea`/`validity`/payment
// target já chegam tipados (revalidados no mapper). `rehydrate` reconstrói o estado e reaplica
// a invariante de repasse; Inactive exige `deactivatedAt`.
export type RehydrateActInput = ActCore &
  Readonly<{
    status: 'Active' | 'Inactive';
    deactivatedAt: Date | null;
  }>;
