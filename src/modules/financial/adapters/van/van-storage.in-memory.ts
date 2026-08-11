import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  VanObjectKey,
  VanStorageError,
  VanStoragePort,
} from '../../application/ports/van-storage.ts';

// Fake do bucket da VAN. Existe para o use case ser testável sem rede — e para exercitar o fluxo
// inteiro sem risco de enfileirar pagamento.
//
// Reproduz o que importa do comportamento real: chave = prefixo + nome, escrita idempotente por
// chave, leitura por chave. NÃO reproduz o agente: nada se move de `saida/` para `processados/`
// sozinho, porque quem move é o agente na instância, e simular isso aqui daria a impressão falsa
// de que o ciclo fecha dentro do nosso processo.
export const createInMemoryVanStorage = (
  prefixes: Readonly<{
    outbound: string;
    returns: string;
    status: string;
    sandbox: string;
  }> = { outbound: 'saida/', returns: 'retorno/', status: 'status/', sandbox: 'sandbox/' },
): VanStoragePort & Readonly<{ seed: (key: string, content: string) => void }> => {
  const objects = new Map<string, string>();

  const put = (
    prefix: string,
    fileName: string,
    content: string,
  ): Result<VanObjectKey, VanStorageError> => {
    if (fileName === '' || fileName.includes('/')) return err('van-storage-invalid-file-name');
    const key = `${prefix}${fileName}`;
    objects.set(key, content);
    return ok(key);
  };

  const listByPrefix = (prefix: string): readonly VanObjectKey[] =>
    [...objects.keys()].filter((k) => k.startsWith(prefix)).sort();

  return {
    putRemittance: async (fileName, content) =>
      Promise.resolve(put(prefixes.outbound, fileName, content)),

    putSandbox: async (fileName, content) =>
      Promise.resolve(put(prefixes.sandbox, fileName, content)),

    listReturns: async () => Promise.resolve(ok(listByPrefix(prefixes.returns))),

    listStatus: async () => Promise.resolve(ok(listByPrefix(prefixes.status))),

    getText: async (key) => {
      const content = objects.get(key);
      return Promise.resolve(
        content === undefined ? err('van-storage-object-not-found') : ok(content),
      );
    },

    // Só do fake: injeta o que o AGENTE colocaria no bucket (retorno, status). Sem isto, testar a
    // leitura exigiria que o próprio teste escrevesse em prefixo que a aplicação não escreve.
    seed: (key, content) => {
      objects.set(key, content);
    },
  };
};
