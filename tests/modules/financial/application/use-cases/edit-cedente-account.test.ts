import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import { checkCedenteRemittanceReadiness } from '#src/modules/financial/domain/cedente/remittance-eligibility.ts';
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
  // correção exatamente quando a remessa recusa a conta. Duas réguas para o mesmo fato divergiriam —
  // é o defeito que a #837 fechou do outro lado deste módulo.
  it('aceita a correção exatamente quando a remessa recusaria a conta', async () => {
    for (const convenio of ['', 'LEGADO', '9999999', 'ABC123']) {
      const account = buildAccount(convenio);
      const readiness = checkCedenteRemittanceReadiness({ convenio });
      const r = await editConvenio(account, '123456');

      assert.equal(
        r.ok,
        !readiness.ok,
        `convênio ${JSON.stringify(convenio)}: a edição e a remessa discordam`,
      );
    }
  });
});
