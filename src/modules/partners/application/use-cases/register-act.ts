/**
 * Use case `registerAct` — cria um Act (nasce Active + PreRegistration).
 *
 * Sequência: `Act.register` → guard CPF duplicado → guard email duplicado → `save`.
 * Tempo injetado via `Clock`. Curried `(deps) => (cmd)`.
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

export type RegisterActCommand = Readonly<{
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string;
  startOfContract: Date;
  employmentRelationship: string;
}>;

export type RegisterActError =
  | 'register-act-cpf-duplicate'
  | 'register-act-email-duplicate'
  | ActError
  | ActRepositoryError;

export type RegisterActOutput = Readonly<{ act: ActiveAct }>;

type Deps = Readonly<{ actRepo: ActRepository; clock: Clock }>;

export const registerAct =
  (deps: Deps) =>
  async (cmd: RegisterActCommand): Promise<Result<RegisterActOutput, RegisterActError>> => {
    const registered = Act.register({
      id: ActId.generate(),
      name: cmd.name,
      email: cmd.email,
      cpf: cmd.cpf,
      occupationArea: cmd.occupationArea,
      role: cmd.role,
      startOfContract: cmd.startOfContract,
      employmentRelationship: cmd.employmentRelationship,
      registeredAt: deps.clock.now(),
    });
    if (!registered.ok) return registered;

    const byCpf = await deps.actRepo.findByCpf(registered.value.act.cpf);
    if (!byCpf.ok) return byCpf;
    if (byCpf.value !== null) return err('register-act-cpf-duplicate');

    const byEmail = await deps.actRepo.findByEmail(registered.value.act.email);
    if (!byEmail.ok) return byEmail;
    if (byEmail.value !== null) return err('register-act-email-duplicate');

    const saved = await deps.actRepo.save(registered.value.act);
    if (!saved.ok) return saved;

    return ok({ act: registered.value.act });
  };
