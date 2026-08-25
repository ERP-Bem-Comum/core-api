import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk, ok, err } from '#src/shared/index.ts';
import { generateRemittance } from '#src/modules/financial/application/use-cases/generate-remittance.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';
import { createInMemoryVanStorage } from '#src/modules/financial/adapters/van/van-storage.in-memory.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import { create as createAccount } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import { inspectRemittanceFile } from '#src/modules/financial/adapters/cnab/remittance-inspector.ts';
import { createBradescoMultipagTranslator } from '#src/modules/financial/adapters/cnab/bradesco-multipag-translator.ts';
import type { RemittancePaymentReader } from '#src/modules/financial/application/ports/remittance-payment-reader.ts';

const NOW = new Date(Date.UTC(2026, 7, 11, 14, 26, 5));

const payee = (n: number) => ({
  name: `FORNECEDOR ${n}`,
  documentType: '2' as const,
  document: `9876543200011${n}`,
  bankCode: '341',
  agency: '4321',
  agencyDigit: '0',
  accountNumber: `11223${n}`,
  accountDigit: '4',
  accountAgencyDigit: ' ',
});

const reader = (docs: readonly string[]): RemittancePaymentReader => ({
  loadPayments: async (ids) =>
    Promise.resolve(
      ok(
        ids
          .filter((id) => docs.includes(id))
          .map((id, i) => ({
            payableId: id,
            // A nota de origem: nas fixtures cada título vem de uma nota própria, salvo onde o
            // caso testa justamente o contrário.
            documentId: `doc-of-${id}`,
            route: 'transfer' as const,
            payee: payee(i + 1),
            valueCents: (i + 1) * 1000,
            paymentDate: new Date(Date.UTC(2026, 7, 12)),
          })),
      ),
    ),
});

// Os títulos da fixture nascem `Approved`, e declarar isso é obrigatório desde o ADR-0065 §2: o
// `save` de criação transiciona `Approved → Transmitted` por CAS, e título de que o repositório
// nunca ouviu falar afeta zero linhas no banco — mesmo veredito que não-aprovado. Semear é dizer de
// que estado o cenário parte; antes, todo caso supunha `Approved` sem escrever em lugar nenhum.
const approved = (ids: readonly string[]): Readonly<Record<string, 'Approved'>> =>
  Object.fromEntries(ids.map((id) => [id, 'Approved' as const]));

const setup = async (over: Partial<{ docs: readonly string[] }> = {}) => {
  const docs = over.docs ?? ['doc-1', 'doc-2'];

  const accounts = createInMemoryCedenteAccountStore();
  const remittances = createInMemoryRemittanceRepository({ payableStatuses: approved(docs) });
  const storage = createInMemoryVanStorage();

  const id = CedenteAccountId.generate();
  const acc = createAccount({
    id,
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '000000',
    document: '12345678000199',
    // O nome do BANCO, que é o que este campo significa. Enquanto ele guardava a razão social, o
    // emissor produzia o header certo por acidente — e o defeito ficava invisível na suíte.
    bankName: 'BRADESCO',
  });
  assert.ok(isOk(acc));
  await accounts.save(acc.value);

  return {
    accounts,
    remittances,
    storage,
    cedenteAccountId: id,
    docs,
    deps: {
      cedenteAccounts: accounts,
      remittances,
      payments: reader(docs),
      translator: createBradescoMultipagTranslator(),
      storage,
      now: () => NOW,
      newRemittanceId: RemittanceId.generate,
      hashContent: (c: string) => `h${String(c.length)}`,
    },
  };
};

const input = (
  cedenteAccountId: ReturnType<typeof CedenteAccountId.generate>,
  docs: readonly string[],
) => ({
  cedenteAccountId,
  payableIds: docs,
});

describe('generateRemittance — caminho feliz', () => {
  it('gera o arquivo, registra a remessa e o deposita na fila de saída', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));

    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
    assert.equal(r.value.nsa, 1);
    assert.equal(r.value.objectKey, `saida/${r.value.fileName}`);
    assert.equal(r.value.totalCents, 3000);
    assert.equal(r.value.lineCount, 8); // header arq + header lote + 2×(A+B) + trailer lote + trailer arq

    const stored = await s.storage.getText(r.value.objectKey);
    assert.ok(isOk(stored));
    assert.deepEqual(inspectRemittanceFile(stored.value), [], 'arquivo depositado é bem formado');
  });

  it('a remessa fica registrada como Queued, prendendo os documentos', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r));

    const saved = await s.remittances.findById(r.value.remittanceId);
    assert.ok(isOk(saved) && saved.value !== null);
    assert.equal(saved.value.status, 'Queued');

    const held = await s.remittances.findHeldPayables(s.docs);
    assert.ok(isOk(held));
    assert.deepEqual(
      held.value.map((h) => h.payableId),
      [...s.docs].sort(),
    );
  });

  it('consome o NSA da conta', async () => {
    const s = await setup();
    await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));

    const acc = await s.accounts.findById(s.cedenteAccountId);
    assert.ok(isOk(acc) && acc.value !== null);
    assert.equal(acc.value.nextNsa, 2);
  });
});

/**
 * A costura da referência de retorno (#752) — o casamento referência ↔ documento.
 *
 * O montador devolve as referências na ordem de entrada e o use case as casa por índice com os
 * `documentId` do reader. É o único ponto onde os dois vocabulários se encontram, e o único onde o
 * erro pode acontecer: uma referência gravada contra o documento errado produz arquivo válido, aceito
 * pelo banco, cujo retorno baixa o título de outro fornecedor.
 */
describe('generateRemittance — a chave de casamento do retorno (#752)', () => {
  it('persiste uma referência não vazia para cada documento da remessa', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r));

    const saved = await s.remittances.findById(r.value.remittanceId);
    assert.ok(isOk(saved) && saved.value !== null);

    assert.equal(saved.value.payables.length, s.docs.length);
    for (const d of saved.value.payables) {
      assert.notEqual(d.yourNumber.trim(), '', `título ${d.payableId} sem chave de casamento`);
    }
  });

  it('a referência gravada é a MESMA que saiu no arquivo, para aquele documento', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r));

    const saved = await s.remittances.findById(r.value.remittanceId);
    assert.ok(isOk(saved) && saved.value !== null);

    const stored = await s.storage.getText(r.value.objectKey);
    assert.ok(isOk(stored));

    // Toda referência persistida tem de aparecer no conteúdo transmitido. Se o casamento por índice
    // se deslocasse, a referência gravada seria de outro pagamento — e algumas não estariam lá.
    for (const d of saved.value.payables) {
      assert.ok(
        stored.value.includes(d.yourNumber),
        `referência ${d.yourNumber} não está no arquivo emitido`,
      );
    }
  });

  it('não repete referência entre documentos da mesma remessa', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r));

    const saved = await s.remittances.findById(r.value.remittanceId);
    assert.ok(isOk(saved) && saved.value !== null);

    const refs = saved.value.payables.map((d) => d.yourNumber);
    assert.equal(new Set(refs).size, refs.length);
  });
});

describe('generateRemittance — o que ele recusa', () => {
  it('recusa seleção vazia', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, []));
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-empty-selection');
  });

  // A defesa contra pagamento em dobro: documento já numa remessa viva não entra noutra.
  it('recusa título já preso em remessa viva', async () => {
    const s = await setup();
    const first = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(first));

    const second = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isErr(second));
    assert.equal(second.error, 'remittance-payables-already-held');
  });

  it('recusa quando falta dado de pagamento de algum documento selecionado', async () => {
    const s = await setup({ docs: ['doc-1'] });
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, ['doc-1', 'doc-ausente']));
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-payments-unavailable');
  });
});

/**
 * ADR-0065 §2 — o título vira `Transmitted` na geração, e não quando o `status/` confirma.
 *
 * A fronteira que a P.O. decidiu em 24/08: gerar a remessa é entregá-la à VAN, e daí em diante a
 * responsabilidade é de terceiros. `Transmitted` do TÍTULO diz "saiu da nossa alçada"; `Transmitted`
 * da REMESSA continua dizendo "o agente transmitiu". São dois fatos — o §3 do ADR existe porque
 * tratá-los como um só era o defeito.
 */
describe('generateRemittance — o título sai da nossa alçada (#792, ADR-0065 §2)', () => {
  it('cada título da remessa fica Transmitido depois da geração', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);

    for (const id of s.docs) {
      assert.equal(s.remittances.payableStatus(id), 'Transmitted', `título ${id}`);
    }
  });

  // Por TÍTULO, nunca por nota: uma nota pode sair pela metade — o pai no arquivo e a retenção ainda
  // em aberto —, e um evento por nota diria que ela foi paga inteira.
  it('emite um PayableTransmitted por título, com a remessa em que ele foi', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r));

    const eventos = s.remittances.published().filter((e) => e.type === 'PayableTransmitted');
    assert.equal(eventos.length, s.docs.length, 'um evento por título, nem mais nem menos');
    assert.deepEqual(
      eventos.map((e) => e.payableId).sort(),
      [...s.docs].sort(),
      'os títulos anunciados são os que saíram',
    );

    // O evento responde "em qual remessa o título foi" sem obrigar o consumidor a voltar ao banco —
    // é o pré-requisito da #823. Asserir a PROPRIEDADE (aponta para a remessa que acabou de sair) e
    // não o literal, que mudaria com a fixture.
    for (const e of eventos) {
      assert.equal(e.remittanceId, r.value.remittanceId);
      assert.equal(e.nsa, r.value.nsa);
      assert.equal(e.fileName, r.value.fileName);
      assert.ok(e.documentId.length > 0, 'a nota de origem viaja junto: é ela que exibe a trilha');
    }
  });

  // O evento existe se e somente se o estado foi persistido (ADR-0015). O caminho que falha DEPOIS
  // da transação é o do upload — e ali a transição já valeu, de propósito: título preso por remessa
  // que não saiu é visível e recuperável; título livre com arquivo a caminho do banco não é.
  it('a falha no upload NÃO desfaz a transição — erra-se para menos', async () => {
    const s = await setup();
    const deps = {
      ...s.deps,
      storage: {
        ...s.storage,
        putRemittance: async () => Promise.resolve(err('van-storage-unavailable' as const)),
      },
    };

    const r = await generateRemittance(deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isErr(r) && r.error === 'remittance-upload-failed');

    for (const id of s.docs) {
      assert.equal(
        s.remittances.payableStatus(id),
        'Transmitted',
        `título ${id} segue transmitido`,
      );
    }
  });

  // O CAS recusa, e o operador recebe o vocabulário que ele já conhece do #736 — a ação é a mesma
  // (ir aprovar), tenha a recusa vindo do reader ou da corrida na gravação.
  it('título que deixou de ser Approved recusa a remessa inteira, com o slug do #736', async () => {
    const s = await setup();
    // Encena a janela entre o pré-voo e a gravação: o repositório só conhece `doc-1` como aprovado.
    const deps = {
      ...s.deps,
      remittances: createInMemoryRemittanceRepository({ payableStatuses: approved(['doc-1']) }),
    };

    const r = await generateRemittance(deps)(input(s.cedenteAccountId, s.docs));
    assert.equal(isErr(r) ? r.error : null, 'document-not-approved');

    // Nada foi enfileirado: a recusa acontece ANTES do upload, e é a transação que a garante.
    const anySaida = await s.storage.getText('saida/PAG_000000.11082026142605_000001.REM');
    assert.ok(isErr(anySaida), 'remessa recusada não deposita arquivo');
  });
});

describe('generateRemittance — a ordem importa mais que o resultado', () => {
  // A decisão central. Gravar no bucket É enfileirar pagamento: se o upload viesse primeiro e a
  // persistência falhasse, existiria pagamento a caminho do banco SEM registro nosso — invisível, e
  // com os documentos livres para entrar noutra remessa.
  it('NÃO deposita no bucket quando a persistência da remessa falha', async () => {
    const s = await setup();
    const deps = {
      ...s.deps,
      remittances: {
        ...s.remittances,
        save: async () => Promise.resolve(err('remittance-repository-unavailable' as const)),
      },
    };

    const r = await generateRemittance(deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-persist-failed');

    // Nada foi enfileirado: o bucket segue sem objeto algum em `saida/`.
    const returns = await s.storage.listReturns();
    assert.ok(isOk(returns));
    const anySaida = await s.storage.getText('saida/PAG_000000.11082026142605_000001.REM');
    assert.ok(isErr(anySaida), 'nenhum arquivo deveria ter sido depositado');
  });

  // O inverso: falha no upload deixa a remessa registrada como Queued, SEM arquivo. É o pior caso
  // aceito — visível e recuperável, com os documentos já presos. Erra-se para menos.
  it('quando o upload falha, a remessa continua registrada e prendendo', async () => {
    const s = await setup();
    const deps = {
      ...s.deps,
      storage: {
        ...s.storage,
        putRemittance: async () => Promise.resolve(err('van-storage-unavailable' as const)),
      },
    };

    const r = await generateRemittance(deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-upload-failed');

    const held = await s.remittances.findHeldPayables(s.docs);
    assert.ok(isOk(held));
    assert.equal(held.value.length, 2, 'documentos seguem presos, não voltam para a fila');
  });
});

describe('generateRemittance — um arquivo, um dia (#712)', () => {
  // Reader que devolve datas distintas por documento — a seleção que o operador monta quando
  // escolhe títulos de vencimentos diferentes no grid do Contas a Pagar.
  const readerWithDates = (dates: readonly Date[]): RemittancePaymentReader => ({
    loadPayments: async (ids) =>
      Promise.resolve(
        ok(
          ids.map((id, i) => ({
            payableId: id,
            // A nota de origem: nas fixtures cada título vem de uma nota própria, salvo onde o
            // caso testa justamente o contrário.
            documentId: `doc-of-${id}`,
            route: 'transfer' as const,
            payee: payee(i + 1),
            valueCents: (i + 1) * 1000,
            paymentDate: dates[i] ?? dates[0] ?? new Date(Date.UTC(2026, 7, 12)),
          })),
        ),
      ),
  });

  it('recusa a seleção com datas de pagamento distintas', async () => {
    const s = await setup();
    const deps = {
      ...s.deps,
      payments: readerWithDates([new Date(Date.UTC(2026, 7, 12)), new Date(Date.UTC(2026, 7, 13))]),
    };

    const r = await generateRemittance(deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-mixed-payment-dates');
  });

  // O NSA não volta depois de alocado. Validar DEPOIS dele deixaria um gap na sequência sem
  // nenhum arquivo do outro lado — e a sequência é o que o banco usa para detectar retransmissão.
  it('não consome NSA nem persiste remessa quando as datas divergem', async () => {
    const s = await setup();
    const deps = {
      ...s.deps,
      payments: readerWithDates([new Date(Date.UTC(2026, 7, 12)), new Date(Date.UTC(2026, 7, 13))]),
    };

    const r = await generateRemittance(deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isErr(r));

    // O próximo envio legítimo tem de receber o NSA 1 — prova de que nada foi consumido.
    const ok2 = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(ok2), `esperava ok, veio ${isErr(ok2) ? ok2.error : '?'}`);
    assert.equal(ok2.value.nsa, 1);
  });

  // Mesmo dia civil com horários diferentes emite o MESMO campo DDMMAAAA — recusar aqui rejeitaria
  // seleção válida por um dado que nem viaja no arquivo.
  it('aceita horários diferentes dentro do mesmo dia', async () => {
    const s = await setup();
    const deps = {
      ...s.deps,
      payments: readerWithDates([
        new Date(Date.UTC(2026, 7, 12, 3, 0)),
        new Date(Date.UTC(2026, 7, 12, 21, 30)),
      ]),
    };

    const r = await generateRemittance(deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  });

  it('aceita seleção de um único título', async () => {
    const s = await setup({ docs: ['doc-1'] });
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  });
});

describe('generateRemittance — rota sem emissor (#711, CA3)', () => {
  // PIX e guia são rotas que a P.O. contratou e o emissor ainda não cobre. Enquanto não cobre, a
  // recusa tem de ser explícita: emiti-las pelo perfil de transferência mandaria ao banco um
  // pagamento bem-formado para a operação errada.
  const readerWithRoute = (route: 'pix' | 'tax-guide'): RemittancePaymentReader => ({
    loadPayments: async (ids) =>
      Promise.resolve(
        ok(
          ids.map((id, i) => ({
            payableId: id,
            // A nota de origem: nas fixtures cada título vem de uma nota própria, salvo onde o
            // caso testa justamente o contrário.
            documentId: `doc-of-${id}`,
            route,
            valueCents: (i + 1) * 1000,
            paymentDate: new Date(Date.UTC(2026, 7, 12)),
          })),
        ),
      ),
  });

  it('recusa com erro próprio, distinto de dado faltando', async () => {
    for (const route of ['pix', 'tax-guide'] as const) {
      const s = await setup();
      const r = await generateRemittance({ ...s.deps, payments: readerWithRoute(route) })(
        input(s.cedenteAccountId, s.docs),
      );

      assert.ok(isErr(r), route);
      assert.equal(r.error, 'remittance-launch-form-unsupported');
    }
  });

  // Nada de arquivo no bucket: gravar em `saida/` é enfileirar pagamento, e a rota sequer tem
  // emissor. O NSA, esse já foi consumido — é deliberado, gap na sequência é inofensivo e reusar
  // número é retransmissão aos olhos do banco.
  it('não deposita nada na fila de saída', async () => {
    const s = await setup();
    let uploads = 0;
    const deps = {
      ...s.deps,
      payments: readerWithRoute('pix'),
      storage: {
        ...s.storage,
        putRemittance: async (name: string, content: string) => {
          uploads += 1;
          return s.storage.putRemittance(name, content);
        },
      },
    };

    await generateRemittance(deps)(input(s.cedenteAccountId, s.docs));

    assert.equal(uploads, 0, 'gravar em saida/ é enfileirar pagamento — não pode acontecer aqui');
  });
});
