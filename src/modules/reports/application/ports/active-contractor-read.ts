/**
 * ACTIVE-CONTRACTOR-READ — Port de LEITURA (read-only) do conjunto de fornecedores que possuem
 * contrato ativo (#437).
 *
 * É o subtraendo do anti-join do relatório "Fornecedores sem Contrato": o `reports` remove estes
 * refs dos candidatos vindos do `financial`. Lido do `contracts` via ACL — SÓ contrato
 * `status = 'Active'` conta (`Pending` é rascunho; `Expired`/`Terminated`/`Cancelled` acabaram).
 */
import type { Result } from '#src/shared/primitives/result.ts';

export type ActiveContractorReadError = 'active-contractor-read-unavailable';

export type ActiveContractorReadPort = Readonly<{
  listContractorsWithActiveContract: () => Promise<
    Result<readonly string[], ActiveContractorReadError>
  >;
}>;
