import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create as createCedente,
  close as closeCedente,
} from '#src/modules/financial/domain/cedente/cedente-account.ts';
import { checkCedenteConvenio } from '#src/modules/financial/domain/cedente/remittance-eligibility.ts';
// W0 RED (019): o use-case editCedenteAccount ainda não existe.
import { editCedenteAccount } from '#src/modules/financial/application/use-cases/edit-cedente-account.ts';

// ⚠️ O default `'9999999'` tem SETE dígitos e é `cedente-convenio-too-long` para a régua da remessa
// (máximo 6 — `remittance-eligibility.ts`). Os casos que precisam de um convênio VÁLIDO passam o
// dele explicitamente; herdar o default ali faria o teste medir o caminho oposto ao que ele nomeia.
const buildAccount = (convenio = '9999999') => {
  const r = createCedente({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio,
    document: '12345678000190',
  });
  if (!r.ok) throw new Error('setup: cedente');
  return r.value;
};

// FR-008: a edição depende de a conta ter histórico (extrato importado / conciliações).
const deps = (account: unknown, hasHistory: boolean) => ({
  cedenteStore: {
    findById: (): Promise<Result<unknown, never>> => Promise.resolve(ok(account)),
    save: (): Promise<Result<void, never>> => Promise.resolve(ok(undefined)),
  },
  accountHistory: {
    hasActivity: (): Promise<Result<boolean, never>> => Promise.resolve(ok(hasHistory)),
  },
});

describe('financial/application/edit-cedente-account (019) — W0 RED', () => {
  it('CA-US3: sem histórico → edita dados bancários (agência)', async () => {
    const account = buildAccount();
    const r = await editCedenteAccount(deps(account, false) as never)({
      id: String(account.id),
      agency: '4321',
      nickname: 'Conta renomeada',
    });
    assert.equal(r.ok, true);
  });

  it('CA-US3/FR-008: com histórico, alterar dados bancários → cedente-account-bank-data-locked', async () => {
    const account = buildAccount();
    const r = await editCedenteAccount(deps(account, true) as never)({
      id: String(account.id),
      agency: '4321',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-bank-data-locked');
  });

  it('CA-US3/FR-008: com histórico, alterar só apelido/bankName → ok', async () => {
    const account = buildAccount();
    const r = await editCedenteAccount(deps(account, true) as never)({
      id: String(account.id),
      nickname: 'Apelido novo',
      bankName: 'Banco X',
    });
    assert.equal(r.ok, true);
  });
});

/*
 * O convênio: PREENCHE, não TROCA — e "já preenchido" é ser um convênio DE VERDADE (#722, #879).
 *
 * A distinção custou um bloqueio em produção: o ETL gravava `'LEGADO'` e o use case lia qualquer
 * string não-vazia como "já definido", recusando toda alteração. Nenhuma conta migrada podia gerar
 * remessa, e nenhuma tinha conserto pela tela.
 *
 * Os dois lados são medidos aqui de propósito. Um teste só do lado que a #879 corrige deixaria o
 * invariante do #722 sem rede — e afrouxá-lo é o modo de falha oposto, em que o convênio de uma
 * remessa já transmitida passa a poder ser reescrito.
 */
describe('edit-cedente-account — o convênio preenche, mas não troca (#722/#879)', () => {
  const editConvenio = async (account: ReturnType<typeof buildAccount>, convenio: string) =>
    editCedenteAccount(deps(account, false) as never)({ id: String(account.id), convenio });

  // ── O invariante do #722, que NÃO pode afrouxar ─────────────────────────────────────────────

  it('recusa trocar um convênio VÁLIDO — ele viaja no nome de toda remessa transmitida', () => {
    // Seis dígitos: o que a régua da remessa aceita. Reescrevê-lo faria as remessas antigas
    // apontarem para um convênio que a conta não declara mais.
    const account = buildAccount('123456');
    return editConvenio(account, '654321').then((r) => {
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'cedente-convenio-already-set');
    });
  });

  it('aceita reenviar o MESMO convênio válido — não é troca', async () => {
    // Idempotência: o front reenvia o formulário inteiro, e um PATCH que repete o valor atual não
    // pode ser lido como tentativa de reescrita.
    const account = buildAccount('123456');
    const r = await editConvenio(account, '123456');
    assert.equal(r.ok, true);
  });

  // ── O que a #879 destrava ───────────────────────────────────────────────────────────────────

  it('aceita corrigir o placeholder que o ETL gravava — é a #879', async () => {
    const account = buildAccount('LEGADO');
    const r = await editConvenio(account, '123456');
    assert.equal(r.ok, true, 'conta migrada tem de ter via de correção pela tela');
  });

  it('aceita preencher o convênio VAZIO — o caminho que a #722 abriu', async () => {
    const account = buildAccount('');
    const r = await editConvenio(account, '123456');
    assert.equal(r.ok, true);
  });

  it('aceita corrigir convênio LONGO demais — o operador confere com o banco', async () => {
    // Sete dígitos passam pelo cadastro e são recusados pela remessa (`cedente-convenio-too-long`).
    // Sem esta correção, a conta ficaria no mesmo beco do `'LEGADO'`: recusada lá, intocável aqui.
    const account = buildAccount('9999999');
    const r = await editConvenio(account, '999999');
    assert.equal(r.ok, true);
  });

  // A propriedade que amarra as duas metades, e a razão de a régua ser UMA só: o use case aceita a
  // correção exatamente quando a remessa recusa a conta POR CAUSA DO CONVÊNIO. Duas réguas para o
  // mesmo fato divergiriam — é o defeito que a #837 fechou do outro lado deste módulo.
  //
  // ⚠️ A régua é `checkCedenteConvenio`, e não a readiness inteira (#856). Desde que a agência entrou
  // na readiness, usá-la aqui mediria outra coisa: uma conta de agência malformada responderia
  // "a remessa recusa" e o teste passaria a exigir que a edição destravasse a troca de um convênio
  // que está perfeito — o oposto do invariante do #722.
  it('aceita a correção exatamente quando a remessa recusaria a conta pelo convênio', async () => {
    for (const convenio of ['', 'LEGADO', '9999999', 'ABC123']) {
      const account = buildAccount(convenio);
      const readiness = checkCedenteConvenio({ convenio });
      const r = await editConvenio(account, '123456');

      assert.equal(
        r.ok,
        !readiness.ok,
        `convênio ${JSON.stringify(convenio)}: a edição e a remessa discordam`,
      );
    }
  });
});

/**
 * O SALDO DE ABERTURA passa a ser editável (#995).
 *
 * ⚠️ A AUSÊNCIA DISSO É A ORIGEM OPERACIONAL DAS DUPLICATAS. A conta migrada do legado veio com o
 * saldo congelado do começo do ano, e o campo só existia na criação — sem poder corrigi-lo, o
 * operador criou contas NOVAS para conseguir gerar remessa. Alinhar o saldo e informar o multipag
 * resolveria sem duplicar nada.
 *
 * ⚠️ E ELE ENTRA NA TRAVA FR-008, junto com o dado bancário, pela mesma razão de fundo: o saldo de
 * abertura é a BASE de todo saldo calculado. Mudá-lo numa conta que já importou extrato reescreveria
 * em silêncio o resultado de cada conciliação feita em cima dele — e nada apontaria a causa. A P.O.
 * decidiu manter a edição liberada nesta fase e endurecer depois; o guard por histórico é o "depois"
 * que já dá para ter agora, sem esperar a trilha de auditoria.
 */
describe('edit-cedente-account — o saldo de abertura (#995)', () => {
  const editBalance = async (
    account: unknown,
    patch: Readonly<{ openingBalanceCents?: number; openingBalanceDate?: string }>,
    hasHistory = false,
  ) =>
    editCedenteAccount(deps(account, hasHistory) as never)({
      id: String((account as { id: unknown }).id),
      ...patch,
    });

  it('corrige o saldo congelado do legado — o caminho que evitava a duplicata', async () => {
    const r = await editBalance(buildAccount('123456'), {
      openingBalanceCents: 250_000,
      openingBalanceDate: '2026-09-01',
    });

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.openingBalanceCents, 250_000);
      assert.equal(r.value.openingBalanceDate, '2026-09-01');
    }
  });

  // ⚠️ A guarda que protege a conciliação: com extrato importado, o saldo de abertura vira premissa
  // de cálculos já feitos.
  it('conta COM histórico recusa a edição do saldo — ele é a base do que já foi conciliado', async () => {
    const r = await editBalance(
      buildAccount('123456'),
      { openingBalanceCents: 1, openingBalanceDate: '2026-09-01' },
      true,
    );

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-bank-data-locked');
  });

  /*
   * FR-006 — o par saldo+data é coeso, e a EDIÇÃO pode quebrá-lo de um jeito que a criação não pode.
   *
   * O construtor recusa "um sem o outro" porque recebe os dois de uma vez. A edição recebe um patch:
   * mandar só os centavos numa conta que não tinha saldo deixaria valor sem data — estado que o
   * domínio nunca produziria. Por isso a checagem é sobre o RESULTADO, não sobre o patch.
   */
  it('FR-006: mandar só os centavos numa conta sem saldo é recusado', async () => {
    const r = await editBalance(buildAccount('123456'), { openingBalanceCents: 100 });

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'opening-balance-requires-date');
  });

  // O outro lado do par: numa conta que JÁ tem os dois, mandar só um é legítimo — o resultado
  // continua coeso. Sem este caso, alguém "corrigiria" a guarda para olhar o patch e quebraria isto.
  it('FR-006: numa conta que já tem o par, corrigir só um dos dois é aceito', async () => {
    const withBalance = {
      ...buildAccount('123456'),
      openingBalanceCents: 100,
      openingBalanceDate: '2026-01-01',
    };
    const r = await editBalance(withBalance, { openingBalanceCents: 999 });

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.openingBalanceCents, 999);
      assert.equal(r.value.openingBalanceDate, '2026-01-01', 'a data se perdeu na edição');
    }
  });
});

/**
 * O CONVÊNIO VOLTA A SER EDITÁVEL NA CONTA ENCERRADA (#995, B8.1).
 *
 * A trava do #722 existe porque o convênio viaja no NOME de toda remessa transmitida — reescrevê-lo
 * numa conta ATIVA faria as remessas antigas apontarem para um contrato que a conta não declara
 * mais. Em conta ENCERRADA não há remessa nova a nomear, e travar ali não protege nada: só força
 * `UPDATE` direto no banco de produção, que foi o que aconteceu em 06/09.
 */
describe('edit-cedente-account — o convênio na conta encerrada (#995 B8.1)', () => {
  const editConvenio = async (account: unknown, convenio: string) =>
    editCedenteAccount(deps(account, false) as never)({
      id: String((account as { id: unknown }).id),
      convenio,
    });

  const closedAccount = (convenio: string) => {
    const closed = closeCedente(buildAccount(convenio));
    if (!closed.ok) throw new Error('setup: close');
    return closed.value;
  };

  it('conta ENCERRADA aceita trocar um convênio válido — a trava do #722 não a alcança', async () => {
    const account = closedAccount('123456');
    const r = await editConvenio(account, '654321');

    assert.equal(r.ok, true, 'conta encerrada não tem remessa nova a nomear');
    if (r.ok) assert.equal(r.value.convenio, '654321');
  });

  // O outro lado, e é o invariante que NÃO pode afrouxar: em conta ativa a recusa continua.
  it('conta ATIVA com convênio válido continua recusando a troca', async () => {
    const account = buildAccount('123456');
    const r = await editConvenio(account, '654321');

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-convenio-already-set');
  });

  /*
   * ⚠️ B8.2 — LIMPAR o convênio é o que DESATIVA a numeração da linha morta.
   *
   * Vazio foi escolhido no lugar de `000000` porque já significa isso em todo o caminho:
   * `checkCedenteConvenio` o recusa com `cedente-convenio-missing` ANTES do `allocateNsa` — e é essa
   * ordem que importa, porque o número não volta. `000000` seria aceito pela régua (não é vazio, é
   * numérico, cabe em 6), então a linha zerada continuaria contando como apta a pagar, e a recusa
   * viria do BANCO, depois do NSA queimado. Mesmo padrão da #942.
   */
  it('B8.2: limpar o convênio da conta encerrada desativa a numeração dela', async () => {
    const account = closedAccount('123456');
    const r = await editConvenio(account, '');

    assert.equal(r.ok, true, 'a borda ou o use case ainda barram limpar o campo');
    if (r.ok) {
      assert.equal(r.value.convenio, '');
      // A prova de que "desativou": a régua da remessa passa a recusar, e com nome próprio.
      const readiness = checkCedenteConvenio(r.value);
      assert.equal(readiness.ok, false);
      if (!readiness.ok) assert.equal(readiness.error, 'cedente-convenio-missing');
    }
  });

  // O contraponto que impede o B8.2 de virar buraco: limpar NÃO é privilégio de conta encerrada por
  // acaso — em conta ATIVA com convênio válido, limpar é uma TROCA, e a trava do #722 a recusa.
  // Sem este caso, alguém poderia desativar a numeração da conta que está pagando.
  it('B8.2: conta ATIVA não pode ser desativada pela limpeza do convênio', async () => {
    const account = buildAccount('123456');
    const r = await editConvenio(account, '');

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-convenio-already-set');
  });

  // ⚠️ A trava FR-008 é OUTRA e continua valendo: ela olha dado bancário, não convênio. Uma conta
  // encerrada COM histórico não vira porta aberta para reescrever agência ou conta.
  it('encerrada não vira passe livre: dado bancário segue travado por histórico', async () => {
    const account = closedAccount('123456');
    const r = await editCedenteAccount(deps(account, true) as never)({
      id: String(account.id),
      agency: '4321',
    });

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-bank-data-locked');
  });
});

/**
 * O DV DA AGÊNCIA na edição (#856 · #942/#943).
 *
 * O beco medido em produção: a conta migrada tem histórico e nasceu SEM dígito, porque não havia
 * coluna. Sob a trava FR-008 pura, nenhuma conta em uso poderia ganhar o dado — o operador digita
 * o DV, ele é descartado, e ao reabrir a tela o campo volta vermelho e desabilita o Salvar de TODOS
 * os outros campos. É o mesmo desenho que a #722 deu ao convênio: PREENCHER o vazio destrava,
 * TROCAR o que já existe continua sendo alteração de dado bancário.
 */
describe('edit-cedente-account — o DV da agência (#856)', () => {
  const editAgencyDigit = async (account: unknown, agencyDigit: string, hasHistory = true) =>
    editCedenteAccount(deps(account, hasHistory) as never)({
      id: String((account as { id: unknown }).id),
      agencyDigit,
    });

  it('preenche o DV ausente MESMO com histórico — é o que destrava a conta migrada', async () => {
    const account = buildAccount('123456');
    const r = await editAgencyDigit(account, '5');
    assert.equal(r.ok, true, 'conta em uso tem de poder completar o cadastro');
    if (r.ok) assert.equal(r.value.agencyDigit, '5');
  });

  it('TROCAR um DV já definido, com histórico, cai na trava de dado bancário', async () => {
    const account = { ...buildAccount('123456'), agencyDigit: '5' };
    const r = await editAgencyDigit(account, '7');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-bank-data-locked');
  });

  it('sem histórico, trocar o DV é permitido como qualquer dado bancário', async () => {
    const account = { ...buildAccount('123456'), agencyDigit: '5' };
    const r = await editAgencyDigit(account, '7', false);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.agencyDigit, '7');
  });

  // Reenviar o mesmo valor não é troca. Sem isto, o front — que manda o formulário inteiro —
  // receberia `bank-data-locked` ao salvar apenas o apelido de uma conta que já tem DV.
  it('reenviar o MESMO DV não conta como alteração', async () => {
    const account = { ...buildAccount('123456'), agencyDigit: '5' };
    const r = await editAgencyDigit(account, '5');
    assert.equal(r.ok, true);
  });

  // ⚠️ `''` é o que o front envia quando o operador não digitou DV. Tratá-lo como VALOR faria "sem
  // dígito" virar "dígito definido", e a próxima tentativa de preencher cairia na trava — o beco de
  // volta, por outra porta.
  it('string vazia é ausência, não valor — não define nem apaga', async () => {
    const account = buildAccount('123456');
    const r = await editAgencyDigit(account, '   ');
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.agencyDigit, undefined);
  });
});
