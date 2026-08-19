// PARSER do arquivo de RETORNO — CNAB 240 Multipag, crédito em conta (#690).
//
// ## O layout não é outro: é o mesmo Segmento A
//
// O manual declara o Segmento A como `Obrigatório - Remessa / Retorno`
// (`jun-19-layout-multipag.pdf` p. 24, local-only). Não existe registro separado para o retorno —
// é o mesmo registro de 240 posições, com os campos que só o banco preenche agora preenchidos:
// `P003` (data real da efetivação), `P004` (valor real) e `G059` (as ocorrências).
//
// Isso importa porque a issue supunha um layout inédito a ser obtido, e o custo estimado vinha
// dessa suposição. O que faltava era abrir o arquivo que já estava no repositório.
//
// ## A regra que atravessa o arquivo inteiro: NUNCA falhar o lote
//
// A caixa da VAN é do CONVÊNIO (ADR-0061). Chega ali retorno de operação que nunca passou por este
// sistema — é o estado NORMAL, não caso de borda. Um parser que trate registro desconhecido, ou
// referência que não casa, como erro fatal derruba o processamento inteiro no primeiro dia de
// produção, por um arquivo legítimo. Por isso aqui:
//
//   • linha que não é registro de 240 → balde `unreadable`, a varredura continua;
//   • segmento que esta fatia não interpreta → contado em `skipped`, sem erro;
//   • registro sem `Seu Número` → entra mesmo assim, com `yourNumber: ''`. Quem decide o que fazer
//     com referência ausente é o casamento, não o parser: aqui isso é DADO, não defeito.
//
// O único erro que sobe é o arquivo sem nenhum registro legível — e mesmo esse é `Result`, não
// exceção.
//
// ## O que esta fatia NÃO faz
//
// Não casa com remessa nossa, não decide idempotência e não toca em documento. Só transforma bytes
// em registros tipados. O casamento por `G064` e os baldes de segregação são a fatia seguinte, e
// mantê-los fora daqui é o que permite testar a leitura sem banco.

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import {
  classifyOccurrences,
  splitOccurrences,
  type ReturnOutcome,
} from '../../domain/bank-return/occurrence.ts';
import {
  RECORD_LENGTH,
  at,
  batchNumber,
  recordType,
  segment,
  toRecords,
} from './positional-read.ts';

// Posições do Segmento A que o RETORNO preenche (p. 24). 1-indexed inclusivas, como o manual.
const SEU_NUMERO = [74, 93] as const; // G064 — a chave que NÓS escrevemos na remessa
const NOSSO_NUMERO = [135, 154] as const; // *G043 — a referência do banco
const DATA_REAL = [155, 162] as const; // P003 — DDMMAAAA
const VALOR_REAL = [163, 177] as const; // P004 — 13 inteiros + 2 decimais
const OCORRENCIAS = [231, 240] as const; // *G059 — até 5 códigos de 2 posições

const RECORD_FILE_HEADER = '0';
const RECORD_BATCH_HEADER = '1';
const RECORD_DETAIL = '3';
const RECORD_BATCH_TRAILER = '5';
const RECORD_FILE_TRAILER = '9';

const SEGMENT_A = 'A';

/** Um pagamento como o retorno o descreve. */
export type ReturnPayment = Readonly<{
  /** 1-indexed, como o operador conta linha ao abrir o arquivo. */
  line: number;
  /** Lote a que pertence — o mesmo `0001`/`0002` que o emissor escreveu. */
  batch: string;
  /**
   * G064. **Pode vir vazio**, e isso é dado, não defeito: retorno de operação feita fora desta
   * integração não tem referência nossa nenhuma. É o caso normal da caixa do convênio.
   */
  yourNumber: string;
  /** G043 — a referência que o BANCO atribuiu. Serve de identificador quando o nosso falta. */
  bankNumber: string;
  /** P003 como `AAAA-MM-DD`. `null` quando zerada — o pagamento não foi efetivado. */
  settledAt: string | null;
  /** P004 em centavos. `0` quando não houve efetivação. */
  settledValueCents: number;
  /** G059, na ordem em que o banco listou. */
  occurrences: readonly string[];
  /** O desfecho que as ocorrências declaram — ver `domain/bank-return/occurrence.ts`. */
  outcome: ReturnOutcome;
}>;

export type ParsedReturnFile = Readonly<{
  payments: readonly ReturnPayment[];
  /**
   * Ocorrências de escopo ARQUIVO (header/trailer de arquivo) — `HI` e companhia.
   * ⚠️ Recusa aqui invalida tudo que está dentro, mesmo que cada detalhe traga `00`.
   */
  fileOccurrences: readonly string[];
  /** Ocorrências de escopo LOTE, por número de lote — `HA` e companhia. Mesma ressalva. */
  batchOccurrences: ReadonlyMap<string, readonly string[]>;
  /** Linhas que não são registro legível de 240 posições. Não abortam a leitura. */
  unreadable: readonly number[];
  /** Registros válidos de segmento que esta fatia não interpreta (B, C, J, O, Z, 5…). */
  skipped: number;
}>;

export type ReturnFileError = 'return-file-empty' | 'return-file-no-records';

/** `DDMMAAAA` → `AAAA-MM-DD`. Zerada ou não-numérica vira `null` — data inventada é pior que ausente. */
const readDate = (raw: string): string | null => {
  const digits = raw.trim();
  if (digits.length !== 8 || !/^\d{8}$/.test(digits) || digits === '00000000') return null;
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
};

/**
 * Campo `Num` com 2 decimais → centavos.
 *
 * O valor JÁ ESTÁ em centavos quando lido como inteiro: as duas últimas posições são os decimais, e
 * o layout não traz separador. Dividir por 100 aqui reintroduziria ponto flutuante num valor
 * monetário, que é o que o `Money` do kernel existe para impedir.
 */
const readCents = (raw: string): number => {
  const digits = raw.trim();
  return /^\d+$/.test(digits) ? Number(digits) : 0;
};

const readPayment = (line: string, lineNumber: number): ReturnPayment => {
  const occurrences = splitOccurrences(at(line, ...OCORRENCIAS));

  return immutable({
    line: lineNumber,
    batch: batchNumber(line),
    yourNumber: at(line, ...SEU_NUMERO).trim(),
    bankNumber: at(line, ...NOSSO_NUMERO).trim(),
    settledAt: readDate(at(line, ...DATA_REAL)),
    settledValueCents: readCents(at(line, ...VALOR_REAL)),
    occurrences,
    outcome: classifyOccurrences(occurrences),
  });
};

/**
 * Lê um arquivo de retorno inteiro.
 *
 * Tolerante por desenho — ver o cabeçalho. O `Result` de erro cobre só o que torna a leitura sem
 * sentido: arquivo vazio, ou sem um único registro legível.
 */
export const parseReturnFile = (content: string): Result<ParsedReturnFile, ReturnFileError> => {
  if (content.trim() === '') return err('return-file-empty');

  const records = toRecords(content);
  if (records.length === 0) return err('return-file-empty');

  const payments: ReturnPayment[] = [];
  const unreadable: number[] = [];
  const batchOccurrences = new Map<string, readonly string[]>();
  let fileOccurrences: readonly string[] = [];
  let skipped = 0;
  let legible = 0;

  for (const [index, line] of records.entries()) {
    const lineNumber = index + 1;

    // Comprimento é o primeiro filtro, e não pode ser fatal: um arquivo com uma linha truncada no
    // fim (transferência interrompida) ainda tem centenas de pagamentos legíveis antes dela.
    if (line.length < RECORD_LENGTH) {
      unreadable.push(lineNumber);
      continue;
    }

    legible += 1;
    const type = recordType(line);

    if (type === RECORD_FILE_HEADER || type === RECORD_FILE_TRAILER) {
      const codes = splitOccurrences(at(line, ...OCORRENCIAS));
      // O trailer costuma trazer o veredito do arquivo; o header, raramente. Acumular os dois sem
      // sobrescrever evita depender de qual deles o banco usou.
      if (codes.length > 0) fileOccurrences = immutable([...fileOccurrences, ...codes]);
      continue;
    }

    if (type === RECORD_BATCH_HEADER || type === RECORD_BATCH_TRAILER) {
      const codes = splitOccurrences(at(line, ...OCORRENCIAS));
      if (codes.length > 0) {
        const batch = batchNumber(line);
        batchOccurrences.set(batch, immutable([...(batchOccurrences.get(batch) ?? []), ...codes]));
      }
      continue;
    }

    if (type === RECORD_DETAIL && segment(line) === SEGMENT_A) {
      payments.push(readPayment(line, lineNumber));
      continue;
    }

    // Detalhe de outro segmento, ou tipo de registro que não conhecemos. Contado, não recusado:
    // segmento novo no arquivo é mudança de contrato do banco, e derrubar a leitura por causa dela
    // deixaria de processar pagamentos que estão perfeitamente legíveis ao lado.
    skipped += 1;
  }

  if (legible === 0) return err('return-file-no-records');

  return ok(
    immutable({
      payments: immutable(payments),
      fileOccurrences,
      batchOccurrences,
      unreadable: immutable(unreadable),
      skipped,
    }),
  );
};
