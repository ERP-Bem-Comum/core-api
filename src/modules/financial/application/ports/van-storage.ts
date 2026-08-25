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
  | 'van-storage-invalid-file-name'
  /**
   * O objeto não está em nenhum prefixo configurado **e o bucket tem prefixo que não conhecemos**
   * (#785).
   *
   * É categoria própria porque a ação é OPOSTA à de "não encontrado": ali não há nada a fazer — o
   * objeto é antigo e saiu —, aqui a fronteira com o agente mudou e alguém precisa olhar agora.
   * Colapsar as duas faz o dia em que o ciclo mudar parecer expurgo normal.
   *
   * ⚠️ Não afirma que o arquivo está no prefixo desconhecido: afirma que **existe** prefixo fora do
   * combinado. É o quanto a evidência permite dizer, e é suficiente para mandar investigar.
   */
  | 'van-storage-prefix-drift';

export type VanObjectKey = string;

/** O objeto encontrado, com a chave em que ele ESTAVA — a chave é evidência, não parâmetro. */
export type VanRemittanceObject = Readonly<{
  key: VanObjectKey;
  // `Uint8Array` não tem forma readonly no TS — o índice é mutável e nenhum utilitário o congela.
  bytes: Uint8Array;
}>;

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

  /**
   * O arquivo de remessa que está no bucket, procurado por NOME — onde quer que o agente o tenha
   * deixado.
   *
   * Existe porque a chave do objeto é um dado com prazo de validade: nós escrevemos em `saida/`, e o
   * agente MOVE para `processados/` ou `falhas/` quando o ciclo dele fecha (ADR-0060/0061). Guardar
   * a chave da escrita resolveria o caso do arquivo que ainda não saiu, e falharia exatamente no
   * caso de sucesso — que é o normal. Por isso a busca é por nome, e o retorno diz em que prefixo
   * ele estava: essa informação é diagnóstico de verdade (`falhas/` significa que o envio não
   * completou), e não parâmetro que alguém tenha de adivinhar.
   *
   * ⚠️ Devolve BYTES, não texto. O que se serve para download é o objeto como o banco o recebeu; a
   * conferência de integridade é do chamador, contra o `contentHash` da remessa.
   */
  findRemittance: (fileName: string) => Promise<Result<VanRemittanceObject, VanStorageError>>;
}>;
