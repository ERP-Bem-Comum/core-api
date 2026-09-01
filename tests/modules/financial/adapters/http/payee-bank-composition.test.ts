import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/index.ts';
import { composePayeeBank } from '#src/modules/financial/adapters/http/payee-bank-composition.ts';
import type { ContractorReadPort } from '#src/modules/partners/public-api/index.ts';
import { PAYEE_KINDS } from '#src/modules/financial/domain/document/types.ts';

const BANK = { bank: '341', agency: '1234-5', accountNumber: '99887', checkDigit: '6' } as const;
const PIX = { keyType: 'email', key: 'a@b.com' } as const;
const UPDATED = new Date('2026-06-01T00:00:00.000Z');

const base = { id: 'p-1', document: '11222333000181', updatedAt: UPDATED } as const;

// Port em que TODOS os quatro tipos têm destino cadastrado. Antes do #708/CA5, três deles eram
// ignorados e a borda devolvia `null` — sem distinguir "não tem cadastro" de "não fui ler".
const fullPort = (): ContractorReadPort => ({
  getSupplierView: () =>
    Promise.resolve(
      ok({
        ...base,
        type: 'supplier' as const,
        name: 'Fornecedor',
        email: 'f@x.org',
        serviceCategory: 'CONSULTORIA' as never,
        bankAccount: BANK,
        pixKey: null,
      }),
    ),
  getFinancierView: () =>
    Promise.resolve(
      ok({
        ...base,
        type: 'financier' as const,
        name: 'Financiador',
        corporateName: 'Financiador LTDA',
        legalRepresentative: 'Rep',
        telephone: '11999999999',
        address: 'Rua X, 1',
        bankAccount: BANK,
        pixKey: null,
      }),
    ),
  getCollaboratorView: () =>
    Promise.resolve(
      ok({
        ...base,
        type: 'collaborator' as const,
        name: 'Colaborador',
        email: 'c@x.org',
        role: 'Analista',
        occupationArea: 'PARC',
        bankAccount: null,
        pixKey: PIX,
      }),
    ),
  getActView: () =>
    Promise.resolve(
      ok({
        ...base,
        type: 'act' as const,
        name: 'Acordo 2026',
        email: 'a@x.org',
        corporateName: 'Instituição Parceira',
        role: 'Rep Legal',
        occupationArea: 'PARC',
        bankAccount: BANK,
        pixKey: null,
      }),
    ),
});

describe('composePayeeBank — os quatro payeeKind entram (#708/CA5)', () => {
  // Decisão (b) da P.O.: fornecedor, colaborador, financiador e ACT entram na VAN. O laço percorre
  // `PAYEE_KINDS` em vez de repetir quatro casos: um `payeeKind` novo entra aqui sozinho e falha
  // enquanto ninguém tiver ensinado a composição a lê-lo.
  for (const kind of PAYEE_KINDS) {
    it(`lê o destino de pagamento de ${kind}`, async () => {
      const block = await composePayeeBank(fullPort(), { kind, id: 'p-1' });
      assert.notEqual(block, null, `${kind} não deveria degradar para null`);
      assert.ok(
        block?.bankAccount !== null || block?.pixKey !== null,
        `${kind} devolveu bloco vazio, mas o cadastro tem destino`,
      );
    });
  }

  it('devolve o bloco com campos nulos quando o cadastro não tem destino', async () => {
    const port: ContractorReadPort = {
      ...fullPort(),
      getActView: () =>
        Promise.resolve(
          ok({
            ...base,
            type: 'act' as const,
            name: 'Acordo',
            email: 'a@x.org',
            corporateName: 'Parceira',
            role: 'Rep',
            occupationArea: 'PARC',
            bankAccount: null,
            pixKey: null,
          }),
        ),
    };
    // Distinguir "sem cadastro" de "não li" é o ponto: os dois viravam `null` antes.
    //
    // ⚠️ A INSCRIÇÃO VEM MESMO SEM DESTINO BANCÁRIO, e não é acidente do fixture — é o caso de
    // negócio do boleto. Quem paga por boleto não tem agência nem conta no arquivo: o dinheiro segue
    // o código de barras, e o que o Segmento J-52 exige é QUEM É (#891). Um bloco que trouxesse
    // `document: null` junto com o resto faria o pré-voo recusar por inscrição faltando justamente o
    // fornecedor que está com o cadastro completo para a rota que ele usa.
    assert.deepEqual(await composePayeeBank(port, { kind: 'act', id: 'p-1' }), {
      bankAccount: null,
      pixKey: null,
      document: base.document,
    });
  });
});

describe('composePayeeBank — a degradação graciosa que CONTINUA valendo', () => {
  // A indisponibilidade de Parceiros não derruba a leitura do documento (ADR-0032). Ampliar a
  // cobertura para os 4 tipos não pode ter afrouxado isso.
  it('port ausente, id ausente ou kind ausente → null', async () => {
    assert.equal(await composePayeeBank(null, { kind: 'supplier', id: 'p-1' }), null);
    assert.equal(await composePayeeBank(fullPort(), { kind: 'supplier', id: null }), null);
    assert.equal(await composePayeeBank(fullPort(), { kind: null, id: 'p-1' }), null);
  });

  it('not-found no parceiro → null', async () => {
    const port: ContractorReadPort = {
      ...fullPort(),
      getCollaboratorView: () => Promise.resolve(ok(null)),
    };
    assert.equal(await composePayeeBank(port, { kind: 'collaborator', id: 'p-1' }), null);
  });

  it('erro de leitura → null, sem propagar a falha', async () => {
    const port: ContractorReadPort = {
      ...fullPort(),
      getFinancierView: () => Promise.resolve(err('contractor-read-unavailable' as const)),
    };
    assert.equal(await composePayeeBank(port, { kind: 'financier', id: 'p-1' }), null);
  });

  it('timeout → null, sem esperar o port lento', async () => {
    const port: ContractorReadPort = {
      ...fullPort(),
      getActView: () => new Promise(() => undefined), // nunca resolve
    };
    assert.equal(await composePayeeBank(port, { kind: 'act', id: 'p-1' }, { timeoutMs: 5 }), null);
  });
});
