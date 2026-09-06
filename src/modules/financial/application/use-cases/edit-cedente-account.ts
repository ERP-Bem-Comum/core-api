import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { checkCedenteConvenio } from '../../domain/cedente/remittance-eligibility.ts';
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
}>;

export type EditCedenteAccountError =
  | 'cedente-account-not-found'
  | 'cedente-account-bank-data-locked'
  | 'cedente-convenio-already-set'
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

    const wantsBankDataChange =
      input.bankCode !== undefined ||
      input.agency !== undefined ||
      input.accountNumber !== undefined ||
      input.accountDigit !== undefined ||
      input.type !== undefined ||
      wantsAgencyDigitSwap;

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
    const wantsConvenioChange =
      input.convenio !== undefined && input.convenio.trim() !== found.value.convenio.trim();
    const currentConvenioIsUsable = checkCedenteConvenio(found.value).ok;
    if (wantsConvenioChange && currentConvenioIsUsable) {
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
    };

    const saved = await deps.cedenteStore.save(updated);
    if (!saved.ok) return saved;
    return ok(updated);
  };
