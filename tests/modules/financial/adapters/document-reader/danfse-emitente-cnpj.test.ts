/**
 * FIN-DANFSE-EMITENTE-CNPJ — W0 (RED) — o leitor de PDF extrai o CNPJ do EMITENTE (prestador) no layout
 * DANFSe de Fortaleza, para o #FIN-OCR-AUTOFILL-SUPPLIER resolver o fornecedor.
 *
 * Layout real (texto do unpdf): `EMITENTE DA NFS-e ... CNPJ / CPF / NIF 64.894.238/0001-90 ... Nome /
 * Nome Empresarial <IM> ALESSANDRA CASTRO DE OLIVEIRA ... TOMADOR DO SERVIÇO CNPJ / CPF / NIF 35...`.
 * A regex antiga (`CNPJ:\s*(\d+)`) não casa: rótulo "CNPJ / CPF / NIF", CNPJ mascarado, e há o CNPJ do
 * TOMADOR logo depois (não pode ser pego). Gabarito = a nota fictícia da P.O. (fixture).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import { structureText } from '#src/modules/financial/adapters/document-reader/native-pdf.ts';

const TEXT = readFileSync(new URL('./fixtures/danfse-fortaleza.txt', import.meta.url), 'utf8');

describe('structureText — DANFSe Fortaleza: CNPJ do emitente', () => {
  it('extrai o CNPJ do EMITENTE (normalizado, 14 dígitos), não o do TOMADOR', () => {
    const r = structureText(TEXT, 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier?.taxId, '64894238000190'); // emitente
    assert.notEqual(r.value.supplier?.taxId, '35400736000131'); // NÃO o tomador
  });

  it('extrai o nome do emitente (sem o número de Inscrição Municipal à esquerda)', () => {
    const r = structureText(TEXT, 'unpdf');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.match(r.value.supplier?.legalName ?? '', /ALESSANDRA CASTRO DE OLIVEIRA/);
  });
});
