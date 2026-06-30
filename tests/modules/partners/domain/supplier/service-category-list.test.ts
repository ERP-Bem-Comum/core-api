/**
 * PARTNERS-SERVICE-CATEGORIES-HTTP — W0 (RED) — catálogo canônico de categorias.
 * DEVE FALHAR: `listServiceCategories` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { listServiceCategories } from '#src/modules/partners/domain/supplier/service-category.ts';

describe('listServiceCategories', () => {
  it('retorna as 39 categorias canônicas (fonte da FR-017 do front)', () => {
    assert.equal(listServiceCategories().length, 39);
  });

  it('preserva os códigos legados literais, incluindo os typos', () => {
    const all = listServiceCategories();
    assert.ok(all.includes('ONGANIZACAO_DE_EVENTOS'));
    assert.ok(all.includes('TRASPORTE'));
  });

  it('não tem duplicatas', () => {
    const all = listServiceCategories();
    assert.equal(new Set(all).size, all.length);
  });
});
