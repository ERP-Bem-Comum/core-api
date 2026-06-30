/**
 * Use case `registerAct` — cria um Acordo de Cooperação Técnica (nasce Active).
 *
 * Sequência: `Act.register` → guard `actNumber` duplicado → `save`. Tempo injetado
 * via `Clock`. Curried `(deps) => (cmd)`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import type { ActiveAct } from '#src/modules/partners/domain/act/types.ts';
import type { ActError } from '#src/modules/partners/domain/act/errors.ts';
import type {
  ActRepository,
  ActRepositoryError,
} from '#src/modules/partners/domain/act/repository.ts';
import type {
  BankAccountInput,
  PixKeyInput,
} from '#src/modules/partners/domain/shared/payment-target.ts';

export type RegisterActCommand = Readonly<{
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

export type RegisterActError = 'register-act-number-duplicate' | ActError | ActRepositoryError;

export type RegisterActOutput = Readonly<{ act: ActiveAct }>;

type Deps = Readonly<{ actRepo: ActRepository; clock: Clock }>;

export const registerAct =
  (deps: Deps) =>
  async (cmd: RegisterActCommand): Promise<Result<RegisterActOutput, RegisterActError>> => {
    const registered = Act.register({
      id: ActId.generate(),
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
      registeredAt: deps.clock.now(),
    });
    if (!registered.ok) return registered;

    const byActNumber = await deps.actRepo.findByActNumber(registered.value.act.actNumber);
    if (!byActNumber.ok) return byActNumber;
    if (byActNumber.value !== null) return err('register-act-number-duplicate');

    const saved = await deps.actRepo.save(registered.value.act);
    if (!saved.ok) return saved;

    return ok({ act: registered.value.act });
  };
