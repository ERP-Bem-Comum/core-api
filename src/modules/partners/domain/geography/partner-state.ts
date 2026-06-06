/**
 * Entity `PartnerState` — parceria territorial por UF (soft-delete, ADR-0001 da feature).
 *
 * Identidade: `StateAbbreviation` (reusa o VO de `state.ts`). Ciclo de vida:
 *   - `activate(rawUf)` — smart constructor; valida via `State.parse`.
 *   - `deactivate(state, at)` — Active → Inactive; idempotente (Inactive permanece Inactive).
 *   - `reactivate(state)` — Inactive → Active; idempotente.
 *
 * Sem `class`, sem `throw`, sem ID gerado aqui — UF é a identidade natural.
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as State from './state.ts';
import type { StateAbbreviation, StateError } from './state.ts';

export type ActivePartnerState = Readonly<{
  uf: StateAbbreviation;
  status: 'Active';
}>;

export type InactivePartnerState = Readonly<{
  uf: StateAbbreviation;
  status: 'Inactive';
  deactivatedAt: Date;
}>;

export type PartnerState = ActivePartnerState | InactivePartnerState;

/** Smart constructor: valida UF via catálogo e cria uma parceria Active. */
export const activate = (rawUf: string): Result<ActivePartnerState, StateError> => {
  const parsed = State.parse(rawUf);
  if (!parsed.ok) return parsed;
  return ok(immutable({ uf: parsed.value, status: 'Active' }) as ActivePartnerState);
};

/**
 * Desativa uma parceria (soft-delete). Se já Inactive, retorna o mesmo estado (idempotente).
 * `at` é injetado pelo caller (sem `new Date()` no domínio).
 */
export const deactivate = (state: PartnerState, at: Date): InactivePartnerState => {
  if (state.status === 'Inactive') return state;
  return immutable({ uf: state.uf, status: 'Inactive', deactivatedAt: at }) as InactivePartnerState;
};

/** Reativa uma parceria. Se já Active, retorna o mesmo estado (idempotente). */
export const reactivate = (state: PartnerState): ActivePartnerState => {
  if (state.status === 'Active') return state;
  return immutable({ uf: state.uf, status: 'Active' }) as ActivePartnerState;
};
