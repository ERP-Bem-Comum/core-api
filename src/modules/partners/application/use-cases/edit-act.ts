/**
 * Use case `editAct` — edição cadastral (PUT total dos 7 campos).
 * rehydrate id → findById → Act.edit → guard unicidades (CPF/email) → save.
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

export type EditActCommand = Readonly<{
  actId: string;
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string;
  startOfContract: Date;
  employmentRelationship: string;
}>;

export type EditActError =
  | 'edit-act-invalid-id'
  | 'edit-act-not-found'
  | 'edit-act-cpf-duplicate'
  | 'edit-act-email-duplicate'
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

    const edited = Act.edit(current, {
      name: cmd.name,
      email: cmd.email,
      cpf: cmd.cpf,
      occupationArea: cmd.occupationArea,
      role: cmd.role,
      startOfContract: cmd.startOfContract,
      employmentRelationship: cmd.employmentRelationship,
    });
    if (!edited.ok) return edited;
    const next = edited.value.act;

    if (String(current.cpf) !== String(next.cpf)) {
      const byCpf = await deps.actRepo.findByCpf(next.cpf);
      if (!byCpf.ok) return byCpf;
      if (byCpf.value !== null && String(byCpf.value.id) !== String(id.value)) {
        return err('edit-act-cpf-duplicate');
      }
    }

    if (current.email !== next.email) {
      const byEmail = await deps.actRepo.findByEmail(next.email);
      if (!byEmail.ok) return byEmail;
      if (byEmail.value !== null && String(byEmail.value.id) !== String(id.value)) {
        return err('edit-act-email-duplicate');
      }
    }

    const saved = await deps.actRepo.save(next);
    if (!saved.ok) return saved;

    return ok({ act: next });
  };
