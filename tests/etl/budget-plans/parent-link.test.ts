// Plano-filho não vira raiz órfã quando o pai não migra (#487).
//
// O ETL fazia `planUuidByLegacyId.get(parentLegacyId) ?? null`, e o `?? null` dava o MESMO desfecho
// para dois casos opostos: plano sem pai (raiz legítima) e plano cujo pai foi quarentenado
// (hierarquia perdida em silêncio). `classifyParentLink` separa os dois — e um terceiro, que a
// issue não tinha visto: o pai cujo `provision` falhou, que ficava no mapa de uuids com um id que
// não corresponde a linha alguma no destino.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { classifyParentLink } from '#scripts/etl/budget-plans/main.ts';

describe('classifyParentLink — raiz legítima, filho ligado e filho órfão (#487)', () => {
  it('CA2: plano sem pai no legado é raiz legítima', () => {
    assert.deepEqual(classifyParentLink(null, new Set()), { kind: 'root' });
  });

  it('CA2: raiz legítima continua raiz mesmo com outros planos provisionados', () => {
    assert.deepEqual(classifyParentLink(null, new Set([10, 20])), { kind: 'root' });
  });

  it('pai provisionado → filho se liga a ele', () => {
    assert.deepEqual(classifyParentLink(10, new Set([10])), {
      kind: 'linked',
      parentLegacyId: 10,
    });
  });

  it('CA1: pai declarado que NÃO foi provisionado → órfão, nunca raiz', () => {
    const link = classifyParentLink(10, new Set([20, 30]));
    assert.equal(link.kind, 'orphaned');
    // O id do pai viaja junto: sem ele, a quarentena diria "não casou" sem permitir diagnosticar.
    assert.deepEqual(link, { kind: 'orphaned', parentLegacyId: 10 });
  });

  it('órfão e raiz são desfechos DISTINTOS — é a confusão que o `?? null` criava', () => {
    const raiz = classifyParentLink(null, new Set());
    const orfao = classifyParentLink(10, new Set());
    assert.notEqual(raiz.kind, orfao.kind);
  });

  // A cascata que a topo-ordem torna possível: o pai quarentenado não entra no conjunto de
  // provisionados, então o filho é órfão; o filho quarentenado também não entra, e o neto cai
  // pelo mesmo caminho. Sem isto, o neto se ligaria a um pai que não existe no destino.
  it('cascata: neto de um pai não provisionado também é órfão', () => {
    const provisioned = new Set<number>(); // nem pai (1) nem filho (2) entraram
    assert.equal(classifyParentLink(1, provisioned).kind, 'orphaned'); // filho
    assert.equal(classifyParentLink(2, provisioned).kind, 'orphaned'); // neto
  });
});
