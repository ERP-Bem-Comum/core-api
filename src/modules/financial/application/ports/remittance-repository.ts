import type { Result } from '../../../../shared/primitives/result.ts';
import type { Remittance } from '../../domain/remittance/types.ts';
import type { RemittanceId } from '../../domain/remittance/remittance-id.ts';

export type RemittanceRepositoryError = 'remittance-repository-unavailable';

export type RemittanceRepository = Readonly<{
  save: (remittance: Remittance) => Promise<Result<void, RemittanceRepositoryError>>;
  findById: (id: RemittanceId) => Promise<Result<Remittance | null, RemittanceRepositoryError>>;
  findByFileName: (
    fileName: string,
  ) => Promise<Result<Remittance | null, RemittanceRepositoryError>>;

  // A pergunta que a SELEÇÃO faz antes de montar uma remessa nova: destes documentos, quais já
  // estão presos numa remessa viva (`Queued`, `Transmitted` ou `Failed`)?
  //
  // Existe como operação do port, e não como filtro no chamador, porque a resposta tem de vir do
  // BANCO: outra instância pode ter enfileirado o mesmo documento há dois segundos. Resolver isso
  // em memória devolveria uma resposta desatualizada — e o preço do engano é pagamento em dobro.
  findHeldDocumentIds: (
    documentIds: readonly string[],
  ) => Promise<Result<readonly string[], RemittanceRepositoryError>>;

  listByStatus: (
    status: Remittance['status'],
  ) => Promise<Result<readonly Remittance[], RemittanceRepositoryError>>;
}>;
