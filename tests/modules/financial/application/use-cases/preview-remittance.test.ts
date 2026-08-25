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
import type { CedenteAccountStore } from '#src/modules/financial/application/ports/cedente-account-store.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';
// Padrão D (module-as-namespace), como o próprio VO documenta.
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { createRemittanceBatchPlanner } from '#src/modules/financial/adapters/cnab/batch-planner.ts';

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
  payableId: 'pay-1',
  // A NOTA de origem viaja junto: quem paga é o título, mas o favorecido é do documento (é dele o
  // fornecedor). O front também precisa dela para agrupar os títulos da mesma nota no grid.
  documentId: 'doc-1',
  // Default APROVADO: a esmagadora maioria das fixtures testa aptidão de cadastro, que só faz
  // sentido depois de aprovado. Os casos de não-aprovação (#736) sobrescrevem o status.
  status: 'Approved',
  paymentMethod: 'TED',
  paymentDetail: null,
  valueCents: 10_000,
  payee: BANK_ACCOUNT_ONLY,
  ...over,
});

const reader = (rows: readonly RemittancePreviewRow[]): RemittancePreviewReader => ({
  loadPreviewRows: (ids) => Promise.resolve(ok(rows.filter((r) => ids.includes(r.payableId)))),
});

// ─── Conta-cedente: o pré-voo passou a exigi-la (#804, CA7) ─────────────────────────────────────
//
// Sem ela a forma de lançamento é INDETERMINÁVEL — crédito em conta e TED se distinguem comparando
// o banco do favorecido com o do cedente —, e sem a forma não há como repartir a seleção em lotes.
//
// O banco da conta é `237`, o MESMO de `BANK_ACCOUNT_ONLY`: é o que torna visível a distinção entre
// crédito interno e transferência interbancária nas fixtures abaixo.
const CEDENTE_ACCOUNT_ID = CedenteAccountId.generate();

const CEDENTE_ACCOUNT: CedenteAccount = {
  id: CEDENTE_ACCOUNT_ID,
  bankCode: '237',
  agency: '1234',
  accountNumber: '567890',
  accountDigit: '1',
  convenio: '000000',
  document: '12345678000199',
  status: 'Active',
  nextNsa: 1,
};

const accountStore = (account: CedenteAccount | null): CedenteAccountStore =>
  ({
    findById: () => Promise.resolve(ok(account)),
  }) as unknown as CedenteAccountStore;

// Wrapper que injeta as dependências novas e o id da conta.
//
// Existe para que as chamadas já escritas não precisem repetir o que não estão testando: quem
// verifica classificação de título não deveria ter de montar conta-cedente. O planejador é o
// adapter REAL, e de propósito — um fake reimplementaria a régua de agrupamento dentro do teste, e
// duas réguas divergem. É a mesma razão de o front não poder replicá-la.
const runPreview = (deps: Readonly<{ preview: RemittancePreviewReader }>) => {
  const useCase = previewRemittance({
    preview: deps.preview,
    cedenteAccounts: accountStore(CEDENTE_ACCOUNT),
    batchPlanner: createRemittanceBatchPlanner(),
  });
  return (input: Readonly<{ payableIds: readonly string[] }>) =>
    useCase({ cedenteAccountId: CEDENTE_ACCOUNT_ID, payableIds: input.payableIds });
};

const line = (r: Awaited<ReturnType<ReturnType<typeof previewRemittance>>>, id: string) => {
  assert.ok(isOk(r));
  const found = r.value.lines.find((l) => l.payableId === id);
  assert.ok(found, `linha ${id} ausente no pré-voo`);
  return found;
};

describe('previewRemittance — responde por título, sem gerar arquivo', () => {
  it('classifica cada título pela regra da forma de pagamento', async () => {
    const rows = [
      row({ payableId: 'ted-ok' }),
      row({ payableId: 'ted-sem-banco', payee: NO_DESTINATION_NULLS }),
      row({ payableId: 'pix-ok', paymentMethod: 'PIX', payee: PIX_KEY_ONLY }),
      row({ payableId: 'pix-sem-chave', paymentMethod: 'PIX', payee: BANK_ACCOUNT_ONLY }),
      // 44 dígitos — o código de barras que o Segmento J grava (G063).
      row({
        payableId: 'boleto-ok',
        paymentMethod: 'Boleto',
        paymentDetail: '23791234500000150000123456789012345678901234',
      }),
      row({ payableId: 'boleto-sem-linha', paymentMethod: 'Boleto', payee: NO_DESTINATION_NULLS }),
      row({ payableId: 'cambio', paymentMethod: 'Cambio' }),
    ];
    const ids = rows.map((r) => r.payableId);

    const r = await runPreview({ preview: reader(rows) })({ payableIds: ids });
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
    const rows = [row({ payableId: 'sem-nada', payee: NO_DESTINATION_NULLS })];
    const r = await runPreview({ preview: reader(rows) })({ payableIds: ['sem-nada'] });

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
      row({ payableId: 'nulo', payee: NO_DESTINATION_NULLS }),
      row({ payableId: 'vazio', payee: NO_DESTINATION_BLANKS }),
      row({ payableId: 'pix-nulo', paymentMethod: 'PIX', payee: NO_DESTINATION_NULLS }),
      row({ payableId: 'pix-vazio', paymentMethod: 'PIX', payee: NO_DESTINATION_BLANKS }),
    ];
    const r = await runPreview({ preview: reader(rows) })({
      payableIds: rows.map((x) => x.payableId),
    });

    assert.deepEqual(line(r, 'vazio').missing, line(r, 'nulo').missing);
    assert.equal(line(r, 'vazio').status, line(r, 'nulo').status);
    // Chave PIX em branco é chave ausente — não "presente e vazia".
    assert.deepEqual(line(r, 'pix-vazio').missing, ['pix-key']);
    assert.deepEqual(line(r, 'pix-vazio').missing, line(r, 'pix-nulo').missing);
  });

  it('distingue campo a corrigir de campo a preencher', async () => {
    const rows = [
      row({ payableId: 'banco-nome', payee: { ...BANK_ACCOUNT_ONLY, bank: 'Bradesco S.A.' } }),
    ];
    const r = await runPreview({ preview: reader(rows) })({ payableIds: ['banco-nome'] });

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
      row({ payableId: 'a', valueCents: 10_000 }),
      row({ payableId: 'b', valueCents: 25_000 }),
      row({ payableId: 'c', valueCents: 7_000, payee: NO_DESTINATION_NULLS }),
      row({ payableId: 'd', valueCents: 3_000, payee: NO_DESTINATION_NULLS }),
      row({ payableId: 'e', valueCents: 99_000, paymentMethod: 'Cambio' }),
    ];
    const r = await runPreview({ preview: reader(rows) })({
      payableIds: ['a', 'b', 'c', 'd', 'e'],
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
    const r = await runPreview({ preview: reader([row({ payableId: 'existe' })]) })({
      payableIds: ['existe', 'fantasma'],
    });
    assert.ok(isOk(r));
    assert.equal(r.value.lines.length, 2);
    assert.equal(line(r, 'fantasma').status, 'not-found');
    assert.equal(line(r, 'fantasma').valueCents, 0);
  });

  it('preserva a ordem em que o operador selecionou', async () => {
    const rows = [row({ payableId: 'x' }), row({ payableId: 'y' }), row({ payableId: 'z' })];
    const r = await runPreview({ preview: reader(rows) })({
      payableIds: ['z', 'x', 'y'],
    });
    assert.ok(isOk(r));
    assert.deepEqual(
      r.value.lines.map((l) => l.payableId),
      ['z', 'x', 'y'],
    );
  });

  // #736: só título Aprovado entra em remessa. Não-aprovado é `not-approved`, distinto de `blocked`
  // (falta cadastro) e de `out-of-van` (forma que a VAN não transporta) — a ação do operador é
  // aprovar, não mexer no cadastro. A checagem vem ANTES da forma: um Draft com cadastro completo
  // ainda é não-aprovado, e é isso que ele precisa ler.
  it('título não aprovado (Draft/Open) vira not-approved, mesmo com cadastro apto', async () => {
    const rows = [
      row({ payableId: 'draft', status: 'Draft', paymentMethod: null }),
      row({ payableId: 'open', status: 'Open', payee: BANK_ACCOUNT_ONLY }),
    ];
    const r = await runPreview({ preview: reader(rows) })({
      payableIds: ['draft', 'open'],
    });
    assert.ok(isOk(r));
    assert.equal(line(r, 'draft').status, 'not-approved');
    assert.equal(line(r, 'open').status, 'not-approved');
    // route nulo: a rota não importa antes de aprovar.
    assert.equal(line(r, 'open').route, null);
    assert.equal(r.value.notApprovedCount, 2);
  });

  // #792 / ADR-0065 §5 (CA2 da issue) — o título que JÁ saiu numa remessa.
  //
  // Este é o caso que a issue existe para corrigir: antes, o operador selecionava um título já
  // enviado, o pré-voo dizia `ready`, e a recusa (`remittance-payables-already-held`) só chegava no
  // último clique — depois de ele confirmar acreditando ter conferido.
  it('título já transmitido vira `transmitted` — nunca `ready`, nunca `not-approved`', async () => {
    const rows = [
      row({ payableId: 'ja-foi', status: 'Transmitted', payee: BANK_ACCOUNT_ONLY }),
      row({ payableId: 'pode-ir', status: 'Approved', payee: BANK_ACCOUNT_ONLY }),
    ];
    const r = await runPreview({ preview: reader(rows) })({
      payableIds: ['ja-foi', 'pode-ir'],
    });
    assert.ok(isOk(r));

    assert.equal(line(r, 'ja-foi').status, 'transmitted');
    assert.notEqual(
      line(r, 'ja-foi').status,
      'ready',
      'prometer `ready` faria a recusa chegar no último clique — o defeito da #792',
    );
    assert.notEqual(
      line(r, 'ja-foi').status,
      'not-approved',
      'mandaria o operador aprovar um título que já está aprovado e já foi ao banco',
    );
    assert.equal(r.value.transmittedCount, 1);
    assert.equal(r.value.notApprovedCount, 0, 'o balde de não-aprovado não absorve o transmitido');
  });

  // O contraste que impede alguém de "simplificar" fundindo as duas checagens: o título transmitido
  // não entra no lote, e o aprovado ao lado dele continua entrando normalmente.
  it('o transmitido fica fora do lote, e não contamina o título que pode ir', async () => {
    const rows = [
      row({ payableId: 'ja-foi', status: 'Transmitted', payee: BANK_ACCOUNT_ONLY }),
      row({ payableId: 'pode-ir', status: 'Approved', payee: BANK_ACCOUNT_ONLY }),
    ];
    const r = await runPreview({ preview: reader(rows) })({
      payableIds: ['ja-foi', 'pode-ir'],
    });
    assert.ok(isOk(r));

    assert.equal(line(r, 'pode-ir').status, 'ready');
    assert.equal(r.value.readyCount, 1);
    assert.equal(
      r.value.readyTotalCents,
      line(r, 'pode-ir').valueCents,
      'o valor do transmitido não entra no total do que seria enviado',
    );
    // `route` nulo pelo mesmo motivo do não-aprovado: a rota não importa para quem já foi.
    assert.equal(line(r, 'ja-foi').route, null);
  });

  it('seleção vazia devolve pré-voo vazio, não erro', async () => {
    const r = await runPreview({ preview: reader([]) })({ payableIds: [] });
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
    const r = await runPreview({ preview: broken })({ payableIds: ['a'] });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-preview-unavailable');
  });
});

describe('previewRemittance — a composição dos lotes (#804, CA7)', () => {
  // O que a tela de confirmação precisa saber ANTES de o operador confirmar: quantos lotes o
  // arquivo terá, e o total de cada um. O agrupamento é do EMISSOR, e o front não deve replicá-lo —
  // duas réguas divergiriam e a tela mentiria sobre o que o arquivo contém.
  const OUTRO_BANCO: PayeePaymentTarget = { ...BANK_ACCOUNT_ONLY, bank: '341' };
  const TERCEIRO_BANCO: PayeePaymentTarget = { ...BANK_ACCOUNT_ONLY, bank: '033' };

  it('reparte a seleção em lotes por forma e banco do favorecido', async () => {
    const rows = [
      row({ payableId: 'a', payee: OUTRO_BANCO, valueCents: 100_00 }),
      row({ payableId: 'b', payee: TERCEIRO_BANCO, valueCents: 400_00 }),
      row({ payableId: 'c', payee: OUTRO_BANCO, valueCents: 23_25 }),
    ];
    const r = await runPreview({ preview: reader(rows) })({ payableIds: ['a', 'b', 'c'] });

    assert.ok(isOk(r));
    assert.equal(r.value.batches.length, 2);
    assert.deepEqual(
      r.value.batches.map((b) => ({ bank: b.payeeBankCode, n: b.count, total: b.totalCents })),
      [
        { bank: '341', n: 2, total: 123_25 },
        { bank: '033', n: 1, total: 400_00 },
      ],
    );
  });

  // O favorecido no MESMO banco do cedente recebe crédito interno, não TED — forma diferente, logo
  // lote diferente. É a razão de o pré-voo precisar saber QUAL conta vai pagar.
  it('separa crédito no próprio banco de transferência interbancária', async () => {
    const rows = [
      row({ payableId: 'interno', payee: BANK_ACCOUNT_ONLY, valueCents: 10_00 }),
      row({ payableId: 'externo', payee: OUTRO_BANCO, valueCents: 20_00 }),
    ];
    const r = await runPreview({ preview: reader(rows) })({ payableIds: ['interno', 'externo'] });

    assert.ok(isOk(r));
    assert.equal(r.value.batches.length, 2);
    assert.notEqual(r.value.batches[0]?.launchForm, r.value.batches[1]?.launchForm);
  });

  // ⚠️ Só título PRONTO entra em lote. Um `blocked` ou `not-approved` não vai no arquivo, e contá-lo
  // faria a tela prometer um lote maior do que o que seria transmitido — exatamente o engano que o
  // pré-voo existe para impedir.
  it('só o que está pronto entra em lote — impedido e não-aprovado ficam de fora', async () => {
    const rows = [
      row({ payableId: 'ok', payee: OUTRO_BANCO, valueCents: 100_00 }),
      row({ payableId: 'sem-banco', payee: NO_DESTINATION_NULLS, valueCents: 50_00 }),
      row({ payableId: 'nao-aprovado', status: 'Draft', payee: OUTRO_BANCO, valueCents: 70_00 }),
    ];
    const r = await runPreview({ preview: reader(rows) })({
      payableIds: ['ok', 'sem-banco', 'nao-aprovado'],
    });

    assert.ok(isOk(r));
    assert.equal(r.value.batches.length, 1);
    assert.equal(r.value.batches[0]?.totalCents, 100_00);
  });

  // A propriedade que faz a tela fechar: o que está nos lotes é exatamente o total `ready`. Sem
  // isto o operador soma os lotes, compara com a seleção e não sabe explicar a diferença.
  it('a soma dos lotes bate com o total pronto do pré-voo', async () => {
    const rows = [
      row({ payableId: 'a', payee: OUTRO_BANCO, valueCents: 100_00 }),
      row({ payableId: 'b', payee: TERCEIRO_BANCO, valueCents: 250_00 }),
      row({ payableId: 'c', payee: NO_DESTINATION_NULLS, valueCents: 999_00 }),
    ];
    const r = await runPreview({ preview: reader(rows) })({ payableIds: ['a', 'b', 'c'] });

    assert.ok(isOk(r));
    const inBatches = r.value.batches.reduce((sum, b) => sum + b.totalCents, 0);
    assert.equal(inBatches, r.value.readyTotalCents);
  });

  it('seleção sem nenhum título pronto não inventa lote', async () => {
    const rows = [row({ payableId: 'x', payee: NO_DESTINATION_NULLS })];
    const r = await runPreview({ preview: reader(rows) })({ payableIds: ['x'] });

    assert.ok(isOk(r));
    assert.deepEqual(r.value.batches, []);
  });

  // Conta-cedente inexistente é erro NOMEADO, não silêncio: sem ela não há forma a derivar, e
  // devolver lotes vazios faria a tela afirmar que nada seria pago.
  it('recusa quando a conta-cedente não existe, em vez de devolver lote vazio', async () => {
    const useCase = previewRemittance({
      preview: reader([row({ payableId: 'a' })]),
      cedenteAccounts: accountStore(null),
      batchPlanner: createRemittanceBatchPlanner(),
    });
    const r = await useCase({
      cedenteAccountId: CEDENTE_ACCOUNT_ID,
      payableIds: ['a'],
    });

    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-account-not-found');
  });
});
