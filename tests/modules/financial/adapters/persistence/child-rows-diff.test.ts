// Comparação de conjuntos de linhas-filhas do agregado Documento (#803).
//
// POR QUE ISTO EXISTE
//   O `save` faz hard replace dos filhos: apaga tudo do documento e reinsere. O `DELETE` por
//   `document_id` percorre um índice NÃO-único e, sob REPEATABLE READ, trava a FAIXA varrida —
//   gap que documentos vizinhos na árvore disputam. Medido no lab em 21/08/2026:
//
//     index fin_retentions_document_id_idx
//     (1) WAITING: lock_mode X locks gap before rec insert intention waiting
//     (2) HOLDS:   lock_mode X locks gap before rec
//
//   com a transação (2) segurando gap sobre um registro de OUTRO documento. A eliminação tem
//   dois passos, e este módulo é o primeiro: se o conjunto não mudou, não emitir DELETE nem
//   INSERT — a transação simplesmente não toca a tabela, e não há gap a disputar.
//
//   Comparar por CONTEÚDO, e não por id, é obrigatório: `mapRetentionsToRows` gera `id:
//   newUuid()` a cada chamada (`document.mapper.ts:776`), então dois saves do mesmo estado
//   produzem ids diferentes e conteúdo idêntico.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  sameRowSet,
  taxLikeKey,
  payableKey,
} from '#src/modules/financial/adapters/persistence/repos/child-rows-diff.ts';

const tax = (type: string, base: number, rateBps: number, value: number) => ({
  type,
  base,
  rateBps,
  value,
});

describe('taxLikeKey — identidade por conteúdo de retenção/imposto', () => {
  it('ignora o id, que é regenerado a cada save', () => {
    const a = { id: 'aaa', documentId: 'doc', ...tax('ISS', 50000, 1000, 5000) };
    const b = { id: 'bbb', documentId: 'doc', ...tax('ISS', 50000, 1000, 5000) };

    assert.equal(taxLikeKey(a), taxLikeKey(b));
  });

  it('distingue qualquer campo de conteúdo', () => {
    const base = tax('ISS', 50000, 1000, 5000);

    assert.notEqual(taxLikeKey(base), taxLikeKey(tax('IRRF', 50000, 1000, 5000)));
    assert.notEqual(taxLikeKey(base), taxLikeKey(tax('ISS', 50001, 1000, 5000)));
    assert.notEqual(taxLikeKey(base), taxLikeKey(tax('ISS', 50000, 1001, 5000)));
    assert.notEqual(taxLikeKey(base), taxLikeKey(tax('ISS', 50000, 1000, 5001)));
  });

  it('não confunde campos por concatenação ambígua', () => {
    // Sem separador, ('ISS', 1, 23) e ('ISS', 12, 3) colidiriam. A chave precisa delimitar.
    assert.notEqual(taxLikeKey(tax('ISS', 1, 23, 0)), taxLikeKey(tax('ISS', 12, 3, 0)));
  });
});

describe('sameRowSet — o conjunto mudou?', () => {
  it('conjuntos idênticos, mesma ordem', () => {
    const a = [tax('ISS', 1, 2, 3), tax('IRRF', 4, 5, 6)];

    assert.equal(sameRowSet(a, [...a], taxLikeKey), true);
  });

  it('conjuntos idênticos em ORDEM DIFERENTE ainda são iguais', () => {
    // O SELECT do banco não garante ordem sem ORDER BY, e o domínio não promete ordem estável.
    // Tratar reordenação como mudança emitiria DELETE+INSERT à toa — que é justamente o que
    // este módulo existe para evitar.
    const a = [tax('ISS', 1, 2, 3), tax('IRRF', 4, 5, 6)];
    const b = [tax('IRRF', 4, 5, 6), tax('ISS', 1, 2, 3)];

    assert.equal(sameRowSet(a, b, taxLikeKey), true);
  });

  it('detecta tamanho diferente', () => {
    const a = [tax('ISS', 1, 2, 3)];
    const b = [tax('ISS', 1, 2, 3), tax('IRRF', 4, 5, 6)];

    assert.equal(sameRowSet(a, b, taxLikeKey), false);
    assert.equal(sameRowSet(b, a, taxLikeKey), false);
  });

  it('detecta conteúdo diferente com mesmo tamanho', () => {
    const a = [tax('ISS', 1, 2, 3)];
    const b = [tax('ISS', 1, 2, 4)];

    assert.equal(sameRowSet(a, b, taxLikeKey), false);
  });

  it('dois conjuntos vazios são iguais — o caso mais comum de documento sem retenção', () => {
    assert.equal(sameRowSet([], [], taxLikeKey), true);
  });

  it('vazio contra não-vazio é diferente, nos dois sentidos', () => {
    const a = [tax('ISS', 1, 2, 3)];

    assert.equal(sameRowSet([], a, taxLikeKey), false);
    assert.equal(sameRowSet(a, [], taxLikeKey), false);
  });

  it('DUPLICATAS contam: multiconjunto, não conjunto', () => {
    // Duas retenções idênticas são dois títulos filhos. Tratar como conjunto faria
    // [ISS, ISS] parecer igual a [ISS] e o segundo título sumiria em silêncio.
    const dois = [tax('ISS', 1, 2, 3), tax('ISS', 1, 2, 3)];
    const um = [tax('ISS', 1, 2, 3)];

    assert.equal(sameRowSet(dois, um, taxLikeKey), false);
    assert.equal(sameRowSet(dois, [...dois], taxLikeKey), true);
  });
});

describe('payableKey — identidade de título', () => {
  const payable = (over: Record<string, unknown> = {}) => ({
    id: 'pay-1',
    kind: 'Parent',
    retentionType: null,
    status: 'Open',
    value: 100000,
    dueDate: new Date('2026-09-01'),
    paymentMethod: 'TED',
    paymentDetail: null,
    paidAt: null,
    createdAt: new Date('2026-01-01'),
    ...over,
  });

  it('inclui o id — o título tem identidade estável desde o PR #794', () => {
    assert.notEqual(payableKey(payable()), payableKey(payable({ id: 'pay-2' })));
  });

  it('IGNORA createdAt, que o mapper regenera a cada save', () => {
    // `mapPayablesToRows` usa `createdAt: now` (`document.mapper.ts:750,763`). Incluí-lo na
    // chave faria todo save parecer mudança, anulando a otimização inteira.
    const a = payable({ createdAt: new Date('2026-01-01') });
    const b = payable({ createdAt: new Date('2026-08-21') });

    assert.equal(payableKey(a), payableKey(b));
  });

  it('detecta mudança de vencimento — o caso real do PATCH da P.O.', () => {
    const antes = payable({ dueDate: new Date('2026-09-01') });
    const depois = payable({ dueDate: new Date('2026-10-01') });

    assert.notEqual(payableKey(antes), payableKey(depois));
  });

  it('detecta mudança de status, valor e forma de pagamento', () => {
    const base = payable();

    assert.notEqual(payableKey(base), payableKey(payable({ status: 'Paid' })));
    assert.notEqual(payableKey(base), payableKey(payable({ value: 100001 })));
    assert.notEqual(payableKey(base), payableKey(payable({ paymentMethod: 'PIX' })));
  });

  it('distingue null de string vazia nos campos opcionais', () => {
    // `paymentDetail` null (não informado) e '' (informado vazio) são estados diferentes;
    // colapsá-los esconderia uma edição real.
    assert.notEqual(
      payableKey(payable({ paymentDetail: null })),
      payableKey(payable({ paymentDetail: '' })),
    );
  });

  it('trata undefined e null como o MESMO estado — ausente', () => {
    // O tipo de INSERT do Drizzle marca os opcionais como podendo ser `undefined`; o SELECT
    // sempre devolve `null`. Distingui-los faria todo documento com campo vazio parecer
    // alterado a cada save, reintroduzindo o DELETE+INSERT que a correção elimina.
    assert.equal(payableKey(payable({ paidAt: undefined })), payableKey(payable({ paidAt: null })));
    assert.equal(
      payableKey(payable({ retentionType: undefined })),
      payableKey(payable({ retentionType: null })),
    );
  });

  it('trata datas por valor, não por identidade de objeto', () => {
    const a = payable({ dueDate: new Date('2026-09-01') });
    const b = payable({ dueDate: new Date('2026-09-01') });

    assert.equal(payableKey(a), payableKey(b));
  });
});
