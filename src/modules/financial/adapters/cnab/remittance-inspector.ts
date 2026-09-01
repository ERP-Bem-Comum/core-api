// Inspetor estrutural do arquivo de remessa CNAB 240 Multipag.
//
// Confere, sem o banco, o que o banco conferiria: comprimento das linhas, sequência dos registros,
// numeração dos detalhes, presença do par A+B e — o mais caro — se os totais declarados nos
// trailers batem com o que o arquivo de fato contém.
//
// POR QUE EXISTE: hoje não há ambiente de homologação para remessa de pagamento. A única conexão é
// a de produção, no convênio real, onde um arquivo de teste vira pagamento de verdade (ADR-0061
// §"O que continua em aberto"). Enquanto isso não se resolve, validar a FORMA é o mais longe que
// dá para ir sem mover dinheiro.
//
// ⚠️ O QUE ELE NÃO FAZ: não valida conteúdo de negócio. Um arquivo bem formado pode pagar o
// favorecido errado, o valor errado ou na data errada — nada disso é estrutura. "Zero defeitos"
// aqui significa "o banco não recusa por forma", NUNCA "o pagamento está correto".
//
// A varredura acha os lotes pelo TIPO DE REGISTRO, nunca pela posição da linha. A versão anterior
// assumia lote único — segunda linha é header, penúltima é trailer — e teria reprovado, com
// `batch-record-count-mismatch`, todo arquivo multi-lote correto (#711, CA6).
//
// Acumula todos os defeitos numa passada, em vez de parar no primeiro: quem chama está prestes a
// transmitir dinheiro e quer a lista inteira, não um defeito por rodada.
import { LINE_TERMINATOR } from './remittance-file.ts';
import { RECORD_LENGTH, at, detailSequence, recordType, segment } from './positional-read.ts';

export type RemittanceDefectCode =
  | 'empty-file'
  | 'line-length'
  | 'non-ascii-character'
  | 'lowercase-character'
  | 'unknown-record-type'
  | 'unknown-segment'
  | 'missing-file-header'
  | 'missing-file-trailer'
  | 'missing-batch-header'
  | 'missing-batch-trailer'
  | 'detail-outside-batch'
  | 'detail-sequence-gap'
  | 'segment-a-without-b'
  // Título de cobrança com o Segmento J e sem o J-52 que o manual declara obrigatório (p. 33).
  // Enquanto este código não existiu, o arquivo saía com o trailer fechando e o inspetor aprovando:
  // o defeito era invisível de ponta a ponta, e é essa cegueira que a #891 fecha — sem ela, o
  // próximo emissor volta a esquecer o registro e nada acusa.
  | 'segment-j-without-j52'
  | 'batch-record-count-mismatch'
  | 'file-record-count-mismatch'
  | 'file-batch-count-mismatch'
  | 'batch-total-mismatch';

export type RemittanceDefect = Readonly<{
  // 1-indexed, como o operador conta linha; 0 = defeito do arquivo como um todo.
  line: number;
  code: RemittanceDefectCode;
  detail: string;
}>;

// Posições do layout (1-indexed, inclusivas) — as mesmas que os módulos de escrita usam. Vivem em
// `positional-read.ts` porque o PARSER DE RETORNO precisa exatamente delas: o Segmento A é o mesmo
// registro nas duas direções, e duas cópias das posições divergem no dia em que o layout mudar.
const batchDeclaredCount = (line: string): number => Number(at(line, 18, 23));
const batchDeclaredTotal = (line: string): number => Number(at(line, 24, 41));
const fileDeclaredBatches = (line: string): number => Number(at(line, 18, 23));
const fileDeclaredRecords = (line: string): number => Number(at(line, 24, 29));

// O J e o J-52 compartilham a coluna 014 — os DOIS gravam `'J'` (campo `*G039`). Distingui-los pelo
// VALOR de 018-019 sozinho é o defeito que esta função já teve, e ele custava caro: `at(line, 18, 19)`
// só é a Identificação de Registro Opcional (`G067`) NO J-52. No Segmento J aquelas duas posições são
// os dois primeiros dígitos do CÓDIGO DE BARRAS — `segmentJ` grava o barcode em 018-061 —, e o barcode
// começa pelo COMPE do banco emissor. `readIssuerBank` aceita qualquer três dígitos, sem allow-list,
// então um boleto de banco `52x` era lido como complemento: `paymentCentsOf` devolvia 0, o lote somava
// um pagamento a menos, e saía `batch-total-mismatch` apontando o trailer — que estava certo. Depois
// de `allocateNsa` consumir o número sob lock: NSA queimado, mensagem sem campo.
//
// ⚠️ AS TRÊS CONDIÇÕES SÃO DELIBERADAMENTE REDUNDANTES, e cada uma responde a uma pergunta DIFERENTE.
// Remover qualquer uma "porque as outras já bastam" é reabrir a classe:
//
//   1. `018-019 === '52'`      — o G067 AFIRMA ser complemento. Necessária, e sozinha ambígua.
//   2. `018-061` não é barcode — a FORMA nega: um J tem 44 dígitos ali (garantido por `isBarcode`, no
//      montador); um J-52 tem nome Alfa a partir de 036. É a borda de classe de caractere, que é a
//      testemunha honesta — contar posição dentro de corrida homogênea produz laudo confiante e falso.
//   3. `015` não é dígito      — o campo de CONTROLE nega: no J a posição é `G060` (tipo de movimento,
//      **Num**); no J-52 é `G004` CNAB (**Alfa**, brancos). Testa "não é dígito" e não "é branco"
//      porque o G060 admite outros movimentos além da inclusão, e todos continuam sendo dígito.
//
// A defesa em profundidade é a mesma escolha que `segmentJ52` faz na guarda de identificação: o
// caminho já está fechado por (2), e (1) e (3) existem contra o chamador novo e contra a edição futura
// do layout. Nenhuma das três, sozinha, sobrevive a um arquivo adversário.
const BARCODE_RUN = /^\d{44}$/;
const isSegmentJ52 = (line: string): boolean =>
  segment(line) === 'J' &&
  at(line, 18, 19) === '52' &&
  !BARCODE_RUN.test(at(line, 18, 61)) &&
  !/^\d$/.test(at(line, 15, 15));

// Quanto o registro de detalhe move — e a posição do valor NÃO é a mesma em todo segmento. `null`
// distingue "registro que não carrega valor" (o B, que complementa o A) de "segmento que a
// varredura não conhece": somar zero por desconhecimento daria um trailer conferido contra uma
// soma incompleta, que é o defeito passar despercebido em silêncio.
//
// ⚠️ Classificar o J-52 como se fosse um J faria a somatória do lote ler 153-167 — que ali é o meio do
// nome do sacador avalista, em branco. `Number('               ')` é 0, então o total FECHARIA por
// acidente, e no dia em que o sacador passasse a ser preenchido a soma daria `NaN` sem que nada
// tivesse mudado no total. É por isso que a classificação vem antes do `switch`, e por isso que ela
// não pode depender de um único campo.
const paymentCentsOf = (line: string): number | null => {
  // Antes do `switch`: o complemento não carrega valor, como o Segmento B não carrega. Somar zero
  // aqui é a afirmação de que o registro existe e não paga — distinta do `null` de baixo, que é
  // "segmento que a varredura não conhece".
  if (isSegmentJ52(line)) return 0;

  switch (segment(line)) {
    case 'A':
      return Number(at(line, 120, 134));
    case 'J':
      return Number(at(line, 153, 167));
    case 'B':
      return 0;
    default:
      return null;
  }
};

// O arquivo é ASCII 7 bits em caixa alta (layout, pág. 10). Espaço e dígito passam; qualquer coisa
// acima de `0x7E` é acento ou caractere de controle que não sobrevive ao trânsito até o mainframe.
const NON_ASCII = /[^\x20-\x7E]/;
const LOWERCASE = /[a-z]/;

// ⚠️ O QUE ESTA INSPEÇÃO DELIBERADAMENTE NÃO FAZ, e por quê — porque cada um trava a emissão
// inteira, e travar é pior que o defeito enquanto a causa não está corrigida:
//
//   · DV de CPF/CNPJ. É crítica de recusa real (G059 'AT'), mas o CNPJ do seed local reprova no
//     dígito (#804, §"não são defeitos — é dado de teste"): ligar a checagem aqui deixaria o
//     ambiente de desenvolvimento sem conseguir gerar remessa nenhuma. Entra junto com a limpeza do
//     seed, não antes.
//
//   · Endereço do favorecido no Segmento B (G059 'AU'/'AV'/'AW'/'AX'/'AY'). O campo não existe no
//     port do tradutor, então sai em branco em 100% das remessas (#858). Acusá-lo aqui hoje
//     bloquearia toda emissão — o gate tem de entrar na MESMA mudança que passa a preencher o
//     campo, e é isso que a #858 registra.
//
// A regra que as duas omissões compartilham: gate blocking só se acende quando o caminho verde já
// existe. Antes disso ele não protege ninguém — só troca um arquivo recusado pelo banco por uma
// operação parada, e o registro do defeito é a issue, não o `throw`.

// Estado do lote em aberto durante a varredura. Mutável de propósito e confinado a esta função: é
// um acumulador, não um valor de domínio.
interface OpenBatch {
  headerLine: number;
  detailCount: number;
  sumCents: number;
  sequence: number;
}

export const inspectRemittanceFile = (content: string): readonly RemittanceDefect[] => {
  const defects: RemittanceDefect[] = [];
  const add = (line: number, code: RemittanceDefectCode, detail: string): void => {
    defects.push({ line, code, detail });
  };

  if (content.trim() === '') {
    add(0, 'empty-file', 'arquivo sem conteúdo');
    return defects;
  }

  // O arquivo emitido termina em CRLF — no trailer de arquivo inclusive (#804, defeito 6) — e
  // `split` de um texto terminado devolve um elemento VAZIO no fim. Sem descartá-lo, toda remessa
  // correta seria reprovada com `line-length` e `missing-file-trailer`, e a inspeção passaria a
  // acusar justamente o arquivo bem formado.
  //
  // Descarta apenas o vazio FINAL, e apenas um: linha vazia no meio continua sendo defeito, que é
  // o que `line-length` existe para pegar. A tolerância é ao terminador, não a arquivo furado.
  const parts = content.split(LINE_TERMINATOR);
  const lines = parts.at(-1) === '' ? parts.slice(0, -1) : parts;

  lines.forEach((line, i) => {
    if (line.length !== RECORD_LENGTH) {
      add(
        i + 1,
        'line-length',
        `${String(line.length)} posições, esperado ${String(RECORD_LENGTH)}`,
      );
    }

    // ASCII e caixa alta. `alpha()` já normaliza tudo que passa por ele — acento removido, caixa
    // forçada —, então uma linha que chega aqui suja veio por outro caminho: literal montada à mão,
    // concatenação fora dos combinadores, ou um campo novo que esqueceu `text()`. É defesa em
    // profundidade contra a regressão, não contra o fluxo normal.
    //
    // ⚠️ A posição do PRIMEIRO caractere ofensor vai no detalhe. Sem ela, o operador recebe "tem
    // acento nesta linha" e volta a contar caractere a olho — que é justamente o que produz laudo
    // confiante e falso dentro de corrida homogênea.
    const nonAscii = line.search(NON_ASCII);
    if (nonAscii !== -1) {
      add(i + 1, 'non-ascii-character', `caractere não-ASCII na posição ${String(nonAscii + 1)}`);
    }

    const lower = line.search(LOWERCASE);
    if (lower !== -1) {
      add(i + 1, 'lowercase-character', `minúscula na posição ${String(lower + 1)}`);
    }
  });

  // Envelope do ARQUIVO: abre com tipo 0 e fecha com tipo 9.
  const first = lines[0] ?? '';
  const last = lines[lines.length - 1] ?? '';
  if (recordType(first) !== '0') add(1, 'missing-file-header', 'primeira linha não é tipo 0');
  if (recordType(last) !== '9') {
    add(lines.length, 'missing-file-trailer', 'última linha não é tipo 9');
  }

  let open: OpenBatch | null = null;
  let pendingSegmentA = -1;
  // O J que ainda espera o J-52, na mesma mecânica do A que espera o B: o par só se prova completo
  // quando o segundo registro chega, e o que fecha o veredito é o fim do lote.
  let pendingSegmentJ = -1;
  let batchCount = 0;

  // Os dois pares fecham JUNTOS, numa função só, e isso não é economia de linhas: são três os pontos
  // onde um lote termina — header seguinte, trailer, fim do arquivo —, e um par que fosse fechado
  // em dois deles e esquecido no terceiro deixaria de acusar exatamente no caso que a inspeção
  // existe para pegar. Uma chamada por ponto é o que torna o esquecimento impossível.
  const closePendingPairs = (): void => {
    if (pendingSegmentA !== -1) {
      add(pendingSegmentA + 1, 'segment-a-without-b', 'Segmento A sem o B correspondente');
      pendingSegmentA = -1;
    }
    if (pendingSegmentJ !== -1) {
      add(pendingSegmentJ + 1, 'segment-j-without-j52', 'Segmento J sem o J-52 correspondente');
      pendingSegmentJ = -1;
    }
  };

  // `for…of`, e não `forEach`: o lote em aberto é estado que atravessa iterações, e dentro de um
  // callback o compilador perde a reatribuição — o que obrigaria a um cast depois do laço para
  // reconhecer que o lote pode ter ficado aberto.
  for (const [i, line] of lines.entries()) {
    const type = recordType(line);

    switch (type) {
      case '1': {
        // Lote anterior que não fechou: o header seguinte é a prova de que faltou o trailer.
        if (open !== null) {
          add(open.headerLine, 'missing-batch-trailer', 'lote aberto sem registro tipo 5');
          closePendingPairs();
        }
        batchCount += 1;
        open = { headerLine: i + 1, detailCount: 0, sumCents: 0, sequence: 0 };
        break;
      }

      case '3': {
        if (open === null) {
          add(i + 1, 'detail-outside-batch', 'registro de detalhe fora de um lote');
          break;
        }

        open.detailCount += 1;
        open.sequence += 1;
        if (detailSequence(line) !== open.sequence) {
          add(
            i + 1,
            'detail-sequence-gap',
            `sequencial ${String(detailSequence(line))}, esperado ${String(open.sequence)} neste lote`,
          );
        }

        const seg = segment(line);
        const cents = paymentCentsOf(line);
        if (cents === null) {
          add(i + 1, 'unknown-segment', `segmento '${seg}' não pertence ao layout emitido`);
          break;
        }
        open.sumCents += cents;

        // Os DOIS pares do layout. O B é obrigatório para o crédito em conta, e o J-52 para o título
        // de cobrança (manual p. 33) — um A sem B e um J sem J-52 produzem, os dois, arquivo que
        // diverge do modelo do banco.
        //
        // ⚠️ "O J paga sozinho" era o que este comentário dizia, e era verdade sobre o DINHEIRO, não
        // sobre o registro: o valor viaja no J e o J-52 não carrega centavo nenhum. Foi essa leitura
        // — correta sobre o pagamento, falsa sobre o layout — que deixou o complemento faltar sem
        // que nada acusasse (#891).
        //
        // O J-52 é testado ANTES do `seg === 'J'` porque os dois gravam `'J'` na coluna 014: na
        // ordem inversa, o complemento seria contado como um J novo e acusaria "J seguido de outro
        // J" em todo par CORRETO.
        if (isSegmentJ52(line)) {
          pendingSegmentJ = -1;
        } else if (seg === 'A') {
          if (pendingSegmentA !== -1) {
            add(pendingSegmentA + 1, 'segment-a-without-b', 'Segmento A seguido de outro A');
          }
          pendingSegmentA = i;
        } else if (seg === 'B') {
          pendingSegmentA = -1;
        } else if (seg === 'J') {
          if (pendingSegmentJ !== -1) {
            add(pendingSegmentJ + 1, 'segment-j-without-j52', 'Segmento J seguido de outro J');
          }
          pendingSegmentJ = i;
        }
        break;
      }

      case '5': {
        if (open === null) {
          add(i + 1, 'missing-batch-header', 'trailer de lote sem header correspondente');
          break;
        }
        closePendingPairs();

        // Totais: é aqui que mora o defeito caro. Contagem ou somatória divergente é dinheiro que
        // não fecha, e o banco recusa o arquivo inteiro sem dizer qual campo.
        const expected = open.detailCount + 2; // header do lote + detalhes + este trailer
        if (batchDeclaredCount(line) !== expected) {
          add(
            i + 1,
            'batch-record-count-mismatch',
            `declara ${String(batchDeclaredCount(line))}, o lote tem ${String(expected)}`,
          );
        }
        if (batchDeclaredTotal(line) !== open.sumCents) {
          add(
            i + 1,
            'batch-total-mismatch',
            `declara ${String(batchDeclaredTotal(line))} centavos, o lote soma ${String(open.sumCents)}`,
          );
        }
        open = null;
        break;
      }

      case '0':
      case '9':
        break;

      default:
        add(i + 1, 'unknown-record-type', `tipo '${type}' não pertence ao layout`);
    }
  }

  if (open !== null) {
    add(open.headerLine, 'missing-batch-trailer', 'lote aberto sem registro tipo 5');
  }
  closePendingPairs();

  if (batchCount === 0) add(0, 'missing-batch-header', 'arquivo sem nenhum lote');

  if (recordType(last) === '9') {
    if (fileDeclaredRecords(last) !== lines.length) {
      add(
        lines.length,
        'file-record-count-mismatch',
        `declara ${String(fileDeclaredRecords(last))} registros, arquivo tem ${String(lines.length)} linhas`,
      );
    }
    // A contagem de lotes deixou de ser sempre 1 — e é a declaração que o banco confere contra o
    // que veio no arquivo.
    if (fileDeclaredBatches(last) !== batchCount) {
      add(
        lines.length,
        'file-batch-count-mismatch',
        `declara ${String(fileDeclaredBatches(last))} lotes, arquivo tem ${String(batchCount)}`,
      );
    }
  }

  return defects;
};

// Atalho para o caminho feliz. Continua valendo a ressalva do cabeçalho: bem formado ≠ correto.
export const isWellFormedRemittance = (content: string): boolean =>
  inspectRemittanceFile(content).length === 0;
