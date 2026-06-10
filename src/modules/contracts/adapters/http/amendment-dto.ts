/**
 * Mapper agregado `Amendment` → DTO de resposta da borda HTTP.
 *
 * Switch exaustivo sobre `kind` (compilador trava variante faltante). `NonZeroMoney`
 * → `{ impactValueCents }`, `PlainDate` → ISO via `PlainDate.toISOString`, `Date` → ISO.
 * Campos de estado interno (`signedDocumentRef`, `homologatedAt/By`) não entram no DTO.
 */

import * as PlainDate from '#src/shared/kernel/plain-date.ts';

import type { Amendment } from '../../domain/amendment/types.ts';
import type { AmendmentDto } from './schemas.ts';

export const amendmentToDto = (a: Amendment): AmendmentDto => {
  const base = {
    id: a.id,
    contractId: a.contractId,
    amendmentNumber: a.amendmentNumber,
    description: a.description,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    // G2: signedAt só existe a partir de PendingWithDocument (narrowing por signedDocumentRef).
    signedAt: a.signedDocumentRef === null ? null : a.signedAt.toISOString(),
  };

  switch (a.kind) {
    case 'Addition':
      return { ...base, kind: 'Addition', impactValueCents: a.impactValue.cents };
    case 'Suppression':
      return { ...base, kind: 'Suppression', impactValueCents: a.impactValue.cents };
    case 'TermChange':
      return { ...base, kind: 'TermChange', newEndDate: PlainDate.toISOString(a.newEndDate) };
    case 'Misc':
      return { ...base, kind: 'Misc' };
  }
};
