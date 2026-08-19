import type { Result } from '../../../../shared/primitives/result.ts';

// Port do bucket da VAN (ADR-0060/0061). A fronteira do core-api termina aqui: a aplicação nunca
// toca a instância Windows, só o bucket.
//
// ⚠️ `putRemittance` ENFILEIRA PARA O BANCO. Gravar no prefixo de saída, com o agente no ar,
// equivale a depositar o arquivo na pasta de transmissão — não existe "salvar rascunho" ali. Para
// exercício sem risco existe `putSandbox`, e o prefixo `sandbox/` só está no bucket de homologação:
// escrever no lugar errado exige trocar o BUCKET, não o prefixo.
//
// O port é de leitura para todo o resto: quem move objeto entre prefixos é o agente, nunca nós.

export type VanStorageError =
  | 'van-storage-unavailable'
  | 'van-storage-object-not-found'
  | 'van-storage-invalid-file-name';

export type VanObjectKey = string;

export type VanStoragePort = Readonly<{
  putRemittance: (
    fileName: string,
    content: string,
  ) => Promise<Result<VanObjectKey, VanStorageError>>;
  putSandbox: (fileName: string, content: string) => Promise<Result<VanObjectKey, VanStorageError>>;
  listReturns: () => Promise<Result<readonly VanObjectKey[], VanStorageError>>;
  listStatus: () => Promise<Result<readonly VanObjectKey[], VanStorageError>>;
  getText: (key: VanObjectKey) => Promise<Result<string, VanStorageError>>;

  /**
   * O conteúdo CRU, sem decodificar.
   *
   * ⚠️ Não é uma variante de conveniência do `getText`: as duas respondem perguntas diferentes, e
   * usar a errada corrompe a resposta em silêncio.
   *
   *   `getText`  → envelope de status. JSON, UTF-8 por contrato do agente. Texto é o que ele é.
   *   `getBytes` → arquivo do banco. Posicional, encoding do BANCO, e o SHA-256 do envelope de
   *                recepção é calculado sobre estes bytes.
   *
   * Decodificar o retorno como UTF-8 para hashear reprovaria o CA4 da #753 em todo arquivo com
   * acento: o byte de um `Ç` em latin1 não é sequência UTF-8 válida, vira U+FFFD na leitura e sai
   * como outros bytes na volta. O arquivo íntegro seria acusado de adulterado.
   */
  getBytes: (key: VanObjectKey) => Promise<Result<Uint8Array, VanStorageError>>;
}>;
