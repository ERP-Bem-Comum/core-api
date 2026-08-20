import type { Result } from '../../../../shared/primitives/result.ts';
import type { ReturnOutcome } from '../../domain/bank-return/occurrence.ts';

// ACL do arquivo de RETORNO da VAN (#690). A application pergunta "o que o banco devolveu?"; o
// adapter é quem sabe que a resposta chega como 240 posições por linha, num layout posicional.
//
// Os tipos vivem AQUI, e não junto do parser, pela mesma razão do `VanStatusReader`: a application
// não pode importar de `adapters/` — cobrado por `tests/cleanup/application-depends-inward.test.ts`
// —, e declarar o tipo do lado de lá obrigaria exatamente esse import. O gate pegou esta versão
// fazendo isso, e o registro fica: a regra vale mesmo quando o que atravessa é "só um tipo".

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

export type VanReturnReader = Readonly<{
  parse: (content: string) => Result<ParsedReturnFile, ReturnFileError>;
}>;
