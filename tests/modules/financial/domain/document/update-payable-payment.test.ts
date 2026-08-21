/**
 * W0 RED — título com FORMA DE PAGAMENTO e DETALHE próprios (Fatia 1).
 *
 * Premissa do negócio: retenção É título a pagar. O título-pai pode ser pago sem que o filho o seja,
 * e cada um obedece às regras da remessa por conta própria — logo cada um carrega a SUA forma de
 * pagamento e o SEU complemento (código de barras do boleto, da guia).
 *
 * Hoje `buildOpenPayables` copia a forma do documento para todos os títulos e `Payable` não tem
 * `paymentDetail` — o complemento existe uma vez só, em `DocumentCore` (#273). Dois títulos da mesma
 * nota com boletos distintos não cabem no modelo.
 *
 * RED por inexistência da API:
 *   - `Payable.paymentDetail` ainda não existe → asserções leem `undefined`.
 *   - `Document.updatePayablePayment` ainda não existe → tsc reprova a chamada.
 *
 * Estilo espelha `update-payable-due-date.test.ts` (#270), a operação irmã: mesma natureza (muda UM
 * título isolado), mesmo contrato de erro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId, PayableId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const DUE = new Date('2026-07-01');

// Códigos de barras distintos: o do boleto do fornecedor e o da guia de recolhimento do ISS. São 44
// dígitos porque é o que o Segmento J grava (G063) — a régua `checkPayoutReadiness` recusa 47.
const BARCODE_SUPPLIER = '3'.repeat(44);
const BARCODE_TAX_GUIDE = '8'.repeat(44);

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('setup money');
  return r.value;
};

const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('setup supplier');
  return r.value;
};

const ret = (type: 'ISS' | 'IRRF', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('setup retention');
  return r.value;
};

// NFS-e com 2 retenções → parent + 2 children. O documento nasce em Boleto, com o código de barras
// do fornecedor.
const seed = (paymentDetail: string | null = BARCODE_SUPPLIER): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-FATIA1',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'Boleto',
    grossValue: money(100000),
    sourceDiscounts: Money.ZERO,
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret('ISS', 5000), ret('IRRF', 1500)],
    registeredTaxes: [],
    dueDate: DUE,
    ...(paymentDetail !== null ? { paymentDetail } : {}),
  });
  if (!r.ok) throw new Error('setup create');
  return r.value;
};

describe('financial/domain — título com forma e detalhe próprios (Fatia 1)', () => {
  describe('semente: o título nasce herdando o pagamento da nota', () => {
    it('todo título nasce com o paymentDetail do documento', () => {
      const { document, payables } = seed();

      assert.equal(document.paymentDetail, BARCODE_SUPPLIER);
      assert.equal(payables.parent.paymentDetail, BARCODE_SUPPLIER, 'o pai herda');
      for (const c of payables.children) {
        assert.equal(c.paymentDetail, BARCODE_SUPPLIER, 'o filho herda');
      }
    });

    it('documento sem paymentDetail → título nasce com null (back-compat)', () => {
      const { payables } = seed(null);

      assert.equal(payables.parent.paymentDetail, null);
      for (const c of payables.children) {
        assert.equal(c.paymentDetail, null);
      }
    });
  });

  describe('updatePayablePayment: muda UM título, nunca os irmãos nem a nota', () => {
    it('o filho de ISS vira guia de recolhimento com código de barras próprio', () => {
      const { document, payables } = seed();
      const target = payables.children[0]!;

      const r = Document.updatePayablePayment({
        document,
        payables,
        payableId: target.id,
        paymentMethod: 'GuiaRecolhimento',
        paymentDetail: BARCODE_TAX_GUIDE,
      });

      assert.equal(r.ok, true);
      if (!r.ok) return;
      const out = r.value;

      const changed = out.payables.children.find((c) => c.id === target.id)!;
      assert.equal(changed.paymentMethod, 'GuiaRecolhimento', 'o alvo troca de forma');
      assert.equal(changed.paymentDetail, BARCODE_TAX_GUIDE, 'o alvo recebe o próprio código');

      // O pai segue em boleto, com o código do fornecedor: é o cenário que motiva a fatia — duas
      // formas e dois códigos de barras sob a mesma nota.
      assert.equal(out.payables.parent.paymentMethod, 'Boleto', 'o pai não propaga');
      assert.equal(out.payables.parent.paymentDetail, BARCODE_SUPPLIER, 'o pai não propaga');

      // Irmão intacto.
      const sibling = out.payables.children.find((c) => c.id !== target.id)!;
      assert.equal(sibling.paymentMethod, 'Boleto', 'o irmão não propaga');
      assert.equal(sibling.paymentDetail, BARCODE_SUPPLIER, 'o irmão não propaga');

      // A nota permanece intacta — foi o descasamento silencioso da #270 que originou esta fatia,
      // e aqui ele é o comportamento CORRETO: quem paga é o título.
      assert.equal(out.document.paymentMethod, 'Boleto', 'a nota não propaga');
      assert.equal(out.document.paymentDetail, BARCODE_SUPPLIER, 'a nota não propaga');
    });

    it('altera só a forma quando o detalhe é omitido', () => {
      const { document, payables } = seed();

      const r = Document.updatePayablePayment({
        document,
        payables,
        payableId: payables.parent.id,
        paymentMethod: 'PIX',
      });

      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value.payables.parent.paymentMethod, 'PIX');
      assert.equal(
        r.value.payables.parent.paymentDetail,
        BARCODE_SUPPLIER,
        'omitir o detalhe preserva o que estava lá',
      );
    });

    it('altera só o detalhe quando a forma é omitida', () => {
      const { document, payables } = seed();
      const other = '9'.repeat(44);

      const r = Document.updatePayablePayment({
        document,
        payables,
        payableId: payables.parent.id,
        paymentDetail: other,
      });

      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value.payables.parent.paymentDetail, other);
      assert.equal(r.value.payables.parent.paymentMethod, 'Boleto', 'a forma é preservada');
    });

    it('null apaga o detalhe numa rota que não paga por código de barras', () => {
      const { document, payables } = seed();

      // Duas etapas: o pai sai de Boleto para PIX e só então o complemento é apagado. Apagar com a
      // forma ainda em Boleto é recusado — ver a suíte de validação abaixo.
      const toPix = Document.updatePayablePayment({
        document,
        payables,
        payableId: payables.parent.id,
        paymentMethod: 'PIX',
      });
      assert.equal(toPix.ok, true);
      if (!toPix.ok) return;

      const r = Document.updatePayablePayment({
        document,
        payables: toPix.value.payables,
        payableId: payables.parent.id,
        paymentDetail: null,
      });

      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value.payables.parent.paymentDetail, null);
    });

    it('preserva a identidade do alvo — id, kind, status, valor e vencimento intactos', () => {
      const { document, payables } = seed();
      const target = payables.children[0]!;

      const r = Document.updatePayablePayment({
        document,
        payables,
        payableId: target.id,
        paymentMethod: 'GuiaRecolhimento',
        paymentDetail: BARCODE_TAX_GUIDE,
      });

      assert.equal(r.ok, true);
      if (!r.ok) return;
      const changed = r.value.payables.children.find((c) => c.id === target.id)!;
      assert.equal(changed.id, target.id);
      assert.equal(changed.kind, target.kind);
      assert.equal(changed.retentionType, target.retentionType);
      assert.equal(changed.status, target.status);
      assert.equal(changed.value.cents, target.value.cents);
      assert.equal(changed.dueDate.toISOString(), target.dueDate.toISOString());
    });

    it('payableId inexistente → payable-not-found', () => {
      const { document, payables } = seed();

      const r = Document.updatePayablePayment({
        document,
        payables,
        payableId: PayableId.generate(),
        paymentMethod: 'PIX',
      });

      assert.equal(r.ok, false);
      if (r.ok) return;
      assert.equal(r.error, 'payable-not-found');
    });
  });

  // Decisão do P.O.: o dado entra limpo ou não entra. Nas rotas que pagam por código de barras a
  // recusa é total — complemento ausente e complemento torto são igualmente recusados, porque os
  // dois produzem o mesmo desfecho lá na frente: arquivo que o banco não processa.
  describe('validação: boleto e guia entram com código de barras válido, ou não entram', () => {
    const expectInvalid = (r: ReturnType<typeof Document.updatePayablePayment>): void => {
      assert.equal(r.ok, false);
      if (r.ok) return;
      assert.equal(r.error, 'payable-payment-detail-invalid');
    };

    it('troca para Boleto sem complemento → recusa', () => {
      const { document, payables } = seed(null); // nasce sem complemento

      expectInvalid(
        Document.updatePayablePayment({
          document,
          payables,
          payableId: payables.parent.id,
          paymentMethod: 'Boleto',
        }),
      );
    });

    it('troca para GuiaRecolhimento sem complemento → recusa', () => {
      const { document, payables } = seed(null);

      expectInvalid(
        Document.updatePayablePayment({
          document,
          payables,
          payableId: payables.children[0]!.id,
          paymentMethod: 'GuiaRecolhimento',
        }),
      );
    });

    it('linha digitável de 47 dígitos → recusa (o Segmento J grava 44)', () => {
      const { document, payables } = seed();

      expectInvalid(
        Document.updatePayablePayment({
          document,
          payables,
          payableId: payables.parent.id,
          paymentMethod: 'Boleto',
          paymentDetail: '7'.repeat(47),
        }),
      );
    });

    it('complemento malformado → recusa', () => {
      const { document, payables } = seed();

      expectInvalid(
        Document.updatePayablePayment({
          document,
          payables,
          payableId: payables.parent.id,
          paymentMethod: 'Boleto',
          paymentDetail: 'PAGAR NO BANCO',
        }),
      );
    });

    it('apagar o complemento de um título em Boleto → recusa', () => {
      const { document, payables } = seed();

      expectInvalid(
        Document.updatePayablePayment({
          document,
          payables,
          payableId: payables.parent.id,
          paymentDetail: null,
        }),
      );
    });

    it('código de barras de 44 dígitos → aceita', () => {
      const { document, payables } = seed(null);

      const r = Document.updatePayablePayment({
        document,
        payables,
        payableId: payables.parent.id,
        paymentMethod: 'Boleto',
        paymentDetail: BARCODE_SUPPLIER,
      });

      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value.payables.parent.paymentDetail, BARCODE_SUPPLIER);
    });

    // PIX e transferência pagam por chave e por conta — dado do CADASTRO, que o domínio não alcança
    // daqui. Recusá-las seria recusar por ignorância, não por dado sujo; quem as julga é o pré-voo,
    // que tem o favorecido em mãos.
    it('troca para PIX sem complemento → aceita (o domínio não julga esta rota)', () => {
      const { document, payables } = seed(null);

      const r = Document.updatePayablePayment({
        document,
        payables,
        payableId: payables.parent.id,
        paymentMethod: 'PIX',
      });

      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value.payables.parent.paymentMethod, 'PIX');
    });
  });
});
