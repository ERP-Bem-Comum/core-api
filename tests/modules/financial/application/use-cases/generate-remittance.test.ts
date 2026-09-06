import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk, ok, err } from '#src/shared/index.ts';
import {
  generateRemittance,
  type GeneratedRemittanceFile,
} from '#src/modules/financial/application/use-cases/generate-remittance.ts';
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

// `account` sobrescreve o cadastro do cedente — os campos que a #856 leva ao header (documento,
// agência, DV da agência) precisam variar por caso, e variá-los aqui é o que faz o teste medir o
// CAMINHO INTEIRO: cadastro → use case → emissor → posição no arquivo.
const setup = async (
  over: Partial<{
    docs: readonly string[];
    account: Partial<{ agency: string; agencyDigit: string; document: string }>;
  }> = {},
) => {
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
    ...over.account,
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

// O ÚNICO arquivo de uma geração que só produz um — e assere que é um só, em vez de pegar o
// primeiro e calar sobre o resto.
//
// ⚠️ A asserção de contagem é o que dá valor ao helper. Todos os cenários deste arquivo usam rotas
// que compartilham arquivo (transferência e boleto convivem — o golden de TED tem `01`, `41` e `31`
// juntos), então uma partição que os separasse por engano seria um defeito. Um `files[0]` cru
// esconderia isso: os asserts seguintes passariam sobre o primeiro arquivo, e o segundo — que não
// devia existir — não seria olhado por ninguém.
const onlyFile = (out: Readonly<{ files: readonly GeneratedRemittanceFile[] }>) => {
  assert.equal(out.files.length, 1, 'esperava uma geração de arquivo único');
  const file = out.files[0];
  assert.ok(file !== undefined);
  return file;
};

describe('generateRemittance — caminho feliz', () => {
  it('gera o arquivo, registra a remessa e o deposita na fila de saída', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));

    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
    const file = onlyFile(r.value);
    assert.equal(file.nsa, 1);
    assert.equal(file.objectKey, `saida/${file.fileName}`);
    assert.equal(file.totalCents, 3000);
    assert.equal(file.lineCount, 8); // header arq + header lote + 2×(A+B) + trailer lote + trailer arq

    const stored = await s.storage.getText(file.objectKey);
    assert.ok(isOk(stored));
    assert.deepEqual(inspectRemittanceFile(stored.value), [], 'arquivo depositado é bem formado');
  });

  it('a remessa fica registrada como Queued, prendendo os documentos', async () => {
    const s = await setup();
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r));

    const saved = await s.remittances.findById(onlyFile(r.value).remittanceId);
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
 * OS CAMPOS DO CEDENTE NO HEADER (#856).
 *
 * ⚠️ ESTE BLOCO MEDE O ARQUIVO, e essa é a razão de ele viver aqui e não num teste de unidade do
 * emissor. Os testes de `multipag-records` provam que o emissor escreve na posição certa o que lhe
 * ENTREGAM; o defeito da #856 é anterior a isso — o use case entregava literais. Um teste que
 * passasse `agencyDigit: '5'` ao emissor e conferisse a posição 058 ficaria verde durante os meses
 * inteiros em que o campo saía em branco na produção.
 *
 * A régua é o registro tipo 0 (header de arquivo) e o tipo 1 (header de lote): os dois carregam o
 * MESMO bloco de cedente, e um defeito que atingisse só um deles é o tipo de assimetria que ninguém
 * procura.
 */
describe('generateRemittance — os campos do cedente no header (#856)', () => {
  // Posições do layout são 1-based e inclusivas; `slice` é 0-based e exclusivo no fim.
  const at = (line: string, from: number, to: number) => line.slice(from - 1, to);

  const headersOf = async (
    over: Parameters<typeof setup>[0] = {},
  ): Promise<readonly [string, string]> => {
    const s = await setup(over);
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));
    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);

    const stored = await s.storage.getText(onlyFile(r.value).objectKey);
    assert.ok(isOk(stored));
    const lines = stored.value.split('\n').filter((l) => l.length > 0);

    const fileHeader = lines[0];
    const batchHeader = lines[1];
    assert.ok(fileHeader !== undefined && batchHeader !== undefined);
    assert.equal(at(fileHeader, 8, 8), '0', 'primeira linha deve ser o header de arquivo');
    assert.equal(at(batchHeader, 8, 8), '1', 'segunda linha deve ser o header de lote');
    return [fileHeader, batchHeader];
  };

  // ── 058 · G009 — DV da agência (CA2, ramo obrigatório) ──────────────────────────────────────
  //
  // O manual se contradiz sobre este campo e a contradição está registrada: `G009` (p. 95) o chama
  // de "Campo Não Obrigatório – Informação Opcional", enquanto `G059 'AG'` (p. 107) e `'HD'`
  // (p. 111) dizem que "o dígito da agência deve ser informado na posição 58". Quem paga é o
  // validador — e, independentemente dele, o dado EXISTE no cadastro desde 25/08 e era descartado.
  it('CA2: o DV da agência do cadastro chega às posições 058 dos dois headers', async () => {
    const [fileHeader, batchHeader] = await headersOf({ account: { agencyDigit: '5' } });

    assert.equal(at(fileHeader, 53, 57), '01234', 'a agência ocupa 053-057, e só ela');
    assert.equal(at(fileHeader, 58, 58), '5', 'header de arquivo: 058');
    assert.equal(at(batchHeader, 58, 58), '5', 'header de lote: 058');
  });

  // Ausência continua saindo em branco, e isso é o layout — não desistência. `Alfa` vazio é brancos
  // (p. 14), e a agência pode legitimamente não ter DV.
  //
  // ⚠️ NUNCA `'0'`. `05-armadilhas-e-divergencias.md` §2: "se o DV for `0`, enviar `0`; se a agência
  // realmente não tiver DV, enviar branco. Nunca zero por padrão sem confirmar". Zero é um dígito
  // afirmado, e afirmar o dígito errado é pior que não afirmar nenhum.
  it('CA2: conta sem DV cadastrado sai com BRANCO na 058 — nunca zero por omissão', async () => {
    const [fileHeader, batchHeader] = await headersOf();

    assert.equal(at(fileHeader, 58, 58), ' ');
    assert.equal(at(batchHeader, 58, 58), ' ');
  });

  // ── 072 · G012 — DV agência/conta (CA2, ramo facultativo: o branco JUSTIFICADO) ──────────────
  //
  // `G012` (p. 96) define o campo como a **2ª posição do DV** para bancos cujo dígito de conta tem
  // duas posições — o exemplo do manual é `45981-36`, com `3` na 071 e `6` na 072. O DV de conta do
  // Bradesco tem UMA posição: `bradescoAccountCheckDigits` (Manual de Procedimentos 4008-523-0096
  // v16, p. 30) devolve um único caractere. Não há segunda posição a gravar.
  //
  // Medido do outro lado também: a inquiry-0033 submeteu 18 arquivos ao Validador Universal em
  // 25/08/2026 com os DVs de agência/conta vazios em três cenários, e NENHUMA crítica a eles.
  //
  // Este teste existe para que o branco continue sendo uma DECISÃO: quem um dia resolver preencher
  // a 072 vai encontrar aqui a razão pela qual ela está vazia, em vez de concluir que foi esquecida.
  it('CA2: a 072 fica em BRANCO — o Bradesco não tem 2ª posição de DV de conta', async () => {
    const [fileHeader, batchHeader] = await headersOf({ account: { agencyDigit: '5' } });

    assert.equal(at(fileHeader, 71, 71), '1', 'a 071 leva o DV da conta, que existe');
    assert.equal(at(fileHeader, 72, 72), ' ');
    assert.equal(at(batchHeader, 72, 72), ' ');
  });

  // ── 018 · G005 — tipo de inscrição (CA4) ────────────────────────────────────────────────────
  it('CA4: cedente com CNPJ sai com tipo de inscrição 2', async () => {
    const [fileHeader, batchHeader] = await headersOf({
      account: { document: '12345678000199' },
    });

    assert.equal(at(fileHeader, 18, 18), '2');
    assert.equal(at(batchHeader, 18, 18), '2');
  });

  // O caso que o literal `'2'` errava. Um cedente pessoa física saía declarado pessoa jurídica: o
  // arquivo é bem-formado, o banco não recusa, e o `G005` simplesmente não descreve o titular.
  it('CA4: cedente com CPF sai com tipo de inscrição 1 — era onde o literal mentia', async () => {
    const [fileHeader, batchHeader] = await headersOf({ account: { document: '12345678909' } });

    assert.equal(at(fileHeader, 18, 18), '1');
    assert.equal(at(batchHeader, 18, 18), '1');
  });

  // A inscrição de 11 posições ocupa o campo de 14 com zeros à esquerda (G006). Vai junto porque é
  // o par do caso acima: tipo `1` com a inscrição zerada errada seria um header coerente e falso.
  it('CA4: o CPF ocupa 019-032 com zeros à esquerda, ao lado do tipo 1', async () => {
    const [fileHeader] = await headersOf({ account: { document: '12345678909' } });

    assert.equal(at(fileHeader, 19, 32), '00012345678909');
  });

  // A máscara não muda o tipo: quem mede o comprimento é a inscrição NORMALIZADA. Sem isto,
  // `123.456.789-09` teria 14 caracteres e seria classificado como pessoa jurídica.
  it('CA4: CPF com máscara no cadastro ainda é tipo 1', async () => {
    const [fileHeader] = await headersOf({ account: { document: '123.456.789-09' } });

    assert.equal(at(fileHeader, 18, 18), '1');
  });

  // ── A recusa que impede a correção silenciosa (CA2, o irmão da #859) ────────────────────────
  //
  // A saída "óbvia" para não perder o DV é gravá-lo dentro de `agency`, que aceita 10 caracteres na
  // borda. `digits('01234-5', 5)` removeria o separador e gravaria `12345` em 053-057, onde o banco
  // espera `01234` — cinco dígitos, cabe no campo, nenhum gate acusa, e toda remessa daquela conta
  // vai ao banco apontando outra agência. Recusar é a política da #804: nunca truncar.
  it('CA2: agência com separador RECUSA a geração, e antes de queimar NSA', async () => {
    const s = await setup({ account: { agency: '01234-5' } });
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));

    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-agency-malformed');

    const acc = await s.accounts.findById(s.cedenteAccountId);
    assert.ok(isOk(acc) && acc.value !== null);
    assert.equal(acc.value.nextNsa, 1, 'a recusa não pode consumir um número da sequência');
  });

  // ── CA3 — o CNPJ alfanumérico do cedente ────────────────────────────────────────────────────
  //
  // O emissor grava 019-032 com um helper que remove tudo que não é dígito. Sobre uma inscrição
  // ALFANUMÉRICA (válida desde 07/2026, ADR-0044) isso não tira máscara: destrói conteúdo, e
  // `12ABC34501DE35` vira `00000123450135` — catorze dígitos, campo `Num` perfeito, arquivo aceito,
  // e o cedente declarado não é o titular da conta que paga.
  //
  // ⚠️ A recusa é do PRÉ-VOO, e é isso que este caso mede: o emissor monta depois do `allocateNsa`,
  // então uma barreira só lá dentro custaria um número da sequência por tentativa e chegaria ao
  // operador como falha genérica de montagem, sem apontar campo nenhum.
  it('CA3: cedente com CNPJ alfanumérico RECUSA com slug próprio, sem zero-padding e sem NSA', async () => {
    const s = await setup({ account: { document: '12ABC34501DE35' } });
    const r = await generateRemittance(s.deps)(input(s.cedenteAccountId, s.docs));

    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-inscription-alphanumeric');

    const acc = await s.accounts.findById(s.cedenteAccountId);
    assert.ok(isOk(acc) && acc.value !== null);
    assert.equal(acc.value.nextNsa, 1, 'a recusa não pode consumir um número da sequência');
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

    const saved = await s.remittances.findById(onlyFile(r.value).remittanceId);
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

    const saved = await s.remittances.findById(onlyFile(r.value).remittanceId);
    assert.ok(isOk(saved) && saved.value !== null);

    const stored = await s.storage.getText(onlyFile(r.value).objectKey);
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

    const saved = await s.remittances.findById(onlyFile(r.value).remittanceId);
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
    const file = onlyFile(r.value);
    for (const e of eventos) {
      assert.equal(e.remittanceId, file.remittanceId);
      assert.equal(e.nsa, file.nsa);
      assert.equal(e.fileName, file.fileName);
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
        // `saveAll`, e não `save`: a geração passou a gravar as N remessas num ato só (CA4 da #838).
        // Sobrescrever `save` deixaria este teste VERDE por não interceptar nada — o use case não o
        // chama mais, a gravação real aconteceria, e o assert de "nada no bucket" falharia por um
        // motivo que não é o que o teste descreve.
        saveAll: async () => Promise.resolve(err('remittance-repository-unavailable' as const)),
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
    assert.equal(onlyFile(ok2.value).nsa, 1);
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
  // A guia é a rota que a P.O. contratou e o arquivo não emite — e desde 23/08 isso é DECISÃO DE
  // ESCOPO, não atraso: imposto retido pago por guia permanece fora da remessa. A recusa tem de ser
  // explícita porque a alternativa, emiti-la pelo perfil de transferência, mandaria ao banco um
  // pagamento bem-formado para a operação errada.
  //
  // ⚠️ O PIX SAIU DAQUI na #838, e o parâmetro deixou de ser união por isso. Reintroduzi-lo faria
  // este bloco medir a montagem em vez da recusa — e passaria a falhar por uma razão que não é a que
  // ele existe para vigiar.
  const readerWithRoute = (route: 'tax-guide'): RemittancePaymentReader => ({
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
    for (const route of ['tax-guide'] as const) {
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
      payments: readerWithRoute('tax-guide'),
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
