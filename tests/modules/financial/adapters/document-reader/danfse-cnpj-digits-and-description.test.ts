/**
 * FIN-OCR-CNPJ-DESCRIPTION — W0 (RED) — #566: dois bugs do auto-preenchimento por OCR no DANFSe.
 *
 * Bug 1: com quebra de linha entre "…/0001" e "-90" na camada de texto, o CNPJ do emitente sai
 * TRUNCADO (12 díg) → `resolveSupplierByCnpj` (#560) não casa o parceiro (14 díg) → supplierRef vazio.
 * Deve ler SÓ os dígitos, COMPLETOS (14 p/ CNPJ, 11 p/ CPF).
 *
 * Bug 2: o reader deve extrair a "Descrição do Serviço" da NFS-e para o campo `description` — hoje o
 * mapper poluía a descrição com "Fornecedor lido: …" (superado pelo #560, que resolve o supplierRef).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import { structureText } from '#src/modules/financial/adapters/document-reader/native-pdf.ts';

const FIXTURE = readFileSync(new URL('./fixtures/danfse-fortaleza.txt', import.meta.url), 'utf8');

// Recorte do unpdf com "-90" caindo na linha seguinte (o cenário do #566).
const LINE_BREAK = `EMITENTE DA NFS-e
Prestador do Serviço CNPJ / CPF / NIF 64.894.238/0001
-90
Inscrição Municipal - Telefone (85) 9725-2001
Nome / Nome Empresarial 64.894.238 ALESSANDRA CASTRO DE OLIVEIRA E-mail x@y.com
TOMADOR DO SERVIÇO CNPJ / CPF / NIF 35.400.736/0001-31`;

describe('structureText — DANFSe #566: CNPJ completo + descrição do serviço', () => {
  it('Bug 1 — CNPJ do emitente com quebra de linha → 14 dígitos (não trunca em 12)', () => {
    const r = structureText(LINE_BREAK, 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier?.taxId, '64894238000190');
    assert.equal(r.value.supplier?.taxId?.length, 14);
  });

  it('Bug 2 — extrai a "Descrição do Serviço" para `description` (sem "Fornecedor lido")', () => {
    const r = structureText(FIXTURE, 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.match(r.value.description ?? '', /Servi[çc]os de Manuten[çc][ãa]o/);
    assert.doesNotMatch(r.value.description ?? '', /Fornecedor lido/);
    assert.ok((r.value.description ?? '').length <= 500, 'description cabe em varchar(500)');
  });
});
