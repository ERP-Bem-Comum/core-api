/**
 * #627 — o braço `CNPJ:` da cascata de `taxId` deve ler CNPJ alfanumérico (ADR-0044).
 *
 * A cascata é `??`: o braço 1 (`CNPJ:`) e o 2 (`CPF:`) capturavam classe NUMÉRICA, e qualquer valor
 * não-`undefined` produzido por eles IMPEDE o braço 3 (`firstTaxId`, já alfanumérico) de rodar. Com
 * rótulo `CNPJ:` e identificador alfanumérico, a captura parava na 1ª letra, sobravam 11 dígitos e
 * `normalizeTaxId` caía no ramo legado — devolvendo 11 caracteres que o consumidor não distingue de
 * um CPF. O valor errado seguia silencioso por dois caminhos (`resolveSupplierByCnpj` não casava
 * parceiro algum; o parse-only auto-preenchia o formulário), violando o ADR-0050: a cascata termina
 * em erro explícito, nunca em valor errado silencioso.
 *
 * Só o primeiro caso abaixo nasce VERMELHO. Os outros três passam em HEAD **por desenho** — são
 * characterization, e a função deles é ficar vermelho no instante em que alguém alargar a captura
 * sem manter o consumidor estreito. Foi exatamente essa combinação que reprovou a tentativa de
 * 2026-08-04 (`tests/reports/W2-2026-08-04-cnpj-alfanumerico-REPROVADO.md`), onde o ramo legado de
 * `normalizeTaxId` derivava os dígitos do `raw` inteiro e um CPF virava 14 caracteres montados com
 * dígitos do texto vizinho.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { structureText } from '#src/modules/financial/adapters/document-reader/native-pdf.ts';

const HEAD = 'NOTA FISCAL DE SERVICO\nEMITENTE DA NFS-e\n';
const TAIL = '\nTOMADOR DO SERVICO';
const withLabel = (line: string): string => `${HEAD}${line}${TAIL}`;

describe('#627 structureText — braço `CNPJ:` lê alfanumérico sem corromper o CPF', () => {
  it('CA1: `CNPJ: 12.345.678/000A-08` sai íntegro (14), não truncado em 11', () => {
    const r = structureText(withLabel('CNPJ: 12.345.678/000A-08'), 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier?.taxId, '12345678000A08');
    assert.equal(r.value.supplier?.taxId?.length, 14);
  });

  it('CA2: `CNPJ:` numérico com checksum válido preserva o comportamento de hoje', () => {
    const r = structureText(withLabel('CNPJ: 12.345.678/0001-95'), 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier?.taxId, '12345678000195');
  });

  it('CA3: `CPF:` seguido de texto com dígitos sai íntegro (11), nunca 14 montados', () => {
    const r = structureText(withLabel('CPF: 529.982.247-25 IM 0012345'), 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier?.taxId, '52998224725');
    assert.equal(r.value.supplier?.taxId?.length, 11);
  });

  it('CA4: `CNPJ: NAO INFORMADO` degrada para ausência explícita, nunca valor parcial', () => {
    const r = structureText(withLabel('CNPJ: NAO INFORMADO'), 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier, undefined);
  });
});
