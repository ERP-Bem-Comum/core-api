/**
 * Use case `editAct` — edição cadastral do Acordo (PUT total dos campos).
 * rehydrate id → findById → Act.edit → guard `actNumber` duplicado → save.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import type { Act as ActAggregate } from '#src/modules/partners/domain/act/types.ts';
import type { ActError } from '#src/modules/partners/domain/act/errors.ts';
import type {
  ActRepository,
  ActRepositoryError,
} from '#src/modules/partners/domain/act/repository.ts';
import type {
  BankAccountInput,
  PixKeyInput,
} from '#src/modules/partners/domain/supplier/payment-target.ts';

export type EditActCommand = Readonly<{
  actId: string;
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

export type EditActError =
  | 'edit-act-invalid-id'
  | 'edit-act-not-found'
  | 'edit-act-number-duplicate'
  | ActError
  | ActRepositoryError;

export type EditActOutput = Readonly<{ act: ActAggregate }>;

type Deps = Readonly<{ actRepo: ActRepository; clock: Clock }>;

export const editAct =
  (deps: Deps) =>
  async (cmd: EditActCommand): Promise<Result<EditActOutput, EditActError>> => {
    const id = ActId.rehydrate(cmd.actId);
    if (!id.ok) return err('edit-act-invalid-id');

    const fetched = await deps.actRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('edit-act-not-found');
    const current = fetched.value;

    const edited = Act.edit(
      current,
      {
        actNumber: cmd.actNumber,
        name: cmd.name,
        email: cmd.email,
        cnpj: cmd.cnpj,
        corporateName: cmd.corporateName,
        fantasyName: cmd.fantasyName,
        occupationArea: cmd.occupationArea,
        legalRepresentative: cmd.legalRepresentative,
        startDate: cmd.startDate,
        endDate: cmd.endDate,
        hasFinancialTransfer: cmd.hasFinancialTransfer,
        bankAccount: cmd.bankAccount,
        pixKey: cmd.pixKey,
      },
      deps.clock.now(),
    );
    if (!edited.ok) return edited;
    const next = edited.value.act;

    if (String(current.actNumber) !== String(next.actNumber)) {
      const byActNumber = await deps.actRepo.findByActNumber(next.actNumber);
      if (!byActNumber.ok) return byActNumber;
      if (byActNumber.value !== null && String(byActNumber.value.id) !== String(id.value)) {
        return err('edit-act-number-duplicate');
      }
    }

    const saved = await deps.actRepo.save(next);
    if (!saved.ok) return saved;

    return ok({ act: next });
  };
