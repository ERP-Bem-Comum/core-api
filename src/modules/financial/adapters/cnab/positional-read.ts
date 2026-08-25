// LEITURA posicional do CNAB 240 — o espelho de `positional.ts`, que só escreve.
//
// Os dois lados precisam existir porque o arquivo trafega nas duas direções: a remessa é montada
// aqui e o retorno é lido aqui. E a leitura tem uma assimetria que a escrita não tem — quem escreve
// controla o conteúdo, quem lê recebe o que o banco mandou, inclusive registro truncado, campo em
// branco onde se esperava número, e segmento que ainda não existia quando este código foi escrito.
//
// ⚠️ As posições são **1-indexed e inclusivas**, como o manual as publica. Converter para 0-indexed
// na cabeça, na hora de escrever cada chamada, é como se erra um campo por um caractere — e um
// deslocamento de uma posição no CNAB não falha o parse: devolve o valor do campo vizinho, com
// aparência de dado bom.
//
// Este módulo nasceu extraindo o que `remittance-inspector.ts` já fazia em privado. Uma segunda
// cópia das posições de tipo e segmento é exatamente o tipo de duplicação que diverge em silêncio:
// o dia em que o layout mudar, uma das cópias acompanha e a outra não.

/** O tamanho de todo registro CNAB 240. Linha diferente disso não é registro. */
export const RECORD_LENGTH = 240;

/**
 * O trecho `[from, to]` da linha, 1-indexed e inclusivo, **sem trim**.
 *
 * O trim é decisão de quem lê o campo, não deste helper: campo `Alfa` do layout é preenchido com
 * brancos à direita e quase sempre quer trim; campo `Num` com zeros à esquerda quase nunca quer,
 * porque `00123` e `123` são o mesmo número mas nem sempre a mesma chave.
 */
export const at = (line: string, from: number, to: number): string => line.slice(from - 1, to);

/** Posição 008: `0` header de arquivo, `1` header de lote, `3` detalhe, `5` trailer de lote, `9` trailer de arquivo. */
export const recordType = (line: string): string => at(line, 8, 8);

/** Posição 014, só em registro de detalhe: `A`, `B`, `C`, `J`, `O`, `Z`, `5`… */
export const segment = (line: string): string => at(line, 14, 14);

/** Posições 004-007 — o lote a que o registro pertence. `0000` no header/trailer de ARQUIVO. */
export const batchNumber = (line: string): string => at(line, 4, 7);

/** Posições 009-013 — o sequencial do registro DENTRO do lote (reinicia a cada lote). */
export const detailSequence = (line: string): number => Number(at(line, 9, 13));

/**
 * Quebra o conteúdo em linhas de registro, descartando as vazias.
 *
 * Aceita `\r\n` e `\n` porque o arquivo vem de uma máquina Windows e atravessa um bucket: quem
 * grava e quem lê estão em sistemas diferentes, e recusar o retorno inteiro por causa do terminador
 * seria falhar por um byte que não decide nada.
 */
export const toRecords = (content: string): readonly string[] =>
  content.split(/\r?\n/).filter((line) => line.trim() !== '');
