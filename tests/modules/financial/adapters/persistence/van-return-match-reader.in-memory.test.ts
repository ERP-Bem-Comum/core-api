// Fake do lookup de casamento do retorno (#690) — o que ele promete, e onde ele tem de mentir
// IGUAL ao banco.
//
// O risco de um fake não é falhar: é passar descrevendo produção errado. Por isso os casos daqui
// são pareados com `van-return-match-reader.drizzle-mysql.test.ts` — as propriedades que os dois
// adapters DEVEM compartilhar aparecem nos dois arquivos, com o mesmo nome. O que só o adapter real
// prova (o JOIN que traz o nome do arquivo, a UNIQUE de verdade, o fatiamento acima de 500 chaves)
// fica lá, e não é imitado aqui.
//
// ⚠️ Nenhum dado real de cadastro: convênio `000000` (reservado pelo gate de máscara), UUIDs e
// referências sintéticas.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createInMemoryVanReturnMatchReader } from '#src/modules/financial/adapters/persistence/repos/van-return-match-reader.in-memory.ts';
import type { RemittanceDocumentRef } from '#src/modules/financial/application/ports/van-return-match-reader.ts';
import type { ReturnPayment } from '#src/modules/financial/application/ports/van-return-reader.ts';
import { matchReturnPayments } from '#src/modules/financial/application/van-return-matching.ts';

const REMITTANCE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FILE_NAME = 'PAG_000000.19082026120000_000001.REM';

const REF_A = '000000000001000001';
const REF_B = '000000000001000002';

const ref = (yourNumber: string, documentId: string): RemittanceDocumentRef => ({
  yourNumber,
  remittanceId: REMITTANCE,
  // Neste arquivo cada nota tem um título só; o par recebe o mesmo valor porque o que se mede é o
  // lookup por `yourNumber`, não o agrupamento.
  payableId: documentId,
  documentId,
  fileName: FILE_NAME,
});

const DOC_A = ref(REF_A, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const DOC_B = ref(REF_B, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');

const payment = (over: Partial<ReturnPayment> = {}): ReturnPayment => ({
  line: 3,
  batch: '0001',
  yourNumber: REF_A,
  bankNumber: 'BANCO000000000000001',
  settledAt: '2026-08-19',
  settledValueCents: 12345,
  occurrences: ['00'],
  outcome: 'settled',
  ...over,
});

describe('createInMemoryVanReturnMatchReader — as propriedades que o adapter real também tem', () => {
  it('encontra os vínculos pelas chaves pedidas', async () => {
    const reader = createInMemoryVanReturnMatchReader([DOC_A, DOC_B]);

    const found = await reader.findByYourNumbers([REF_A, REF_B]);

    assert.ok(found.ok);
    assert.equal(found.value.length, 2);
    assert.equal(found.value.find((r) => r.yourNumber === REF_A)?.documentId, DOC_A.documentId);
  });

  it('chave desconhecida não vem na resposta — ausência é informação, não erro', async () => {
    const reader = createInMemoryVanReturnMatchReader([DOC_A]);

    const found = await reader.findByYourNumbers([REF_A, 'REFERENCIA-DE-OUTRO-CONVENIO']);

    assert.ok(found.ok, 'a caixa é compartilhada: referência alheia é NORMAL');
    assert.deepEqual(
      found.value.map((r) => r.yourNumber),
      [REF_A],
    );
  });

  it('lista vazia devolve vazio', async () => {
    const found = await createInMemoryVanReturnMatchReader([DOC_A]).findByYourNumbers([]);

    assert.ok(found.ok);
    assert.deepEqual(found.value, []);
  });

  it('chave repetida na pergunta devolve UMA resposta — `IN` é pertinência, não junção', async () => {
    // O adapter real emite `WHERE your_number IN ('A','A')`, e a UNIQUE garante uma linha por valor.
    // Um fake que devolvesse duas deixaria verde uma contagem que o banco contradiz.
    const found = await createInMemoryVanReturnMatchReader([DOC_A]).findByYourNumbers([
      REF_A,
      REF_A,
    ]);

    assert.ok(found.ok);
    assert.equal(found.value.length, 1);
  });
});

describe('createInMemoryVanReturnMatchReader — a UNIQUE reproduzida em memória', () => {
  it('`add` com a mesma referência substitui, nunca duplica', async () => {
    const reader = createInMemoryVanReturnMatchReader([DOC_A]);

    // Mesma chave, OUTRO documento: é exatamente o que a UNIQUE de `your_number` recusa no banco.
    // Se o fake acumulasse, o mesmo retorno casaria com dois títulos e a suíte não perceberia.
    reader.add(ref(REF_A, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'));

    const found = await reader.findByYourNumbers([REF_A]);
    assert.ok(found.ok);
    assert.equal(found.value.length, 1, 'uma referência, um vínculo — sempre');
    assert.equal(found.value[0]?.documentId, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
  });

  it('semente com a chave repetida também colapsa num vínculo só', async () => {
    const reader = createInMemoryVanReturnMatchReader([
      DOC_A,
      ref(REF_A, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
    ]);

    const found = await reader.findByYourNumbers([REF_A]);
    assert.ok(found.ok);
    assert.equal(found.value.length, 1);
  });

  it('`add` acrescenta chave nova sem perder a que já estava', async () => {
    const reader = createInMemoryVanReturnMatchReader([DOC_A]);

    reader.add(DOC_B);

    const found = await reader.findByYourNumbers([REF_A, REF_B]);
    assert.ok(found.ok);
    assert.equal(found.value.length, 2, 'substituir é por CHAVE, não é limpar o mapa');
  });
});

describe('createInMemoryVanReturnMatchReader — no papel que ele tem: alimentar o casamento', () => {
  it('o que o fake conhece casa; o que ele não conhece é segregado, e o lote NÃO falha', async () => {
    // Este é o fio que a fatia do efeito vai percorrer sem tocar em banco: perguntar as chaves lidas
    // do arquivo, e entregar a resposta ao casamento. Se o formato do port não servisse à
    // application, o erro só apareceria na fatia seguinte — longe daqui.
    const reader = createInMemoryVanReturnMatchReader([DOC_A]);
    const lidos = [
      payment({ line: 3, yourNumber: REF_A }),
      payment({ line: 4, yourNumber: REF_B }),
      payment({ line: 5, yourNumber: '' }),
    ];

    const found = await reader.findByYourNumbers(lidos.map((p) => p.yourNumber));
    assert.ok(found.ok);

    const casamento = matchReturnPayments(lidos, found.value, [9]);

    assert.deepEqual(
      casamento.matched.map((m) => m.payment.line),
      [3],
    );
    // A ordem é a de ENTRADA — a linha 4 (referência alheia) antes da linha 5 (sem referência).
    // As ilegíveis entram depois, porque nunca foram registro.
    assert.deepEqual(
      casamento.segregated.map((s) => [s.reason, s.line]),
      [
        ['unknown-reference', 4],
        ['no-reference', 5],
        ['unreadable', 9],
      ],
    );
    assert.equal(casamento.batchFailed, false, 'referência desconhecida NUNCA falha o lote');
  });

  // ⚠️ O que este arquivo NÃO cobre, e é deliberado: o fake nunca devolve `err`. A distinção entre
  // "consulta indisponível" e "nenhuma casou" é do CHAMADOR — segregar duzentos registros como
  // desconhecidos por causa de um banco fora do ar pareceria incidente do banco, sendo nosso. Não há
  // chamador ainda; quando houver, o caso é dele, com um port que falha.

  // A ordem da resposta NÃO é contrato do port, e este caso existe para que ela não vire um por
  // acidente. O adapter Drizzle não tem `ORDER BY` e fatia em blocos de 500 — dentro de um bloco
  // quem ordena é o otimizador do MySQL. O casamento não precisa dessa ordem: `matchReturnPayments`
  // indexa `known` por chave e itera os pagamentos LIDOS, então a ordem que chega ao operador é a do
  // ARQUIVO. Quem um dia precisar de outra — um relatório de segregação, por exemplo — ordena no
  // consumidor.
  it('a resposta é um conjunto: a ordem da pergunta não atravessa o port', async () => {
    const reader = createInMemoryVanReturnMatchReader([DOC_A, DOC_B]);

    const found = await reader.findByYourNumbers([REF_B, REF_A]);
    assert.ok(found.ok);

    const devolvidas = found.value.map((r) => r.yourNumber);

    // O que o port promete: os mesmos vínculos, seja qual for a ordem da pergunta.
    assert.deepEqual([...devolvidas].sort(), [REF_A, REF_B]);

    // O que ele NÃO promete — asseverado para que continue não prometendo. "Consertar" o fake para
    // devolver na ordem pedida o faria garantir o que o banco não garante, e o teste que passasse a
    // depender disso quebraria em produção, não aqui.
    assert.notDeepEqual(devolvidas, [REF_B, REF_A], 'a ordem pedida não é a ordem devolvida');
  });
});
