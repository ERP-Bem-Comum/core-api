/**
 * Operações do agregado `Act` (placeholder ADR-0036). Consumir via `import * as Act`.
 * Clone enxuto do núcleo do Collaborator: 7 campos de pré-cadastro + status duplo.
 *
 *   - `register` — nasce Active + PreRegistration.
 *   - `edit` — reedita os 7 campos cadastrais; preserva registrationStatus + soft-delete.
 *   - `deactivate` — Active → Inactive (soft-delete simples, SEM disableBy obrigatório).
 *   - `reactivate` — Inactive → Active.
 *   - `rehydrate` — reconstrói estado persistido, sem evento.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as OccupationArea from '../collaborator/occupation-area.ts';
import * as EmploymentRelationship from '../collaborator/employment-relationship.ts';
import type { ActError } from './errors.ts';
import type { Act, ActiveAct, EditActInput, RegisterActInput, RehydrateActInput } from './types.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isBlank = (s: string): boolean => s.trim().length === 0;

export const register = (input: RegisterActInput): Result<{ act: ActiveAct }, ActError> => {
  if (isBlank(input.name)) return err('act-name-required');
  if (isBlank(input.email)) return err('act-email-required');
  if (!EMAIL_RE.test(input.email.trim())) return err('act-email-invalid');
  if (isBlank(input.role)) return err('act-role-required');

  const cpf = Cpf.parse(input.cpf);
  if (!cpf.ok) return err('invalid-cpf');

  const occupationArea = OccupationArea.parse(input.occupationArea);
  if (!occupationArea.ok) return occupationArea;

  const employmentRelationship = EmploymentRelationship.parse(input.employmentRelationship);
  if (!employmentRelationship.ok) return employmentRelationship;

  const act: ActiveAct = immutable({
    id: input.id,
    name: input.name.trim(),
    email: input.email.trim(),
    cpf: cpf.value,
    occupationArea: occupationArea.value,
    role: input.role.trim(),
    startOfContract: input.startOfContract,
    employmentRelationship: employmentRelationship.value,
    registrationStatus: 'PreRegistration',
    status: 'Active',
  });

  return ok({ act });
};

export const edit = (act: Act, input: EditActInput): Result<{ act: Act }, ActError> => {
  if (isBlank(input.name)) return err('act-name-required');
  if (isBlank(input.email)) return err('act-email-required');
  if (!EMAIL_RE.test(input.email.trim())) return err('act-email-invalid');
  if (isBlank(input.role)) return err('act-role-required');

  const cpf = Cpf.parse(input.cpf);
  if (!cpf.ok) return err('invalid-cpf');

  const occupationArea = OccupationArea.parse(input.occupationArea);
  if (!occupationArea.ok) return occupationArea;

  const employmentRelationship = EmploymentRelationship.parse(input.employmentRelationship);
  if (!employmentRelationship.ok) return employmentRelationship;

  const edited: Act = immutable({
    ...act,
    name: input.name.trim(),
    email: input.email.trim(),
    cpf: cpf.value,
    occupationArea: occupationArea.value,
    role: input.role.trim(),
    startOfContract: input.startOfContract,
    employmentRelationship: employmentRelationship.value,
  });

  return ok({ act: edited });
};

export const deactivate = (act: Act, at: Date): InactiveAct => {
  const { status: _status, ...core } = act as Act & { deactivatedAt?: Date };
  return immutable({ ...core, status: 'Inactive', deactivatedAt: at });
};

type InactiveAct = Act & { status: 'Inactive'; deactivatedAt: Date };

export const reactivate = (act: Act): ActiveAct => {
  const {
    status: _status,
    deactivatedAt: _deactivatedAt,
    ...core
  } = act as Act & {
    deactivatedAt?: Date;
  };
  return immutable({ ...core, status: 'Active' });
};

export const rehydrate = (input: RehydrateActInput): Result<Act, ActError> => {
  if (input.status === 'Active') {
    return ok(immutable({ ...input, status: 'Active' as const }));
  }
  const deactivatedAt = input.deactivatedAt;
  if (deactivatedAt === null) {
    // Estado inconsistente: Inactive sem deactivatedAt.
    return err('act-already-inactive');
  }
  return ok(immutable({ ...input, status: 'Inactive' as const, deactivatedAt }));
};
