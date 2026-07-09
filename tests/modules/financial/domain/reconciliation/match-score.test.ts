// W0 RED (#121) — VO MatchScore + função de score pura (D-MATCH). CA1–CA3. Domínio puro, gate.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
// W0 RED: o VO MatchScore e o score ainda não existem.
import * as MatchScore from '#src/modules/financial/domain/reconciliation/match-score.ts';
import type {
  MatchCriteria,
  MatchInput,
} from '#src/modules/financial/domain/reconciliation/match-score.ts';

const D = new Date('2024-05-18T00:00:00.000Z');
const matchInput = (over: Partial<MatchInput> = {}): MatchInput => ({
  payeeName: 'FORNECEDOR X',
  supplierName: 'FORNECEDOR X',
  transactionValueCents: 1000,
  payableValueCents: 1000,
  transactionDate: D,
  payableDueDate: D,
  paidAt: null,
  memo: 'pagamento ref NF-001',
  documentNumber: 'NF-001',
  supplierOpenCount: 0,
  ...over,
});

const criteria = (over: Partial<MatchCriteria> = {}): MatchCriteria => ({
  payeeMatch: false,
  exactValue: false,
  dateD0: false,
  memoRef: false,
  supplierOpenCount: 0,
  ...over,
});

describe('financial/domain/reconciliation — MatchScore (VO + score)', () => {
  it('CA1: fromValue aceita 0..100 inteiro; rejeita fora de faixa / não-inteiro', () => {
    assert.equal(MatchScore.fromValue(0).ok, true);
    assert.equal(MatchScore.fromValue(100).ok, true);
    assert.equal(MatchScore.fromValue(50).ok, true);

    for (const bad of [-1, 101, 74.5, Number.NaN]) {
      const r = MatchScore.fromValue(bad);
      assert.equal(isErr(r), true, `esperado err para ${bad}`);
      if (!r.ok) assert.equal(r.error, 'score-out-of-range');
    }
  });

  it('CA2: faixas alta ≥75 / média 50–74 / baixa <50', () => {
    const band = (n: number): string => {
      const r = MatchScore.fromValue(n);
      if (!r.ok) throw new Error(`setup: ${n}`);
      return MatchScore.band(r.value);
    };
    assert.equal(band(75), 'alta');
    assert.equal(band(100), 'alta');
    assert.equal(band(74), 'media');
    assert.equal(band(50), 'media');
    assert.equal(band(49), 'baixa');
    assert.equal(band(0), 'baixa');
  });

  it('CA3: score ponderado — exactValue+payeeMatch+dateD0 → alta; só exactValue → baixa', () => {
    const all = MatchScore.compute(
      criteria({
        payeeMatch: true,
        exactValue: true,
        dateD0: true,
        memoRef: true,
        supplierOpenCount: 2,
      }),
    );
    assert.equal(all, 100);
    assert.equal(MatchScore.band(all), 'alta');

    const strong = MatchScore.compute(
      criteria({ payeeMatch: true, exactValue: true, dateD0: true }),
    );
    assert.equal(MatchScore.band(strong), 'alta');

    const weak = MatchScore.compute(criteria({ exactValue: true }));
    assert.equal(MatchScore.band(weak), 'baixa');

    const none = MatchScore.compute(criteria());
    assert.equal(none, 0);
    assert.equal(MatchScore.band(none), 'baixa');
  });

  it('evaluateCriteria: memoRef casa por fronteira de palavra (sem falso-positivo de nº curto)', () => {
    // doc 'NF-001' presente no memo → memoRef true.
    assert.equal(MatchScore.evaluateCriteria(matchInput()).memoRef, true);
    // doc '1' NÃO casa dentro de '1000'.
    assert.equal(
      MatchScore.evaluateCriteria(matchInput({ documentNumber: '1', memo: 'valor 1000' })).memoRef,
      false,
    );
    // doc '1' isolado no memo → casa.
    assert.equal(
      MatchScore.evaluateCriteria(matchInput({ documentNumber: '1', memo: 'parcela 1 de 3' }))
        .memoRef,
      true,
    );
    // documentNumber null → memoRef false.
    assert.equal(MatchScore.evaluateCriteria(matchInput({ documentNumber: null })).memoRef, false);
  });

  it('evaluateCriteria: payeeMatch normaliza (case/espaços); dateD0 mesmo dia', () => {
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({ payeeName: '  fornecedor   x ', supplierName: 'FORNECEDOR X' }),
      ).payeeMatch,
      true,
    );
    assert.equal(MatchScore.evaluateCriteria(matchInput({ supplierName: null })).payeeMatch, false);
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({ payableDueDate: new Date('2024-05-18T23:59:00.000Z') }),
      ).dateD0,
      true,
    );
  });

  it('evaluateCriteria: payeeMatch TOLERANTE (#272) — casa fornecedor dentro da descrição livre do extrato', () => {
    // Extrato de banco: descrição livre com prefixo/ruído + acento no cadastro → ainda casa.
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({
          payeeName: 'TED 33994 PADARIA BARTOLOMEU LTDA',
          supplierName: 'Padaria Bartolomeu',
        }),
      ).payeeMatch,
      true,
    );
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({ payeeName: 'PAG BOLETO FORNECEDOR X', supplierName: 'Fornecedor X' }),
      ).payeeMatch,
      true,
    );
    // Anti-ruído: um único sobrenome comum NÃO basta (maioria dos tokens exigida).
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({ payeeName: 'TED JOAO SILVA', supplierName: 'Comercial Silva Souza' }),
      ).payeeMatch,
      false,
    );
    // Sufixo societário é ruído (LTDA/EIRELI) e não conta como token de casamento.
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({ payeeName: 'ALGUMA EMPRESA LTDA', supplierName: 'Outra Coisa Ltda' }),
      ).payeeMatch,
      false,
    );
  });

  it('evaluateCriteria: dateD0 TOLERANTE (#272) — pagamento dentro de ±5 dias do vencimento', () => {
    // Pagou 3 dias depois do vencimento → ainda corrobora.
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({ payableDueDate: new Date('2024-05-15T00:00:00.000Z') }),
      ).dateD0,
      true,
    );
    // Pagou 5 dias antes → borda inclusiva.
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({ payableDueDate: new Date('2024-05-23T00:00:00.000Z') }),
      ).dateD0,
      true,
    );
    // 6 dias fora da janela → não corrobora.
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({ payableDueDate: new Date('2024-05-24T00:00:00.000Z') }),
      ).dateD0,
      false,
    );
  });

  it('CA1 (#272 ponto 2): dateD0 casa pela DATA DE PAGAMENTO (paidAt) quando presente', () => {
    // Débito bancário casa com a BAIXA, não com o vencimento: paidAt a +2d da transação (dentro ±5d),
    // vencimento MUITO fora da janela → dateD0 corrobora pelo paidAt.
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({
          transactionDate: new Date('2024-05-18T00:00:00.000Z'),
          paidAt: new Date('2024-05-20T00:00:00.000Z'),
          payableDueDate: new Date('2024-08-01T00:00:00.000Z'),
        }),
      ).dateD0,
      true,
    );
    // paidAt TEM PRECEDÊNCIA sobre o vencimento: baixa fora da janela → false mesmo com vencimento no dia.
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({
          transactionDate: new Date('2024-05-18T00:00:00.000Z'),
          paidAt: new Date('2024-08-01T00:00:00.000Z'),
          payableDueDate: new Date('2024-05-18T00:00:00.000Z'),
        }),
      ).dateD0,
      false,
    );
  });

  it('CA2 (#272 ponto 2): paidAt null → fallback para o vencimento (comportamento preservado)', () => {
    // Sem baixa registrada, o critério cai no vencimento com a mesma tolerância ±5d.
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({
          transactionDate: new Date('2024-05-18T00:00:00.000Z'),
          paidAt: null,
          payableDueDate: new Date('2024-05-20T00:00:00.000Z'),
        }),
      ).dateD0,
      true,
    );
    assert.equal(
      MatchScore.evaluateCriteria(
        matchInput({
          transactionDate: new Date('2024-05-18T00:00:00.000Z'),
          paidAt: null,
          payableDueDate: new Date('2024-08-01T00:00:00.000Z'),
        }),
      ).dateD0,
      false,
    );
  });
});
