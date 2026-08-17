import { type Result, err } from '../../../../shared/primitives/result.ts';
import type { Remittance } from '../../domain/remittance/types.ts';
import * as RemittanceId from '../../domain/remittance/remittance-id.ts';
import type { RemittanceRepository } from '../ports/remittance-repository.ts';

// #728: detalhe de uma remessa. Rehidrata o id cru pelo VO — id malformado é 400 (`remittance-id-invalid`),
// nunca uma consulta ao banco com lixo. `null` (não encontrado) sobe intacto: a borda o traduz em 404.
export type GetRemittanceDeps = Readonly<{
  remittances: Pick<RemittanceRepository, 'findById'>;
}>;

export type GetRemittanceError = 'remittance-id-invalid' | 'remittance-repository-unavailable';

export const getRemittance =
  (deps: GetRemittanceDeps) =>
  async (id: string): Promise<Result<Remittance | null, GetRemittanceError>> => {
    const rehydrated = RemittanceId.rehydrate(id);
    if (!rehydrated.ok) return err('remittance-id-invalid');
    return deps.remittances.findById(rehydrated.value);
  };
