/**
 * POOL-BUILDER-SINGLE-SOURCE — teste ESTRUTURAL (fonte única do builder de pool).
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 * Estado desejado: TODO arquivo de `src/` que chama `createPool(` consome o builder compartilhado
 * `src/shared/persistence/mysql-pool-config.ts`, que garante por construção a invariante
 * `maxIdle < connectionLimit` — sem ela o `idleTimeout` do mysql2 fica INERTE (o reaper só é
 * agendado quando `maxIdle < connectionLimit`), que é a causa #1 do Incident-0001 (56/60 conexões
 * no RDS de produção).
 *
 * Por que ESTE teste, se `tests/shared/persistence/driver-pool-delegation.test.ts` já cobre a
 * delegação: aquele enumera os 7 drivers À MÃO (`const DRIVERS`). Um 8º módulo que copiasse o
 * padrão anterior — `createPool` com `PoolOptions` cru — passaria verde. Cópia entre drivers foi
 * exatamente o vetor que espalhou o Incident-0001 por 7 módulos, então o caso não é hipotético.
 * Este teste asserta a PROPRIEDADE (todo criador de pool delega), não a contagem: acrescentar um
 * driver correto não o quebra; acrescentar um errado, sim.
 *
 * Complementar, não substituto: o CA-7 cobre COMPORTAMENTO (retorna `Result`, propaga `err`);
 * este cobre ESTRUTURA (ninguém cria pool por fora).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, filesUsing, importSpecifiers } from '../support/source-scan.ts';

const SRC_ROOT = join(PROJECT_ROOT, 'src');

// `createPool(` com `(` imediato: NÃO casa `createPoolSafe(` nem `createPoolRegistry(`, que são
// wrappers legítimos e não abrem pool por conta própria.
const CREATE_POOL = /\bcreatePool\(/;

const poolCreators = (): readonly string[] => filesUsing(SRC_ROOT, CREATE_POOL, { ext: '.ts' });

// Dependência real, lida do specifier: o caminho do builder também aparece em COMENTÁRIO nos 7
// drivers ("Delega ao builder compartilhado (src/shared/persistence/mysql-pool-config.ts)").
const importsBuilder = (rel: string): boolean =>
  importSpecifiers(rel).some((s) => s.includes('mysql-pool-config.ts'));

describe('POOL-BUILDER — todo criador de pool passa pelo builder compartilhado', () => {
  it('nenhum arquivo chama createPool( sem importar mysql-pool-config.ts', () => {
    const offenders = poolCreators().filter((rel) => !importsBuilder(rel));
    assert.deepEqual(
      offenders,
      [],
      'Arquivos criam pool mysql2 sem delegar a src/shared/persistence/mysql-pool-config.ts ' +
        '(a invariante maxIdle < connectionLimit deixa de valer — Incident-0001):\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura encontra criadores de pool (guarda contra regex que casa nada)', () => {
    // Sem esta guarda, um refactor que renomeie `createPool` tornaria o teste acima verde por
    // vacuidade — o modo de falha mais perigoso de teste estrutural.
    assert.ok(
      poolCreators().length > 0,
      'nenhum criador de pool encontrado: a regex CREATE_POOL provavelmente parou de casar',
    );
  });
});
