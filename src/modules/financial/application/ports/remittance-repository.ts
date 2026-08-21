import type { Result } from '../../../../shared/primitives/result.ts';
import type { Remittance } from '../../domain/remittance/types.ts';
import type { RemittanceEvent } from '../../domain/remittance/events.ts';
import type { RemittanceId } from '../../domain/remittance/remittance-id.ts';

export type RemittanceRepositoryError = 'remittance-repository-unavailable';

// Só o `save` pode recusar por título preso, e por isso o erro NÃO entra no union geral: um
// `findById` que declarasse poder devolver `already-held` obrigaria todo chamador a tratar um caso
// que não existe, e o compilador deixaria de distinguir quem realmente precisa decidir.
export type RemittanceSaveError = RemittanceRepositoryError | 'remittance-payables-already-held';

export type RemittanceRepository = Readonly<{
  // `events` (opcional/trailing, como no `DocumentRepository`): gravados no `fin_outbox` NA MESMA
  // transação do agregado. O evento existe se e somente se o desfecho foi persistido (ADR-0015) —
  // anunciar "remessa transmitida" sem ter gravado a transmissão é pior que não anunciar.
  // ⚠️ O `save` de CRIAÇÃO é também o ponto de reserva dos títulos (#789), e não por conveniência:
  // `findHeldPayableIds` responde sobre o passado, e entre a resposta dela e a gravação cabe a
  // tradução CNAB inteira. Duas emissões concorrentes leem "livre" antes de qualquer uma gravar —
  // CWE-367. Reconferir o hold no MESMO ato em que se grava é o que fecha a janela; separar as duas
  // coisas em chamadas distintas a reabriria, menor porém real.
  //
  // Atualização de desfecho (confirmar, falhar, descartar) NÃO reserva: a remessa já prende os
  // próprios títulos, e recusá-la ali travaria toda remessa transmitida sem desfecho.
  save: (
    remittance: Remittance,
    events?: readonly RemittanceEvent[],
  ) => Promise<Result<void, RemittanceSaveError>>;
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
  findHeldPayableIds: (
    payableIds: readonly string[],
  ) => Promise<Result<readonly string[], RemittanceRepositoryError>>;

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
