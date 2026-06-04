/**
 * Use case `editFinancier` — edição cadastral (PUT total) com RBAC do campo vital.
 *
 * rehydrate id → `findById` (not-found) → `Financier.edit` → se o CNPJ mudou: exige
 * `canEditSensitive` (senão `edit-financier-sensitive-forbidden`) e re-checa unicidade
 * (`findByCnpj` de outro id → `edit-financier-cnpj-duplicate`) → `save`.
 *
 * O boolean `canEditSensitive` é computado na borda (permissão `financier:edit-sensitive`);
 * a regra do vital fica aqui — evita depender do reader (driver memory tem stores distintos).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import type { Financier as FinancierAggregate } from '#src/modules/partners/domain/financier/types.ts';
import type { FinancierEvent } from '#src/modules/partners/domain/financier/events.ts';
import type { FinancierError } from '#src/modules/partners/domain/financier/errors.ts';
import type {
  FinancierRepository,
  FinancierRepositoryError,
} from '#src/modules/partners/domain/financier/repository.ts';

export type EditFinancierCommand = Readonly<{
  financierId: string;
  canEditSensitive: boolean;
  name: string;
  corporateName: string;
  legalRepresentative: string;
  cnpj: string;
  telephone: string;
  address: string;
}>;

export type EditFinancierError =
  | 'edit-financier-invalid-id'
  | 'edit-financier-not-found'
  | 'edit-financier-cnpj-duplicate'
  | 'edit-financier-sensitive-forbidden'
  | FinancierError
  | FinancierRepositoryError;

export type EditFinancierOutput = Readonly<{
  financier: FinancierAggregate;
  event: FinancierEvent;
}>;

type Deps = Readonly<{ financierRepo: FinancierRepository; clock: Clock }>;

export const editFinancier =
  (deps: Deps) =>
  async (cmd: EditFinancierCommand): Promise<Result<EditFinancierOutput, EditFinancierError>> => {
    const id = FinancierId.rehydrate(cmd.financierId);
    if (!id.ok) return err('edit-financier-invalid-id');

    const fetched = await deps.financierRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('edit-financier-not-found');
    const current = fetched.value;

    const edited = Financier.edit(
      current,
      {
        name: cmd.name,
        corporateName: cmd.corporateName,
        legalRepresentative: cmd.legalRepresentative,
        cnpj: cmd.cnpj,
        telephone: cmd.telephone,
        address: cmd.address,
      },
      deps.clock.now(),
    );
    if (!edited.ok) return edited;

    const cnpjChanged = String(current.cnpj) !== String(edited.value.financier.cnpj);
    if (cnpjChanged) {
      // Campo vital: só super-role (financier:edit-sensitive) altera o CNPJ.
      if (!cmd.canEditSensitive) return err('edit-financier-sensitive-forbidden');
      const byCnpj = await deps.financierRepo.findByCnpj(edited.value.financier.cnpj);
      if (!byCnpj.ok) return byCnpj;
      if (byCnpj.value !== null && String(byCnpj.value.id) !== String(id.value)) {
        return err('edit-financier-cnpj-duplicate');
      }
    }

    const saved = await deps.financierRepo.save(edited.value.financier);
    if (!saved.ok) return saved;

    return ok({ financier: edited.value.financier, event: edited.value.event });
  };
