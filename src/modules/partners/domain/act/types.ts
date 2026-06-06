/**
 * Tipos do agregado `Act` (placeholder ADR-0036). Espelha o núcleo do Collaborator —
 * apenas os 7 campos de pré-cadastro + status duplo (registrationStatus + soft-delete).
 *
 * Sem campos pessoais (27 campos do complete-registration), sem disableBy obrigatório
 * (deactivate é simples: Active → Inactive + deactivatedAt sem motivo).
 */

import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type { ActId } from './act-id.ts';
import type { OccupationArea } from '../collaborator/occupation-area.ts';
import type { EmploymentRelationship } from '../collaborator/employment-relationship.ts';

export type RegistrationStatus = 'PreRegistration' | 'Complete';

type ActCore = Readonly<{
  id: ActId;
  name: string;
  email: string;
  cpf: Cpf;
  occupationArea: OccupationArea;
  role: string;
  startOfContract: Date;
  employmentRelationship: EmploymentRelationship;
  registrationStatus: RegistrationStatus;
}>;

export type ActiveAct = ActCore & Readonly<{ status: 'Active' }>;

export type InactiveAct = ActCore & Readonly<{ status: 'Inactive'; deactivatedAt: Date }>;

export type Act = ActiveAct | InactiveAct;

export type RegisterActInput = Readonly<{
  id: ActId;
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string;
  startOfContract: Date;
  employmentRelationship: string;
  registeredAt: Date;
}>;

export type EditActInput = Readonly<{
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string;
  startOfContract: Date;
  employmentRelationship: string;
}>;

export type RehydrateActInput = ActCore &
  Readonly<{
    status: 'Active' | 'Inactive';
    deactivatedAt: Date | null;
  }>;
