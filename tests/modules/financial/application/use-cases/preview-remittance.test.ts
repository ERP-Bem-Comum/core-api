import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr, ok, err } from '#src/shared/index.ts';
// W0 RED: o pré-voo do lote ainda não existe.
import { previewRemittance } from '#src/modules/financial/application/use-cases/preview-remittance.ts';
import type {
  RemittancePreviewReader,
  RemittancePreviewRow,
} from '#src/modules/financial/application/ports/remittance-preview-reader.ts';
import type { PayeePaymentTarget } from '#src/modules/financial/domain/payout/types.ts';

// As fixtures espelham o que o CADASTRO produz, não o que é cômodo escrever.
//
// ⚠️ Cadastro incompleto chega como STRING VAZIA muito mais que como `null`:
// `par_suppliers_bank_block_chk` e `par_acts_bank_block_chk` exigem as quatro colunas bancárias
// juntas nulas ou juntas preenchidas, então o banco RECUSA bloco parcialmente nulo — e a ETL teve
// de gravar `''`. Por isso existem DUAS fixtures de ausência, e um teste provando que as duas
// levam ao mesmo veredito.

// ⚠️ `checkDigit: '0'` é o dígito que o algoritmo do Bradesco produz para a conta `123456` (#734).
// Um cadastro `ready` no pré-voo precisa ser um cadastro que o banco aceitaria — na Modalidade 01 os
// dígitos são validados por ele. Fixture com DV inventado descrevia como apto um título que a
// remessa perderia.
const BANK_ACCOUNT_ONLY: PayeePaymentTarget = {
  bank: '237',
  agency: '1234-5',
  accountNumber: '123456',
  checkDigit: '0',
  pixKey: null,
};

const PIX_KEY_ONLY: PayeePaymentTarget = {
  bank: null,
  agency: null,
  accountNumber: null,
  checkDigit: null,
  pixKey: { keyType: 'email', key: 'a@b.com' },
};

// Ausência por `null`. ⚠️ Este arranjo é IMPOSSÍVEL para `supplier` e para `act` com repasse:
// `par_suppliers_payment_target_chk` exige `bank IS NOT NULL OR pix_key IS NOT NULL`. Ele é real
// para `financier` e `collaborator`, que não têm esse CHECK — e é por isso que a regra precisa
// sabê-lo tratar.
const NO_DESTINATION_NULLS: PayeePaymentTarget = {
  bank: null,
  agency: null,
  accountNumber: null,
  checkDigit: null,
  pixKey: null,
};

// Ausência por string vazia — a forma que a ETL de fato gravou.
const NO_DESTINATION_BLANKS: PayeePaymentTarget = {
  bank: '',
  agency: '   ',
  accountNumber: '',
  checkDigit: '',
  pixKey: { keyType: 'email', key: '' },
};

const row = (over: Partial<RemittancePreviewRow>): RemittancePreviewRow => ({
  documentId: 'doc-1',
  // Default APROVADO: a esmagadora maioria das fixtures testa aptidão de cadastro, que só faz
  // sentido depois de aprovado. Os casos de não-aprovação (#736) sobrescrevem o status.
  status: 'Approved',
  paymentMethod: 'TED',
  paymentDetail: null,
  netValueCents: 10_000,
  payee: BANK_ACCOUNT_ONLY,
  ...over,
});

const reader = (rows: readonly RemittancePreviewRow[]): RemittancePreviewReader => ({
  loadPreviewRows: (ids) => Promise.resolve(ok(rows.filter((r) => ids.includes(r.documentId)))),
});

const line = (r: Awaited<ReturnType<ReturnType<typeof previewRemittance>>>, id: string) => {
  assert.ok(isOk(r));
  const found = r.value.lines.find((l) => l.documentId === id);
  assert.ok(found, `linha ${id} ausente no pré-voo`);
  return found;
};

describe('previewRemittance — responde por título, sem gerar arquivo', () => {
  it('classifica cada título pela regra da forma de pagamento', async () => {
    const rows = [
      row({ documentId: 'ted-ok' }),
      row({ documentId: 'ted-sem-banco', payee: NO_DESTINATION_NULLS }),
      row({ documentId: 'pix-ok', paymentMethod: 'PIX', payee: PIX_KEY_ONLY }),
      row({ documentId: 'pix-sem-chave', paymentMethod: 'PIX', payee: BANK_ACCOUNT_ONLY }),
      // 44 dígitos — o código de barras que o Segmento J grava (G063).
      row({
        documentId: 'boleto-ok',
        paymentMethod: 'Boleto',
        paymentDetail: '23791234500000150000123456789012345678901234',
      }),
      row({ documentId: 'boleto-sem-linha', paymentMethod: 'Boleto', payee: NO_DESTINATION_NULLS }),
      row({ documentId: 'cambio', paymentMethod: 'Cambio' }),
    ];
    const ids = rows.map((r) => r.documentId);

    const r = await previewRemittance({ preview: reader(rows) })({ documentIds: ids });
    assert.ok(isOk(r));

    assert.equal(line(r, 'ted-ok').status, 'ready');
    assert.equal(line(r, 'ted-sem-banco').status, 'blocked');
    assert.equal(line(r, 'pix-ok').status, 'ready');
    assert.equal(line(r, 'pix-sem-chave').status, 'blocked');
    assert.equal(line(r, 'boleto-ok').status, 'ready');
    assert.equal(line(r, 'boleto-sem-linha').status, 'blocked');
    // Fora da VAN não é "impedido": nenhum cadastro conserta, e oferecer campo a corrigir mandaria
    // o operador a uma correção que não existe.
    assert.equal(line(r, 'cambio').status, 'out-of-van');
  });

  // O pedido literal da P.O.: "campo faltante ESTRUTURADO (ex.: missing: ['agencyDigit'])".
  // Uma string de mensagem não serve — o front precisa apontar o input.
  it('devolve os campos faltantes em lista, não em mensagem', async () => {
    const rows = [row({ documentId: 'sem-nada', payee: NO_DESTINATION_NULLS })];
    const r = await previewRemittance({ preview: reader(rows) })({ documentIds: ['sem-nada'] });

    const l = line(r, 'sem-nada');
    assert.deepEqual(l.missing, [
      'payee-bank-code',
      'payee-agency',
      'payee-account-number',
      'payee-account-digit',
    ]);
  });

  // A propriedade que ninguém guardava, e sem a qual as fixtures acima mediriam o caso raro.
  //
  // Cadastro incompleto chega como `''` (o CHECK do bloco bancário impede nulo parcial), mas a
  // regra trata as duas formas pelo mesmo caminho — `trimmed()` em payee-account.ts e `isBlank()`
  // em payout-readiness.ts colapsam ambas. Se alguém trocar isso por um `=== null`, os outros
  // testes seguem verdes e produção quebra inteira: é este caso que acusa.
  it('ausência por string vazia e por null levam ao MESMO veredito', async () => {
    const rows = [
      row({ documentId: 'nulo', payee: NO_DESTINATION_NULLS }),
      row({ documentId: 'vazio', payee: NO_DESTINATION_BLANKS }),
      row({ documentId: 'pix-nulo', paymentMethod: 'PIX', payee: NO_DESTINATION_NULLS }),
      row({ documentId: 'pix-vazio', paymentMethod: 'PIX', payee: NO_DESTINATION_BLANKS }),
    ];
    const r = await previewRemittance({ preview: reader(rows) })({
      documentIds: rows.map((x) => x.documentId),
    });

    assert.deepEqual(line(r, 'vazio').missing, line(r, 'nulo').missing);
    assert.equal(line(r, 'vazio').status, line(r, 'nulo').status);
    // Chave PIX em branco é chave ausente — não "presente e vazia".
    assert.deepEqual(line(r, 'pix-vazio').missing, ['pix-key']);
    assert.deepEqual(line(r, 'pix-vazio').missing, line(r, 'pix-nulo').missing);
  });

  it('distingue campo a corrigir de campo a preencher', async () => {
    const rows = [
      row({ documentId: 'banco-nome', payee: { ...BANK_ACCOUNT_ONLY, bank: 'Bradesco S.A.' } }),
    ];
    const r = await previewRemittance({ preview: reader(rows) })({ documentIds: ['banco-nome'] });

    const l = line(r, 'banco-nome');
    assert.deepEqual(l.missing, ['payee-bank-code']);
    // `unmappable` ≠ `missing`: o cadastro TEM o banco, o que falta é a tabela de-para.
    assert.equal(l.gaps[0]?.reason, 'unmappable');
  });
});

describe('previewRemittance — os números do pré-voo', () => {
  // "18 prontos · 3 com impedimento", com total líquido dos dois lados.
  it('conta e soma os dois lados separadamente', async () => {
    const rows = [
      row({ documentId: 'a', netValueCents: 10_000 }),
      row({ documentId: 'b', netValueCents: 25_000 }),
      row({ documentId: 'c', netValueCents: 7_000, payee: NO_DESTINATION_NULLS }),
      row({ documentId: 'd', netValueCents: 3_000, payee: NO_DESTINATION_NULLS }),
      row({ documentId: 'e', netValueCents: 99_000, paymentMethod: 'Cambio' }),
    ];
    const r = await previewRemittance({ preview: reader(rows) })({
      documentIds: ['a', 'b', 'c', 'd', 'e'],
    });
    assert.ok(isOk(r));

    assert.equal(r.value.readyCount, 2);
    assert.equal(r.value.blockedCount, 2);
    assert.equal(r.value.outOfVanCount, 1);
    assert.equal(r.value.readyTotalCents, 35_000);
    assert.equal(r.value.blockedTotalCents, 10_000);
    // O valor fora da VAN não entra em nenhum dos dois totais — somá-lo ao impedido inflaria o
    // número que o operador usa para decidir se vale correr atrás do cadastro.
    assert.equal(r.value.readyTotalCents + r.value.blockedTotalCents, 45_000);
  });
});

describe('previewRemittance — o que não pode sumir', () => {
  // Documento selecionado que o reader não devolve. Omitir a linha seria repetir o defeito que
  // este pré-voo existe para corrigir: o operador selecionou, e some sem explicação.
  it('reporta o documento inexistente em vez de omiti-lo', async () => {
    const r = await previewRemittance({ preview: reader([row({ documentId: 'existe' })]) })({
      documentIds: ['existe', 'fantasma'],
    });
    assert.ok(isOk(r));
    assert.equal(r.value.lines.length, 2);
    assert.equal(line(r, 'fantasma').status, 'not-found');
    assert.equal(line(r, 'fantasma').netValueCents, 0);
  });

  it('preserva a ordem em que o operador selecionou', async () => {
    const rows = [row({ documentId: 'x' }), row({ documentId: 'y' }), row({ documentId: 'z' })];
    const r = await previewRemittance({ preview: reader(rows) })({
      documentIds: ['z', 'x', 'y'],
    });
    assert.ok(isOk(r));
    assert.deepEqual(
      r.value.lines.map((l) => l.documentId),
      ['z', 'x', 'y'],
    );
  });

  // #736: só título Aprovado entra em remessa. Não-aprovado é `not-approved`, distinto de `blocked`
  // (falta cadastro) e de `out-of-van` (forma que a VAN não transporta) — a ação do operador é
  // aprovar, não mexer no cadastro. A checagem vem ANTES da forma: um Draft com cadastro completo
  // ainda é não-aprovado, e é isso que ele precisa ler.
  it('título não aprovado (Draft/Open) vira not-approved, mesmo com cadastro apto', async () => {
    const rows = [
      row({ documentId: 'draft', status: 'Draft', paymentMethod: null }),
      row({ documentId: 'open', status: 'Open', payee: BANK_ACCOUNT_ONLY }),
    ];
    const r = await previewRemittance({ preview: reader(rows) })({
      documentIds: ['draft', 'open'],
    });
    assert.ok(isOk(r));
    assert.equal(line(r, 'draft').status, 'not-approved');
    assert.equal(line(r, 'open').status, 'not-approved');
    // route nulo: a rota não importa antes de aprovar.
    assert.equal(line(r, 'open').route, null);
    assert.equal(r.value.notApprovedCount, 2);
  });

  it('seleção vazia devolve pré-voo vazio, não erro', async () => {
    const r = await previewRemittance({ preview: reader([]) })({ documentIds: [] });
    assert.ok(isOk(r));
    assert.deepEqual(r.value.lines, []);
    assert.equal(r.value.readyCount, 0);
  });

  // O pré-voo NÃO gera arquivo, não aloca NSA e não prende documento. Se a leitura falha, ele
  // falha — mas sem ter tocado em nada.
  it('propaga a indisponibilidade da leitura', async () => {
    const broken: RemittancePreviewReader = {
      loadPreviewRows: () => Promise.resolve(err('remittance-preview-reader-unavailable' as const)),
    };
    const r = await previewRemittance({ preview: broken })({ documentIds: ['a'] });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-preview-unavailable');
  });
});
