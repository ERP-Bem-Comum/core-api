import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { parseImportRows } from '#src/modules/contracts/cli/import-parser.ts';

// W0 RED — CTR-IMPORT-LEGACY-CLI: parser CSV/JSON UTF-8 → ImportContractRow[].
// Schema canônico (D4): numero,titulo,objetivo,assinado_em,valor_centavos,inicio (obrig.) + fim,cnpj (opc).

const HEADER = 'numero,titulo,objetivo,assinado_em,valor_centavos,inicio,fim';

describe('parseImportRows — CSV', () => {
  it('CA-6: parseia linhas válidas, mapeia snake→camel e fim vazio → null', () => {
    const csv = `${HEADER}
001/2026,Contrato A,Objeto A,2026-01-01,10000000,2026-01-01,2026-12-31
002/2026,Contrato B,Objeto B,2026-02-01,5000000,2026-02-01,`;
    const r = parseImportRows(csv, 'csv');

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.length, 2);
    assert.equal(r.value[0]?.numero, '001/2026');
    assert.equal(r.value[0]?.assinadoEm, '2026-01-01');
    assert.equal(r.value[0]?.valorCentavos, '10000000');
    assert.equal(r.value[0]?.fim, '2026-12-31');
    assert.equal(r.value[1]?.fim, null);
  });

  it('CA-6: campo entre aspas com vírgula e aspas escapadas ("")', () => {
    const csv = `${HEADER}
003/2026,"Contrato, com vírgula","Objeto ""aspas""",2026-01-01,100,2026-01-01,2026-12-31`;
    const r = parseImportRows(csv, 'csv');

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value[0]?.titulo, 'Contrato, com vírgula');
    assert.equal(r.value[0]?.objetivo, 'Objeto "aspas"');
  });

  it('CA-3: coluna obrigatória ausente → erro estrutural', () => {
    const csv = `titulo,objetivo,assinado_em,valor_centavos,inicio,fim
Contrato A,Objeto A,2026-01-01,100,2026-01-01,2026-12-31`;
    const r = parseImportRows(csv, 'csv');

    assert.equal(isErr(r), true);
    if (!r.ok && typeof r.error === 'object' && 'kind' in r.error) {
      assert.equal(r.error.kind, 'import-missing-columns');
    }
  });

  it('arquivo vazio → erro', () => {
    const r = parseImportRows('', 'csv');
    assert.equal(isErr(r), true);
  });
});

describe('parseImportRows — JSON', () => {
  it('CA-4: JSON equivalente produz as mesmas linhas (coage valor numérico → string)', () => {
    const json = JSON.stringify([
      {
        numero: '001/2026',
        titulo: 'Contrato A',
        objetivo: 'Objeto A',
        assinado_em: '2026-01-01',
        valor_centavos: 10000000,
        inicio: '2026-01-01',
        fim: null,
      },
    ]);
    const r = parseImportRows(json, 'json');

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.length, 1);
    assert.equal(r.value[0]?.numero, '001/2026');
    assert.equal(r.value[0]?.valorCentavos, '10000000');
    assert.equal(r.value[0]?.fim, null);
  });

  it('JSON malformado → erro', () => {
    const r = parseImportRows('{not valid', 'json');
    assert.equal(isErr(r), true);
  });

  it('CA-3: objeto JSON sem chave obrigatória → erro estrutural', () => {
    const json = JSON.stringify([{ titulo: 'A', objetivo: 'O' }]);
    const r = parseImportRows(json, 'json');
    assert.equal(isErr(r), true);
  });
});
