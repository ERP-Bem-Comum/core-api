import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { checkCedenteConvenio } from '../../domain/cedente/remittance-eligibility.ts';
import { isActive } from '../../domain/cedente/cedente-account.ts';
import type { AccountType, CedenteAccount } from '../../domain/cedente/types.ts';
import type { CedenteAccountIdError } from '../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';
import type {
  CedenteAccountHistory,
  CedenteAccountHistoryError,
} from '../ports/cedente-account-history.ts';

export type EditCedenteAccountInput = Readonly<{
  id: string;
  // Dados bancários (travados após histórico — FR-008).
  bankCode?: string;
  agency?: string;
  // Preenchível quando ausente, pelo MESMO desenho do convênio abaixo (#856). A conta migrada nasceu
  // sem DV porque não havia coluna, e ela tem histórico — sob a trava FR-008 pura, nenhuma conta em
  // uso poderia ganhar o dígito, que é precisamente o beco medido em produção (#942/#943): o
  // operador digita a agência com o DV, o dígito é descartado, e ao reabrir a tela o campo fica vermelho e
  // trava o Salvar de TODOS os outros campos. Preencher o vazio destrava; TROCAR um DV já definido
  // continua sendo alteração de dado bancário e cai na trava.
  agencyDigit?: string;
  accountNumber?: string;
  accountDigit?: string;
  type?: string;
  // Preenchível uma vez (#722): a conta é cadastrada sem convênio — ela serve à conciliação assim —
  // e sem ele NÃO gera remessa. Sem este campo aqui, a recusa da geração mandaria o operador
  // "corrigir no cadastro" e o cadastro não teria onde.
  convenio?: string;
  // Sempre editáveis.
  typeLabel?: string; // #206: texto livre (metadado, não dado bancário travável).
  nickname?: string;
  bankName?: string;
  // #995 — SALDO DE ABERTURA. Só entrava na criação, e a ausência tinha consequência operacional
  // real: a conta migrada do legado veio com saldo congelado do começo do ano, e sem poder corrigi-lo
  // o operador criou contas NOVAS para gerar remessa — que é a origem das duplicatas que a issue
  // trata. Alinhar o saldo e informar o multipag resolveria sem duplicar nada.
  //
  // ⚠️ Travado por HISTÓRICO, como o dado bancário (FR-008). O saldo de abertura é a base de todo
  // saldo calculado: mudá-lo numa conta que já importou extrato reescreveria em silêncio o resultado
  // de cada conciliação feita em cima dele. A decisão da P.O. (06/09) é manter a edição liberada
  // nesta fase e endurecer depois — o guard por histórico é o "depois" que já dá para ter agora, sem
  // esperar a trilha de auditoria.
  openingBalanceCents?: number;
  openingBalanceDate?: string;
}>;

export type EditCedenteAccountError =
  | 'cedente-account-not-found'
  | 'cedente-account-bank-data-locked'
  | 'cedente-convenio-already-set'
  // FR-006 — o par saldo+data é coeso, e a edição pode quebrá-lo tanto quanto a criação.
  | 'opening-balance-requires-date'
  | CedenteAccountIdError
  | CedenteAccountStoreError
  | CedenteAccountHistoryError;

type Deps = Readonly<{
  cedenteStore: CedenteAccountStore;
  accountHistory: CedenteAccountHistory;
}>;

export const editCedenteAccount =
  (deps: Deps) =>
  async (
    input: EditCedenteAccountInput,
  ): Promise<Result<CedenteAccount, EditCedenteAccountError>> => {
    const id = CedenteAccountId.rehydrate(input.id);
    if (!id.ok) return id;

    const found = await deps.cedenteStore.findById(id.value);
    if (!found.ok) return found;
    if (found.value === null) return err('cedente-account-not-found');

    // `''` colapsa em ausente pela mesma razão que no construtor: é o que o front envia quando o
    // operador não digitou DV, e tratá-lo como valor faria "sem dígito" parecer "dígito definido".
    const agencyDigitPatch =
      input.agencyDigit === undefined || input.agencyDigit.trim() === ''
        ? undefined
        : input.agencyDigit.trim();

    // PREENCHER o que está vazio não é alterar dado bancário — é completar um cadastro que nasceu
    // incompleto por ausência de coluna. TROCAR um dígito já definido é, e por isso só o segundo caso
    // entra na trava FR-008.
    const wantsAgencyDigitSwap =
      agencyDigitPatch !== undefined &&
      found.value.agencyDigit !== undefined &&
      found.value.agencyDigit !== agencyDigitPatch;

    // O saldo de abertura entra na MESMA trava do dado bancário, e pela mesma razão de fundo: os dois
    // são premissas de cálculos já feitos. Mudar o saldo de abertura de uma conta que já importou
    // extrato reescreve o saldo de todos os dias seguintes, sem nada apontar a causa.
    const wantsOpeningBalanceChange =
      input.openingBalanceCents !== undefined || input.openingBalanceDate !== undefined;

    const wantsBankDataChange =
      input.bankCode !== undefined ||
      input.agency !== undefined ||
      input.accountNumber !== undefined ||
      input.accountDigit !== undefined ||
      input.type !== undefined ||
      wantsAgencyDigitSwap ||
      wantsOpeningBalanceChange;

    if (wantsBankDataChange) {
      const hist = await deps.accountHistory.hasActivity(id.value);
      if (!hist.ok) return hist;
      if (hist.value) return err('cedente-account-bank-data-locked');
    }

    // Convênio PREENCHE, não TROCA (#722). Preencher o que está vazio é o caminho de correção que a
    // recusa da remessa promete ao operador. Trocar um já preenchido é outra coisa: ele identifica o
    // contrato junto ao banco e viaja no nome de toda remessa já transmitida — reescrevê-lo faria as
    // remessas antigas apontarem para um convênio que a conta não declara mais.
    //
    // ⚠️ "JÁ DEFINIDO" É SER UM CONVÊNIO DE VERDADE, NÃO SER UMA STRING NÃO-VAZIA (#879), e a
    // diferença custou um bloqueio em PRODUÇÃO. O ETL gravava `'LEGADO'` como placeholder; o
    // `!== ''` o lia como convênio definido e recusava toda alteração. Nenhuma conta migrada podia
    // gerar remessa, e nenhuma tinha conserto — a porta que a #722 abriu foi trancada por um valor
    // que só *parecia* dado.
    //
    // A régua de "serve como convênio?" NÃO é escrita aqui: é `checkCedenteConvenio`, no domínio, e é
    // a MESMA que decide se a conta gera remessa. Uma segunda régua para o mesmo fato divergiria — e
    // a divergência entre duas réguas de elegibilidade é exatamente o defeito que a #837 fechou do
    // outro lado do módulo. Aqui só se pergunta a ela.
    //
    // ⚠️ A pergunta é `checkCedenteConvenio`, e NÃO a readiness inteira (#856). Desde que a agência
    // entrou na readiness, chamá-la aqui responderia "não serve" para uma conta cujo convênio está
    // perfeito e cuja AGÊNCIA está malformada — destravando a troca que o #722 fechou, por um
    // defeito que nada tem a ver com o convênio.
    //
    // O efeito é o correto nos dois sentidos: convênio malformado ou longo demais passa a ACEITAR
    // correção pela tela (é o que o operador precisa), e convênio válido continua RECUSANDO a troca
    // — o invariante do #722 não afrouxa.
    // ⚠️ A TRAVA VALE SÓ EM CONTA ATIVA (#995, B8.1), e a razão é a mesma que a criou. O #722 travou
    // a troca porque o convênio viaja no NOME de toda remessa transmitida: reescrevê-lo faria as
    // remessas antigas apontarem para um contrato que a conta não declara mais.
    //
    // Em conta ENCERRADA não há remessa nova a nomear. Travar o campo ali não protege coisa alguma —
    // só força `UPDATE` direto no banco de produção, que foi o que aconteceu em 06/09 e é o tipo de
    // intervenção que a #879 já mostrou custar caro. O histórico das remessas antigas continua
    // intacto: elas guardam o próprio nome de arquivo em `fin_remittances`, não uma referência viva
    // ao cadastro.
    //
    // O invariante do #722 não afrouxa onde ele importa: conta ativa segue recusando a troca.
    const wantsConvenioChange =
      input.convenio !== undefined && input.convenio.trim() !== found.value.convenio.trim();
    const currentConvenioIsUsable = checkCedenteConvenio(found.value).ok;
    if (wantsConvenioChange && currentConvenioIsUsable && isActive(found.value)) {
      return err('cedente-convenio-already-set');
    }

    const updated: CedenteAccount = {
      ...found.value,
      ...(input.bankCode !== undefined ? { bankCode: input.bankCode } : {}),
      ...(input.agency !== undefined ? { agency: input.agency } : {}),
      ...(agencyDigitPatch !== undefined ? { agencyDigit: agencyDigitPatch } : {}),
      ...(input.accountNumber !== undefined ? { accountNumber: input.accountNumber } : {}),
      ...(input.accountDigit !== undefined ? { accountDigit: input.accountDigit } : {}),
      ...(input.convenio !== undefined ? { convenio: input.convenio.trim() } : {}),
      ...(input.type !== undefined ? { type: input.type as AccountType } : {}),
      ...(input.typeLabel !== undefined ? { typeLabel: input.typeLabel } : {}),
      ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
      ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
      ...(input.openingBalanceCents !== undefined
        ? { openingBalanceCents: input.openingBalanceCents }
        : {}),
      ...(input.openingBalanceDate !== undefined
        ? { openingBalanceDate: input.openingBalanceDate }
        : {}),
    };

    // ⚠️ O PAR SALDO+DATA É COESO (FR-006), e a edição tem de cobrar isso no RESULTADO, não no
    // patch. Uma conta sem saldo que recebe só os centavos ficaria com valor e sem data — estado que
    // o construtor recusa na criação e que entraria pela edição sem esta guarda. É o mesmo invariante,
    // e a régua é a do domínio: perguntar aqui pelo `create` seria uma segunda definição do par.
    if (
      (updated.openingBalanceCents === undefined) !==
      (updated.openingBalanceDate === undefined)
    ) {
      return err('opening-balance-requires-date');
    }

    const saved = await deps.cedenteStore.save(updated);
    if (!saved.ok) return saved;
    return ok(updated);
  };
