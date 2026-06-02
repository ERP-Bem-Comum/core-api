/**
 * Use case `registerFinancier` — cria um financiador (nasce Active).
 *
 * Sequência: `Financier.register` (valida campos + CNPJ) → guard de CNPJ
 * duplicado via `findByCnpj` → `save`. Tempo injetado via `Clock`.
 * Curried `(deps) => (cmd)` (padrão `approvePayable`).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import type { ActiveFinancier } from '#src/modules/partners/domain/financier/types.ts';
import type { FinancierEvent } from '#src/modules/partners/domain/financier/events.ts';
import type { FinancierError } from '#src/modules/partners/domain/financier/errors.ts';
import type {
  FinancierRepository,
  FinancierRepositoryError,
} from '#src/modules/partners/domain/financier/repository.ts';

export type RegisterFinancierCommand = Readonly<{
  name: string;
  corporateName: string;
  legalRepresentative: string;
  cnpj: string;
  telephone: string;
  address: string;
}>;

export type RegisterFinancierError =
  | 'register-financier-cnpj-duplicate'
  | FinancierError
  | FinancierRepositoryError;

export type RegisterFinancierOutput = Readonly<{
  financier: ActiveFinancier;
  event: FinancierEvent;
}>;

type Deps = Readonly<{ financierRepo: FinancierRepository; clock: Clock }>;

export const registerFinancier =
  (deps: Deps) =>
  async (
    cmd: RegisterFinancierCommand,
  ): Promise<Result<RegisterFinancierOutput, RegisterFinancierError>> => {
    const registered = Financier.register({
      id: FinancierId.generate(),
      name: cmd.name,
      corporateName: cmd.corporateName,
      legalRepresentative: cmd.legalRepresentative,
      cnpj: cmd.cnpj,
      telephone: cmd.telephone,
      address: cmd.address,
      registeredAt: deps.clock.now(),
    });
    if (!registered.ok) return registered;

    const existing = await deps.financierRepo.findByCnpj(registered.value.financier.cnpj);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('register-financier-cnpj-duplicate');

    const saved = await deps.financierRepo.save(registered.value.financier);
    if (!saved.ok) return saved;

    return ok({ financier: registered.value.financier, event: registered.value.event });
  };
