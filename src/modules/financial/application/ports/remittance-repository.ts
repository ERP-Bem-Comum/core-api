import type { Result } from '../../../../shared/primitives/result.ts';
import type { Remittance } from '../../domain/remittance/types.ts';
import type { RemittanceEvent } from '../../domain/remittance/events.ts';
import type { RemittanceId } from '../../domain/remittance/remittance-id.ts';

export type RemittanceRepositoryError = 'remittance-repository-unavailable';

// Um título preso e a remessa que o prende. O `nsa` viaja junto porque é o identificador que existe
// para o operador: ele o vê na tela de remessas e no retorno do banco, enquanto o `id` é interno.
export type HeldPayable = Readonly<{
  payableId: string;
  remittanceId: string;
  nsa: number;
}>;

export type RemittanceRepository = Readonly<{
  // `events` (opcional/trailing, como no `DocumentRepository`): gravados no `fin_outbox` NA MESMA
  // transação do agregado. O evento existe se e somente se o desfecho foi persistido (ADR-0015) —
  // anunciar "remessa transmitida" sem ter gravado a transmissão é pior que não anunciar.
  save: (
    remittance: Remittance,
    events?: readonly RemittanceEvent[],
  ) => Promise<Result<void, RemittanceRepositoryError>>;
  findById: (id: RemittanceId) => Promise<Result<Remittance | null, RemittanceRepositoryError>>;
  findByFileName: (
    fileName: string,
  ) => Promise<Result<Remittance | null, RemittanceRepositoryError>>;

  // A pergunta que a SELEÇÃO faz antes de montar uma remessa nova: destes TÍTULOS, quais já
  // estão presos numa remessa viva (`Queued`, `Transmitted` ou `Failed`)?
  //
  // Existe como operação do port, e não como filtro no chamador, porque a resposta tem de vir do
  // BANCO: outra instância pode ter enfileirado o mesmo título há dois segundos. Resolver isso
  // em memória devolveria uma resposta desatualizada — e o preço do engano é pagamento em dobro.
  //
  // ⚠️ Por TÍTULO, nunca por documento: o pai numa remessa viva não pode prender a retenção da mesma
  // nota, que segue com ciclo de vida próprio e pode ser paga noutro arquivo.
  //
  // Devolve o VÍNCULO, não só o id do título: quem recusa um ajuste precisa dizer ao operador em que
  // remessa o título está, e o `nsa` é o que ele reconhece — o UUID não lhe diz nada. O JOIN com
  // `fin_remittances` já existia para filtrar por status, então o custo são duas colunas a mais na
  // projeção, não uma junção nova.
  findHeldPayables: (
    payableIds: readonly string[],
  ) => Promise<Result<readonly HeldPayable[], RemittanceRepositoryError>>;

  listByStatus: (
    status: Remittance['status'],
  ) => Promise<Result<readonly Remittance[], RemittanceRepositoryError>>;

  // #728: leitura da tela de acompanhamento — página ordenada por `generatedAt` DESC (mais recentes
  // primeiro), com o total para a paginação do front. `status` sai do banco como está (o worker o
  // mantém), nunca derivado de prefixo de objeto.
  listPaged: (
    pagination: Readonly<{ limit: number; offset: number }>,
  ) => Promise<
    Result<Readonly<{ items: readonly Remittance[]; total: number }>, RemittanceRepositoryError>
  >;
}>;
