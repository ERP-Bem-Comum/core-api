import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr, ok, err } from '#src/shared/index.ts';
// W0 RED: o pré-voo do lote ainda não existe.
import { previewRemittance } from '#src/modules/financial/application/use-cases/preview-remittance.ts';
import type {
  RemittancePreviewReader,
  RemittancePreviewRow,
} from '#src/modules/financial/application/ports/remittance-preview-reader.ts';

const CONTA = {
  bank: '237',
  agency: '1234-5',
  accountNumber: '123456',
  checkDigit: '7',
  pixKey: null,
};
const SO_PIX = {
  bank: null,
  agency: null,
  accountNumber: null,
  checkDigit: null,
  pixKey: 'a@b.com',
};
const VAZIO = {
  bank: null,
  agency: null,
  accountNumber: null,
  checkDigit: null,
  pixKey: null,
};

const row = (over: Partial<RemittancePreviewRow>): RemittancePreviewRow => ({
  documentId: 'doc-1',
  paymentMethod: 'TED',
  paymentDetail: null,
  netValueCents: 10_000,
  payee: CONTA,
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
      row({ documentId: 'ted-sem-banco', payee: VAZIO }),
      row({ documentId: 'pix-ok', paymentMethod: 'PIX', payee: SO_PIX }),
      row({ documentId: 'pix-sem-chave', paymentMethod: 'PIX', payee: CONTA }),
      row({ documentId: 'boleto-ok', paymentMethod: 'Boleto', paymentDetail: '34191790010' }),
      row({ documentId: 'boleto-sem-linha', paymentMethod: 'Boleto', payee: VAZIO }),
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
    const rows = [row({ documentId: 'sem-nada', payee: VAZIO })];
    const r = await previewRemittance({ preview: reader(rows) })({ documentIds: ['sem-nada'] });

    const l = line(r, 'sem-nada');
    assert.deepEqual(l.missing, [
      'payee-bank-code',
      'payee-agency',
      'payee-account-number',
      'payee-account-digit',
    ]);
  });

  it('distingue campo a corrigir de campo a preencher', async () => {
    const rows = [row({ documentId: 'banco-nome', payee: { ...CONTA, bank: 'Bradesco S.A.' } })];
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
      row({ documentId: 'c', netValueCents: 7_000, payee: VAZIO }),
      row({ documentId: 'd', netValueCents: 3_000, payee: VAZIO }),
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

  it('documento sem forma de pagamento (Draft) não é apto, e diz isso', async () => {
    const rows = [row({ documentId: 'draft', paymentMethod: null })];
    const r = await previewRemittance({ preview: reader(rows) })({ documentIds: ['draft'] });
    assert.equal(line(r, 'draft').status, 'out-of-van');
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
