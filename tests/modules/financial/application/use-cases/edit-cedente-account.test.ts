import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
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
