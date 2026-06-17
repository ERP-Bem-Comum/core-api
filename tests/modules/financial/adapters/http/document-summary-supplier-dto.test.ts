/**
 * FIN-SUPPLIER-VIEW-LIST-DTO · W0 — o item da listagem ganha supplierName/supplierDocument (US2 #47).
 * DEVE FALHAR até o DTO mapear os campos (e o tipo DocumentListItem tê-los).
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { listItemToSummaryDto } from '#src/modules/financial/adapters/http/dto.ts';
import type { DocumentListItem } from '#src/modules/financial/domain/document/query.ts';

const item = (over: Partial<DocumentListItem> = {}): DocumentListItem =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    status: 'Open',
    documentNumber: null,
    type: null,
    supplierRef: 'sup-1',
    series: null,
    grossValue: null,
    paymentMethod: null,
    contractRef: null,
    netValue: null,
    dueDate: null,
    version: 0,
    supplierName: 'Gráfica Boa Impressão',
    supplierDocument: '11222333000181',
    ...over,
  }) as DocumentListItem;

describe('listItemToSummaryDto — fornecedor resolvido (US2)', () => {
  it('mapeia supplierName e supplierDocument do read-model', () => {
    const dto = listItemToSummaryDto(item());
    assert.equal((dto as Record<string, unknown>)['supplierName'], 'Gráfica Boa Impressão');
    assert.equal((dto as Record<string, unknown>)['supplierDocument'], '11222333000181');
  });

  it('supplierName/supplierDocument null quando ausentes no read-model', () => {
    const dto = listItemToSummaryDto(item({ supplierName: null, supplierDocument: null }));
    assert.equal((dto as Record<string, unknown>)['supplierName'], null);
    assert.equal((dto as Record<string, unknown>)['supplierDocument'], null);
  });
});
