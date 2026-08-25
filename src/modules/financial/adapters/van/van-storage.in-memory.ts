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
//
// ⚠️ O que ele guarda são BYTES, e isso não é detalhe de implementação: é o que um bucket guarda.
// Um fake que guardasse `string` faria `getBytes` devolver sempre UTF-8 bem formado, e a suíte
// passaria a descrever um mundo onde o arquivo do banco nunca vem em latin1 — que é exatamente o
// caso em que a conferência de hash da #753 quebra.
export const createInMemoryVanStorage = (
  prefixes: Readonly<{
    outbound: string;
    processed: string;
    failed: string;
    returns: string;
    status: string;
    sandbox: string;
  }> = {
    outbound: 'saida/',
    processed: 'processados/',
    failed: 'falhas/',
    returns: 'retorno/',
    status: 'status/',
    sandbox: 'sandbox/',
  },
): VanStoragePort &
  Readonly<{
    seed: (key: string, content: string) => void;
    // `Uint8Array` não tem forma readonly no TS — o índice é mutável e nenhum utilitário o congela.
    // Mesmo disable que `contracts/adapters/storage/document-storage.in-memory.ts` já carrega.
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    seedBytes: (key: string, bytes: Uint8Array) => void;
  }> => {
  const objects = new Map<string, Uint8Array>();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8');

  const put = (
    prefix: string,
    fileName: string,
    content: string,
  ): Result<VanObjectKey, VanStorageError> => {
    if (fileName === '' || fileName.includes('/')) return err('van-storage-invalid-file-name');
    const key = `${prefix}${fileName}`;
    objects.set(key, encoder.encode(content));
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
      const bytes = objects.get(key);
      return Promise.resolve(
        bytes === undefined ? err('van-storage-object-not-found') : ok(decoder.decode(bytes)),
      );
    },

    getBytes: async (key) => {
      const bytes = objects.get(key);
      return Promise.resolve(bytes === undefined ? err('van-storage-object-not-found') : ok(bytes));
    },

    // Mesma ordem de ciclo de vida do adapter real, e `sandbox/` de fora pela mesma razão: um
    // exercício tem o mesmo nome de um envio real. Um fake que procurasse ali deixaria verde um
    // teste que produção reprova — e este fake existe justamente para exercitar o fluxo sem risco,
    // então seria o lugar mais fácil de a divergência nascer.
    findRemittance: async (fileName) => {
      if (fileName === '' || fileName.includes('/'))
        return Promise.resolve(err('van-storage-invalid-file-name'));

      for (const prefix of [prefixes.outbound, prefixes.processed, prefixes.failed]) {
        const key = `${prefix}${fileName}`;
        const bytes = objects.get(key);
        if (bytes !== undefined) return Promise.resolve(ok({ key, bytes }));
      }

      // Mesma distinção do adapter real (#785): não achar pode ser "arquivo antigo" ou "o agente
      // passou a usar prefixo que não conhecemos", e as ações são opostas. O fake reproduz porque
      // um fake que sempre dissesse "não encontrado" deixaria verde um teste que produção separa.
      //
      // O primeiro nível é derivado das chaves que o fake guarda — é o equivalente em memória do
      // `CommonPrefixes` com delimitador.
      const known = new Set<string>(Object.values(prefixes));
      const seen = new Set(
        [...objects.keys()]
          .map((k) => k.slice(0, k.indexOf('/') + 1))
          .filter((p) => p !== '' && !known.has(p)),
      );

      return Promise.resolve(
        err(seen.size > 0 ? 'van-storage-prefix-drift' : 'van-storage-object-not-found'),
      );
    },

    // Só do fake: injeta o que o AGENTE colocaria no bucket (retorno, status). Sem isto, testar a
    // leitura exigiria que o próprio teste escrevesse em prefixo que a aplicação não escreve.
    seed: (key, content) => {
      objects.set(key, encoder.encode(content));
    },

    // Para o arquivo do banco, que não é UTF-8. `seed` codificaria a string e a suíte nunca veria
    // o byte que quebra a leitura como texto.
    seedBytes: (key, bytes) => {
      objects.set(key, bytes);
    },
  };
};
