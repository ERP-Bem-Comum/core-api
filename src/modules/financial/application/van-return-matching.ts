/**
 * CASAMENTO do retorno com o que enviamos (#690) — e a segregação do que não casa.
 *
 * A caixa da VAN é do CONVÊNIO (ADR-0061): chegam ali retornos de operações que nunca passaram por
 * este sistema. Não é caso de borda, é o estado normal. O requisito que atravessa esta função é o
 * que a issue chama de defeito prevenido:
 *
 *   **um lote NUNCA falha por causa de uma referência desconhecida.**
 *
 * Um processamento que tratasse "não é nosso" como erro fatal derrubaria o lote inteiro no primeiro
 * dia de produção, por um arquivo legítimo — e o sintoma ("o retorno não processa") não apontaria
 * para lugar nenhum do nosso código.
 *
 * ## Por que TRÊS motivos de segregação, e não um `unmatched`
 *
 * O CA3 da issue é explícito: *"é possível saber por que não casou — 'não casou' sozinho não
 * permite diagnosticar"*. Os três pedem ações OPOSTAS de quem investiga:
 *
 *   `no-reference`      o banco devolveu sem `Seu Número`. Ou é operação de fora da integração — o
 *                       caso normal, e nada há a fazer —, ou o emissor mandou o campo em branco, o
 *                       que é defeito NOSSO e some se for agregado ao balde genérico.
 *   `unknown-reference` veio referência, e não é nossa. Convênio compartilhado, ou remessa de um
 *                       ambiente diferente. Investiga-se de fora para dentro.
 *   `unreadable`        a linha nem virou registro. Defeito de canal ou de formato — investiga-se
 *                       com o transporte, não com o banco.
 *
 * É função PURA: recebe o que já foi lido e o que já foi consultado, devolve os baldes. Não há I/O
 * aqui, e é por isso que os casos de aceite da issue são testáveis sem bucket nem banco.
 */

import { immutable } from '../../../shared/primitives/immutable.ts';
import type { ReturnPayment } from './ports/van-return-reader.ts';
import type { RemittanceDocumentRef } from './ports/van-return-match-reader.ts';

/** Erro interno em EN kebab-case, como manda a tabela de idioma do CLAUDE.md. */
export type SegregationReason = 'no-reference' | 'unknown-reference' | 'unreadable';

export type MatchedReturn = Readonly<{
  payment: ReturnPayment;
  ref: RemittanceDocumentRef;
}>;

export type SegregatedReturn = Readonly<{
  reason: SegregationReason;
  /** 1-indexed — como o operador conta linha ao abrir o arquivo. */
  line: number;
  /** A referência lida, quando houve alguma. Vazia em `no-reference` e `unreadable`. */
  yourNumber: string;
  /** A referência do BANCO. É o que permite falar do registro quando a nossa falta. */
  bankNumber: string;
}>;

export type ReturnMatching = Readonly<{
  /** Casaram com remessa nossa. */
  matched: readonly MatchedReturn[];
  /** Não casaram — cada um com o motivo que distingue a ação. */
  segregated: readonly SegregatedReturn[];
  /**
   * O lote FALHOU? Sempre `false`, e o campo existe para dizer isso explicitamente.
   *
   * Não é adorno: a issue nasceu de um modo de falha em que "nenhum casou" era tratado como erro do
   * lote. Um campo que sempre responde `false` é mais difícil de reintroduzir por engano do que uma
   * ausência — quem for mudar isso tem de apagar uma linha que declara o contrário.
   */
  batchFailed: false;
}>;

/**
 * A chave de negócio de um registro do retorno.
 *
 * Preferimos o `yourNumber` (nosso, único por construção — `fin_remittance_documents` tem UNIQUE
 * nele). Sem ele, cai para a referência do banco, que também identifica o registro. Sem as duas,
 * usa a linha: pior chave das três, mas melhor que colapsar registros distintos num só.
 *
 * ⚠️ É o que sustenta a idempotência do CA6 no nível desta função: reprocessar o MESMO arquivo
 * produz exatamente os mesmos baldes, com as mesmas chaves. A idempotência do EFEITO — não pagar
 * duas vezes um título já baixado — depende de persistir essa chave, e é a fatia seguinte.
 */
export const returnPaymentKey = (payment: ReturnPayment): string =>
  payment.yourNumber !== ''
    ? `your:${payment.yourNumber}`
    : payment.bankNumber !== ''
      ? `bank:${payment.bankNumber}`
      : `line:${String(payment.line)}`;

const segregate = (payment: ReturnPayment, reason: SegregationReason): SegregatedReturn =>
  immutable({
    reason,
    line: payment.line,
    yourNumber: payment.yourNumber,
    bankNumber: payment.bankNumber,
  });

/**
 * Casa os pagamentos lidos com os vínculos conhecidos.
 *
 * `known` é o que o `VanReturnMatchReader` devolveu para as chaves pedidas — ausência ali significa
 * "não é nossa", nunca "falhou a consulta". Quem distingue as duas coisas é o chamador, antes de
 * chegar aqui: uma consulta que falhou não pode virar duzentos registros segregados como
 * desconhecidos, porque isso pareceria um incidente do banco quando é indisponibilidade nossa.
 */
export const matchReturnPayments = (
  payments: readonly ReturnPayment[],
  known: readonly RemittanceDocumentRef[],
  unreadableLines: readonly number[] = [],
): ReturnMatching => {
  const byYourNumber = new Map(known.map((ref) => [ref.yourNumber, ref]));

  const matched: MatchedReturn[] = [];
  const segregated: SegregatedReturn[] = [];

  for (const payment of payments) {
    if (payment.yourNumber === '') {
      segregated.push(segregate(payment, 'no-reference'));
      continue;
    }

    const ref = byYourNumber.get(payment.yourNumber);
    if (ref === undefined) {
      segregated.push(segregate(payment, 'unknown-reference'));
      continue;
    }

    matched.push(immutable({ payment, ref }));
  }

  // As linhas que nem viraram registro entram no MESMO balde de segregação, com motivo próprio. Um
  // relatório que as deixasse de fora contaria menos registros do que o arquivo tem, e a diferença
  // sumiria sem ninguém notar — que é como perda silenciosa de evidência de pagamento acontece.
  for (const line of unreadableLines) {
    segregated.push(
      immutable({ reason: 'unreadable' as const, line, yourNumber: '', bankNumber: '' }),
    );
  }

  return immutable({
    matched: immutable(matched),
    segregated: immutable(segregated),
    batchFailed: false as const,
  });
};
