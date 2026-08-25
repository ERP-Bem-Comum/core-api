import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as RemittanceId from '../../domain/remittance/remittance-id.ts';
import { discard, payableIdsOf } from '../../domain/remittance/remittance.ts';
import type { Remittance } from '../../domain/remittance/types.ts';
import type { PayableTransmissionDiscarded } from '../../domain/document/events.ts';
import type { RemittanceRepository, RemittanceSaveEvent } from '../ports/remittance-repository.ts';
import type { VanStoragePort } from '../ports/van-storage.ts';

/**
 * Descarta uma remessa e DEVOLVE os títulos dela à fila (ADR-0065 §4, #792).
 *
 * É a via de saída que a P.O. descreveu na #792 sem saber o nome dela: *"o usuário retorna o status
 * para aprovado e realiza o pagamento de forma manual, fora da VAN, pois o banco pode bloquear o
 * arquivo por duplicidade"*. Depois de uma transmissão que falhou, ninguém sabe com certeza o que o
 * banco recebeu — reemitir o mesmo pagamento noutro arquivo é oferecer um duplicado. Por isso o que
 * se constrói aqui **não é reenvio**: é a saída.
 *
 * O fluxo completo tem cinco passos, e só o terceiro faltava: (1) a remessa falha; (2) o operador
 * confere o banco; (3) **ele devolve o título** — este use case; (4) paga no internet banking; (5)
 * dá baixa manual com a data real (#224, já existia, e desde a §6 aceita título `Transmitted`).
 *
 * ⚠️ A decisão de PODE ou NÃO descartar é do domínio. Este use case apura um fato que o domínio não
 * pode alcançar — se o objeto existe em algum prefixo do bucket — e o entrega como dado. A regra
 * (`Failed` sempre; `Queued` só sem arquivo) vive em `discard`, não aqui.
 */
export type DiscardRemittanceDeps = Readonly<{
  remittances: RemittanceRepository;
  storage: VanStoragePort;
  now: () => Date;
}>;

export type DiscardRemittanceInput = Readonly<{
  remittanceId: string;
  reason: string;
}>;

export type DiscardRemittanceOutput = Readonly<{
  remittanceId: string;
  /** Os títulos que voltaram à fila — o que o operador precisa ver para seguir para o passo 4. */
  releasedPayableIds: readonly string[];
}>;

export type DiscardRemittanceError =
  | 'remittance-id-invalid'
  | 'remittance-not-found'
  | 'remittance-already-transmitted'
  | 'remittance-discard-requires-failure'
  | 'remittance-discard-requires-reason'
  | 'remittance-persist-failed'
  | 'van-storage-unavailable';

/**
 * O objeto desta remessa está em ALGUM prefixo do bucket?
 *
 * `object-not-found` é a única resposta que significa "não está em lugar nenhum" — e é ela que
 * habilita o descarte de uma `Queued`. Os demais desfechos são tratados como **presença**, e o viés
 * é deliberado: na dúvida sobre onde o arquivo está, não se libera título. Erra-se para o lado de
 * manter preso, que é visível e recuperável, nunca para o de liberar um pagamento que pode estar a
 * caminho do banco.
 *
 * `prefix-drift` (#785) merece nota: ele diz que o bucket tem prefixo fora do combinado, e **não**
 * que o arquivo está lá. Tratá-lo como presença é o mesmo princípio — a fronteira com o agente
 * mudou, e liberar título enquanto ninguém entendeu o quê seria decidir sob informação que sabemos
 * incompleta.
 */
const isFileInBucket = async (
  storage: VanStoragePort,
  fileName: string,
): Promise<Result<boolean, 'van-storage-unavailable'>> => {
  const object = await storage.findRemittance(fileName);
  if (object.ok) return ok(true);

  switch (object.error) {
    case 'van-storage-object-not-found':
      return ok(false);
    case 'van-storage-prefix-drift':
      return ok(true);
    // O nome do arquivo vem do agregado, não da borda: chegar aqui seria defeito nosso, e o balde de
    // indisponibilidade é o honesto — não há o que o operador corrija.
    case 'van-storage-invalid-file-name':
    case 'van-storage-unavailable':
      return err('van-storage-unavailable');
  }
};

// Um evento por TÍTULO, no molde de `PayableTransmitted` e pelo mesmo motivo: é o título que volta à
// fila, e uma nota pode ter saído pela metade. Quem quiser o fato do LOTE consome
// `RemittanceDiscarded`, que o domínio emite junto.
const transmissionDiscardedEvents = (
  remittance: Remittance,
  reason: string,
  occurredAt: Date,
): readonly PayableTransmissionDiscarded[] =>
  remittance.payables.map((p) => ({
    type: 'PayableTransmissionDiscarded' as const,
    documentId: p.documentId,
    payableId: p.payableId,
    remittanceId: remittance.id,
    reason,
    occurredAt,
  }));

export const discardRemittance =
  (deps: DiscardRemittanceDeps) =>
  async (
    input: DiscardRemittanceInput,
  ): Promise<Result<DiscardRemittanceOutput, DiscardRemittanceError>> => {
    // Reidrata pelo VO como as rotas irmãs: id malformado é 400, nunca consulta ao banco com lixo.
    const rehydrated = RemittanceId.rehydrate(input.remittanceId);
    if (!rehydrated.ok) return err('remittance-id-invalid');

    const found = await deps.remittances.findById(rehydrated.value);
    if (!found.ok) return err('remittance-persist-failed');
    if (found.value === null) return err('remittance-not-found');

    const fileInBucket = await isFileInBucket(deps.storage, found.value.fileName);
    if (!fileInBucket.ok) return err('van-storage-unavailable');

    const at = deps.now();
    const decided = discard({
      remittance: found.value,
      at: at.toISOString(),
      reason: input.reason,
      fileInBucket: fileInBucket.value,
    });
    if (!decided.ok) {
      // Tradução do erro do agregado para o vocabulário desta operação — orquestração, não regra.
      //
      // Só três desfechos de `RemittanceError` alcançam este caminho; os demais nascem em `create`,
      // que já rodou muito antes. Colapsá-los em "não dá para descartar deste estado" é honesto (é a
      // mensagem verdadeira para qualquer estado que não seja `Failed` ou `Queued` sem arquivo) e
      // evita um `switch` sobre onze literais dos quais oito são inalcançáveis aqui.
      if (decided.error === 'remittance-already-transmitted') {
        return err('remittance-already-transmitted');
      }
      if (decided.error === 'remittance-discard-requires-reason') {
        return err('remittance-discard-requires-reason');
      }
      return err('remittance-discard-requires-failure');
    }

    // Descarte reincidente devolve o agregado intacto e nenhum evento (o domínio o trata como
    // idempotente). Persistir mesmo assim é inofensivo e mantém um caminho só — mas os títulos já
    // voltaram na primeira vez, e o CAS `AND status='Transmitted'` garante que a segunda passagem
    // não mexa em quem já seguiu para outro estado.
    const events: readonly RemittanceSaveEvent[] =
      decided.value.events.length === 0
        ? []
        : [...decided.value.events, ...transmissionDiscardedEvents(found.value, input.reason, at)];

    const persisted = await deps.remittances.save(decided.value.remittance, events);
    if (!persisted.ok) return err('remittance-persist-failed');

    return ok({
      remittanceId: String(decided.value.remittance.id),
      releasedPayableIds: payableIdsOf(decided.value.remittance),
    });
  };
