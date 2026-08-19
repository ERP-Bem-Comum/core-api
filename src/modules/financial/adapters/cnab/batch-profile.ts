// Perfil do lote: o que muda no ENVELOPE quando a rota do pagamento muda.
//
// Fonte primária: `jun-19-layout-multipag.pdf` (local-only). Cada rota tem sua própria seção no
// manual, e as seções não declaram o mesmo header de lote: a versão do layout do lote difere entre
// elas (pp. 23, 31, 38 e 44), e há campo que existe numa seção e não existe noutra. Um header de
// lote único, parametrizado só pela forma de lançamento, emite envelope errado assim que a segunda
// rota entra — e envelope errado o banco recusa sem dizer qual campo.
//
// A forma de lançamento é DERIVADA daqui, nunca informada por quem chama (#711, CA4 e CA11).
// Enquanto existia uma rota só, quem chamava e quem pagava concordavam por acidente; com formas
// mistas, um parâmetro de entrada vira uma afirmação que o conteúdo do arquivo pode contradizer.
//
// A câmara centralizadora (P001) segue a mesma disciplina, um elo adiante: banco do favorecido
// decide a forma, e a forma decide a câmara (`clearingHouseFor`). Enquanto ela foi um opcional com
// default, o default valeu para TODOS os pagamentos — inclusive os que o banco recusa (#751).
import { ok, err, type Result } from '../../../../shared/primitives/result.ts';

// O mínimo que decide o perfil. O montador passa o pagamento inteiro; aqui só interessa o que
// participa da decisão — e é por isso que o boleto declara o código de barras: é dele que sai o
// banco emissor do título, assim como a transferência declara o banco do favorecido.
export type ProfiledPayment =
  | Readonly<{ route: 'transfer'; payeeBankCode: string }>
  | Readonly<{ route: 'pix' }>
  | Readonly<{ route: 'tax-guide' }>
  | Readonly<{ route: 'billet'; barcode: string }>;

export type CnabBatchProfile = Readonly<{
  serviceType: string; // G025
  launchForm: string; // G029 — a chave do agrupamento em lotes
  batchLayoutVersion: string; // G030 — varia por seção do manual
  // P014. `null` significa que a seção daquela rota NÃO tem o campo, e as posições saem em branco —
  // diferente de "tem o campo, e o valor é vazio". A seção de cobrança é o caso.
  paymentIndicator: string | null;
}>;

export type BatchProfileError =
  | 'remittance-launch-form-unsupported'
  | 'remittance-billet-bank-unreadable'
  | 'remittance-payee-bank-unreadable';

const SERVICE_SUPPLIER_PAYMENT = '20'; // G025
const LAUNCH_CREDIT_CURRENT_ACCOUNT = '01'; // G029 — Crédito em Conta Corrente (p. 100)
const LAUNCH_TED_OTHER_HOLDER = '41'; // G029 — TED Outra Titularidade (p. 100)
const LAUNCH_BILLET_OWN_BANK = '30'; // G029
const LAUNCH_BILLET_OTHER_BANK = '31'; // G029
const BATCH_LAYOUT_PAYMENTS = '045'; // G030 — seção de pagamentos (p. 23)
const BATCH_LAYOUT_COLLECTION = '040'; // G030 — seção de títulos de cobrança (p. 31)
const PAYMENT_INDICATOR_DEFAULT = '01'; // P014

// ─── Câmara centralizadora (P001, Segmento A, colunas 018-020) ────────────────────────────────
//
// A câmara NÃO é escolha de quem monta o arquivo, nem atributo do favorecido: é FUNÇÃO DA FORMA DE
// LANÇAMENTO. Duas leituras independentes do manual dizem a mesma coisa, e é a coincidência delas
// que sustenta esta tabela:
//
//   · a nota (2) da descrição de G029 (p. 101) tabula forma → câmara, e lista `03`, `41` e `43`
//     como as formas que transitam por câmara de TED;
//   · a ocorrência 'AK' de G059 (p. 107) instrui a preencher `018` para TED e **zeros para as
//     outras modalidades**, citando exatamente as colunas 018 a 020 do Segmento A.
//
// Crédito em conta corrente (`01`) não transita por câmara alguma — o crédito não sai do banco. Por
// isso não há default aqui: um valor por omissão só pode acertar UMA das duas modalidades, e a que
// ele errar produz registro que o próprio banco recusa (#751).
const CLEARING_TED = '018'; // P001 (p. 132) — TED (STR, CIP)
const CLEARING_NONE = '000'; // G059, ocorrência 'AK' (p. 107) — zeros fora das formas de TED
const TED_LAUNCH_FORMS: ReadonlySet<string> = new Set(['03', '41', '43']);

// Total sobre o domínio de G029, de propósito: uma forma nova entra pelo `else` e sai com zeros,
// que é o que o manual manda para tudo que não é TED — nunca herdando a câmara da forma anterior.
export const clearingHouseFor = (launchForm: string): string =>
  TED_LAUNCH_FORMS.has(launchForm) ? CLEARING_TED : CLEARING_NONE;

// Os três primeiros dígitos do código de barras são o banco emissor do título (Carta-Circular Bacen
// 2.926) — é o que separa liquidação de título do próprio banco de título de outro banco.
//
// Ler isso errado não produz arquivo malformado: produz o arquivo válido de outra operação. Por
// isso o código de barras ilegível é ERRO, e não um palpite por omissão.
const BANK_CODE_LENGTH = 3;
const readIssuerBank = (barcode: string): string | null => {
  const prefix = barcode.slice(0, BANK_CODE_LENGTH);
  return /^\d{3}$/.test(prefix) ? prefix : null;
};

// O código do banco em três posições, para COMPARAÇÃO. O zero à esquerda é do campo, não do banco:
// `001` e `1` são o mesmo Banco do Brasil, e compará-los como strings cruas classificaria um
// favorecido do próprio banco como sendo de outra instituição — que é o defeito a evitar, ao
// contrário. Devolve `null` quando não há três dígitos a ler: sem banco não há forma a derivar.
//
// Exportada porque o agrupamento em lotes compara os mesmos códigos (`batchKeyOf`, em
// `remittance-file.ts`). Duas normalizações divergiriam, e a divergência apareceria como lote
// partido em dois — cada um correto, nenhum necessário.
export const normalizeBankCode = (raw: string): string | null => {
  const trimmed = raw.trim();
  return /^\d{1,3}$/.test(trimmed) ? trimmed.padStart(BANK_CODE_LENGTH, '0') : null;
};

// Transferência e boleto são as rotas com emissor. PIX e tributo ainda não têm — e o certo, até
// terem, é a recusa nomeada: emiti-los pelo perfil de transferência mandaria ao banco um pagamento
// bem-formado para a operação errada, usando dados que aquela rota sequer consulta.
export const batchProfileFor = (
  payment: ProfiledPayment,
  cedenteBankCode: string,
): Result<CnabBatchProfile, BatchProfileError> => {
  switch (payment.route) {
    case 'transfer': {
      // Sem banco do favorecido não há forma a derivar — e o caminho por omissão custaria caro nos
      // dois sentidos: TED para quem é do próprio banco vira registro recusado; crédito em conta
      // para quem é de fora vira crédito que não sai. Recusar é a única saída que não erra.
      const payeeBank = normalizeBankCode(payment.payeeBankCode);
      if (payeeBank === null) return err('remittance-payee-bank-unreadable');

      // Favorecido no MESMO banco do cedente não precisa de transferência: o crédito é interno.
      // Emiti-lo como TED de outra titularidade é o defeito da #751 — e ele não falha o arquivo,
      // falha o registro, no validador do banco, depois de a remessa já ter sido transmitida.
      const launchForm =
        payeeBank === normalizeBankCode(cedenteBankCode)
          ? LAUNCH_CREDIT_CURRENT_ACCOUNT
          : LAUNCH_TED_OTHER_HOLDER;

      return ok({
        serviceType: SERVICE_SUPPLIER_PAYMENT,
        launchForm,
        batchLayoutVersion: BATCH_LAYOUT_PAYMENTS,
        paymentIndicator: PAYMENT_INDICATOR_DEFAULT,
      });
    }

    case 'billet': {
      const issuer = readIssuerBank(payment.barcode);
      if (issuer === null) return err('remittance-billet-bank-unreadable');

      return ok({
        serviceType: SERVICE_SUPPLIER_PAYMENT,
        launchForm: issuer === cedenteBankCode ? LAUNCH_BILLET_OWN_BANK : LAUNCH_BILLET_OTHER_BANK,
        batchLayoutVersion: BATCH_LAYOUT_COLLECTION,
        paymentIndicator: null,
      });
    }

    case 'pix':
    case 'tax-guide':
      return err('remittance-launch-form-unsupported');
  }
};
