/**
 * RED — a identidade do título não sobrevive ao ajuste do documento.
 *
 * Defeito medido em 20/08/2026, sobre a frente "remessa por título":
 *
 *   1. `fin_remittance_payables` (migration 0050) grava `payable_id` como vínculo entre a remessa
 *      emitida e o título pago. A tabela que ela substitui, `fin_remittance_documents`, vinculava
 *      por `document_id` — que é ESTÁVEL.
 *   2. `adjust` (document.ts) regenera os títulos por `buildOpenPayables`, que chama
 *      `PayableId.generate()`. O `AdjustDocumentInput` RECEBE os `payables` atuais e os ignora.
 *   3. `document-repository.drizzle.ts:279` faz hard replace (DELETE todos + INSERT novos — R8.1).
 *   4. Emitir remessa NÃO tira o documento de `Open` (`generate-remittance.ts` não toca em status;
 *      o `'Transmitted'` de `remittance.ts:121` é status DA REMESSA). Logo `adjust` segue aceitando
 *      o documento depois de o título ter sido enviado ao banco.
 *
 * Consequências, em ordem de gravidade:
 *
 *   - `findHeldPayableIds` (remittance-repository.drizzle.ts:276) filtra por `payable_id` — a trava
 *     que impede o mesmo título de entrar em DUAS remessas. Depois do ajuste o título tem id novo,
 *     a trava não o reconhece, e ele pode ser remetido outra vez: PAGAMENTO EM DUPLICIDADE.
 *   - O vínculo em `fin_remittance_payables` passa a apontar para um id inexistente. Como a 0050
 *     não declara FK, não há CASCADE nem RESTRICT: o órfão é silencioso, e só aparece quando o
 *     retorno do banco chega com um `your_number` que casa o vínculo e não acha o título.
 *
 * Este arquivo é domínio puro: não sobe banco, roda no `pnpm test` normal. A cobertura de MySQL
 * desta frente (`*.drizzle-mysql.test.ts`) está entre os 20 `skip` do gate — e a suíte `financial`
 * de integração está vermelha no CI (#519). Ou seja: nenhum teste automatizado hoje veria isto.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const DUE = new Date('2026-07-01');

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

// NFS-e com 1 retenção → 1 pai + 1 filho. O pai é o título que vai à remessa (é dele que sai o
// líquido; a 0050 vincula exatamente `kind = 'Parent'`).
const seed = (): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-IDENTITY',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'Boleto',
    grossValue: money(100000),
    sourceDiscounts: Money.ZERO,
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret('ISS', 5000)],
    registeredTaxes: [],
    dueDate: DUE,
  });
  if (!r.ok) throw new Error('setup create');
  return r.value;
};

describe('financial/domain — a identidade do título sobrevive ao ajuste', () => {
  it('ajustar o documento PRESERVA o id do título-pai', () => {
    const before = seed();

    const adjusted = Document.adjust({
      document: before.document,
      payables: before.payables,
      // Mudança que não mexe em retenção: só o valor bruto. O pai continua sendo o mesmo título
      // economicamente — mudou o quanto, não o quê.
      changes: { grossValue: money(120000) },
      heldPayableIds: [],
    });
    if (!adjusted.ok) throw new Error(`adjust falhou: ${adjusted.error}`);

    assert.equal(
      adjusted.value.payables.parent.id,
      before.payables.parent.id,
      'o id do pai mudou: todo vínculo de remessa gravado com o id antigo virou órfão',
    );
  });

  it('ajustar o documento PRESERVA o id dos títulos-filhos cuja retenção continua existindo', () => {
    const before = seed();
    const childBefore = before.payables.children[0]!;

    const adjusted = Document.adjust({
      document: before.document,
      payables: before.payables,
      changes: { grossValue: money(120000) },
      heldPayableIds: [],
    });
    if (!adjusted.ok) throw new Error(`adjust falhou: ${adjusted.error}`);

    const childAfter = adjusted.value.payables.children.find((c) => c.retentionType === 'ISS');
    assert.ok(childAfter, 'a retenção de ISS continua existindo após o ajuste');
    assert.equal(
      childAfter.id,
      childBefore.id,
      'o filho de ISS trocou de id sem ter deixado de existir',
    );
  });

  // Camada 2 da decisão: preservar identidade faz o vínculo sobreviver, mas não impede o VALOR
  // divergir do que o banco já recebeu. Quem fecha isso é a recusa — e ela mora no domínio, não no
  // use case: `application.md` exige que a pergunta "pode?" seja decidida por uma operação de
  // `domain/` que devolve `Result` com o erro nomeado, nunca por um `if` de orquestração.
  //
  // O domínio segue sem CONHECER remessa: ele recebe os ids presos já resolvidos, como dado de
  // entrada. Quem consulta o repositório é a aplicação.
  describe('quando o título já foi enviado ao banco', () => {
    it('recusa o ajuste de valor quando o título-pai está preso numa remessa viva', () => {
      const before = seed();

      const adjusted = Document.adjust({
        document: before.document,
        payables: before.payables,
        changes: { grossValue: money(120000) },
        heldPayableIds: [before.payables.parent.id],
      });

      assert.equal(adjusted.ok, false, 'o ajuste deveria ter sido recusado');
      if (adjusted.ok) return;
      assert.equal(adjusted.error, 'document-has-held-payable');
    });

    it('recusa também quando quem está preso é um título-filho de retenção', () => {
      const before = seed();
      const child = before.payables.children[0]!;

      const adjusted = Document.adjust({
        document: before.document,
        payables: before.payables,
        changes: { grossValue: money(120000) },
        heldPayableIds: [child.id],
      });

      assert.equal(adjusted.ok, false, 'a retenção presa também bloqueia o ajuste da nota');
      if (adjusted.ok) return;
      assert.equal(adjusted.error, 'document-has-held-payable');
    });

    it('sem título preso, o ajuste segue valendo — a trava não pode virar paralisia', () => {
      const before = seed();

      const adjusted = Document.adjust({
        document: before.document,
        payables: before.payables,
        changes: { grossValue: money(120000) },
        heldPayableIds: [],
      });

      assert.equal(adjusted.ok, true, 'nada preso: o ajuste é legítimo e deve passar');
    });

    it('id preso que não pertence a este documento não bloqueia nada', () => {
      const before = seed();
      const alheio = seed().payables.parent.id;

      const adjusted = Document.adjust({
        document: before.document,
        payables: before.payables,
        changes: { grossValue: money(120000) },
        heldPayableIds: [alheio],
      });

      assert.equal(adjusted.ok, true, 'hold de outra nota não pode travar esta');
    });
  });
});
