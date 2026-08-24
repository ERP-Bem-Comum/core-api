import type { Result } from '../../../../shared/primitives/result.ts';
import type { Remittance } from '../../domain/remittance/types.ts';
import type { RemittanceEvent } from '../../domain/remittance/events.ts';
import type { PayableTransmitted } from '../../domain/document/events.ts';
import type { RemittanceId } from '../../domain/remittance/remittance-id.ts';

export type RemittanceRepositoryError = 'remittance-repository-unavailable';

// O `save` grava eventos de DOIS agregados, e é consequência direta de ele escrever em dois
// (ADR-0065 §2): o desfecho da remessa e a transição de cada título que ela leva. A união é
// explícita em vez de `FinancialAppendableEvent` porque este `save` não tem o que fazer com evento
// de extrato ou de conciliação — um tipo largo demais aceitaria em silêncio o que nunca deveria
// chegar aqui.
export type RemittanceSaveEvent = RemittanceEvent | PayableTransmitted;

// Um título preso e a remessa que o prende. O `nsa` viaja junto porque é o identificador que existe
// para o operador: ele o vê na tela de remessas e no retorno do banco, enquanto o `id` é interno.
export type HeldPayable = Readonly<{
  payableId: string;
  remittanceId: string;
  nsa: number;
}>;

// Só o `save` pode recusar por título preso, e por isso o erro NÃO entra no union geral: um
// `findById` que declarasse poder devolver `already-held` obrigaria todo chamador a tratar um caso
// que não existe, e o compilador deixaria de distinguir quem realmente precisa decidir.
// `remittance-payable-not-approved` é irmão de `already-held` e sai pelo mesmo motivo: os dois
// nascem da reserva, e nenhum outro método pode devolvê-los. São desfechos DISTINTOS de propósito —
// "já está em outra remessa" manda o operador à lista de remessas; "não está aprovado" o manda ao
// fluxo de aprovação. Colapsá-los num erro só faria a tela mandar metade dos casos ao lugar errado.
export type RemittanceSaveError =
  | RemittanceRepositoryError
  | 'remittance-payables-already-held'
  | 'remittance-payable-not-approved';

export type RemittanceRepository = Readonly<{
  // `events` (opcional/trailing, como no `DocumentRepository`): gravados no `fin_outbox` NA MESMA
  // transação do agregado. O evento existe se e somente se o desfecho foi persistido (ADR-0015) —
  // anunciar "remessa transmitida" sem ter gravado a transmissão é pior que não anunciar.
  // ⚠️ O `save` de CRIAÇÃO reserva os títulos (#789) **e os transiciona** para `Transmitted`
  // (ADR-0065 §2). São duas escritas, uma transação, e nenhuma das duas é conveniência:
  //
  // 1. **Reserva.** `findHeldPayables` responde sobre o passado, e entre a resposta dela e a
  //    gravação cabe a tradução CNAB inteira. Duas emissões concorrentes leem "livre" antes de
  //    qualquer uma gravar — CWE-367. Reconferir o hold no MESMO ato em que se grava é o que fecha a
  //    janela; separar as duas coisas em chamadas distintas a reabriria, menor porém real.
  // 2. **Transição.** `UPDATE fin_payables SET status='Transmitted' WHERE id=? AND status='Approved'`
  //    por título — CAS pela pré-condição da operação (ADR-0063 §2), sem coluna de versão. Se
  //    `affectedRows` divergir da quantidade reservada, o desfecho é `remittance-payable-not-approved`
  //    e a transação inteira desfaz — inclusive a reserva. O NSA já consumido NÃO volta, em nenhum
  //    caminho: gap na sequência é inofensivo, reusar número é retransmissão aos olhos do banco.
  //
  // A ordem entre as duas importa: a transição vem DEPOIS da releitura do hold sob lock. Transicionar
  // antes gastaria escrita num título que a reserva ainda pode recusar.
  //
  // Atualização de desfecho (confirmar, falhar, descartar) NÃO reserva nem transiciona: a remessa já
  // prende os próprios títulos, e recusá-la ali travaria toda remessa transmitida sem desfecho. A
  // devolução `Transmitted → Approved` do descarte é operação à parte (ADR-0065 §4), com CAS próprio.
  save: (
    remittance: Remittance,
    events?: readonly RemittanceSaveEvent[],
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
