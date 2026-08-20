import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as RemittanceId from '../../domain/remittance/remittance-id.ts';
import type { RemittanceRepository } from '../ports/remittance-repository.ts';
import type { VanObjectKey, VanStoragePort } from '../ports/van-storage.ts';

/**
 * Baixa o arquivo que FOI ao banco — o objeto do bucket, nunca uma regeração.
 *
 * A distinção não é purismo. Regerar produziria outro NSA (o contador não volta) e outro carimbo de
 * tempo, então o arquivo "equivalente" teria bytes diferentes dos que o banco recebeu. Para conferir
 * uma divergência com o banco, um arquivo parecido não serve para nada: ou é o mesmo, ou não é
 * evidência.
 *
 * ⚠️ Rota de HOMOLOGAÇÃO. Quem decide isso é a borda, que não registra a rota em produção — ver o
 * comentário do registro em `adapters/http/plugin.ts`. Este use case não conhece ambiente, e é
 * deliberado: gate de ambiente é decisão de exposição, não de negócio, e enterrá-lo aqui o
 * espalharia por uma camada que não tem como testá-lo.
 */
export type DownloadRemittanceFileDeps = Readonly<{
  remittances: RemittanceRepository;
  storage: VanStoragePort;
  /** O MESMO que gerou o `contentHash` na emissão — senão a conferência compara duas réguas. */
  hashContent: (content: string) => string;
}>;

export type DownloadRemittanceFileOutput = Readonly<{
  fileName: string;
  /** Onde o objeto estava. `falhas/` é diagnóstico: o envio não completou. */
  key: VanObjectKey;
  bytes: Uint8Array;
}>;

export type DownloadRemittanceFileError =
  | 'remittance-id-invalid'
  | 'remittance-not-found'
  | 'remittance-file-not-found'
  | 'remittance-file-corrupted'
  | 'remittance-repository-unavailable'
  | 'van-storage-unavailable';

export const downloadRemittanceFile =
  (deps: DownloadRemittanceFileDeps) =>
  async (
    id: string,
  ): Promise<Result<DownloadRemittanceFileOutput, DownloadRemittanceFileError>> => {
    // Rehidrata pelo VO como o `get-remittance` faz: id malformado é 400, nunca consulta ao banco
    // com lixo. Divergir aqui daria dois comportamentos para o mesmo `:id` em rotas irmãs.
    const rehydrated = RemittanceId.rehydrate(id);
    if (!rehydrated.ok) return err('remittance-id-invalid');

    const found = await deps.remittances.findById(rehydrated.value);
    if (!found.ok) return err('remittance-repository-unavailable');
    if (found.value === null) return err('remittance-not-found');

    const object = await deps.storage.findRemittance(found.value.fileName);
    if (!object.ok) {
      // Ausente e indisponível pedem ações opostas de quem investiga: no primeiro o arquivo não está
      // em nenhum dos prefixos do agente — remessa antiga, ou objeto movido para fora do combinado;
      // no segundo o bucket é que não respondeu, e o arquivo provavelmente está lá.
      return err(
        object.error === 'van-storage-object-not-found'
          ? 'remittance-file-not-found'
          : 'van-storage-unavailable',
      );
    }

    // A conferência que transforma "aqui está um arquivo" em "este é o arquivo que foi ao banco".
    //
    // O `contentHash` foi gravado na emissão para provar integridade; aqui ele paga uma segunda vez,
    // provando IDENTIDADE — que o objeto servido é aquele objeto. Sem isso, servir o arquivo errado
    // (outra remessa com nome colidente, um exercício de `sandbox/`, um objeto meio-escrito) seria
    // indistinguível de servir o certo, e num arquivo de pagamento essa é a única diferença que
    // importa.
    //
    // Decodifica como UTF-8 porque o arquivo de REMESSA fomos NÓS que escrevemos, como texto — o
    // inverso do arquivo de retorno, que vem no encoding do banco e por isso nunca se decodifica
    // para hashear (ver o aviso do `getBytes` no port).
    const hash = deps.hashContent(new TextDecoder('utf-8').decode(object.value.bytes));
    if (hash !== found.value.contentHash) return err('remittance-file-corrupted');

    return ok({ fileName: found.value.fileName, key: object.value.key, bytes: object.value.bytes });
  };
