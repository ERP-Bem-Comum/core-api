/**
 * IMMUTABLE-FACADE-SINGLE-SOURCE — teste ESTRUTURAL (fonte única do congelamento).
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 * Estado desejado: `Object.freeze(` é chamado APENAS em `src/shared/primitives/immutable.ts`.
 * Todo o resto do código usa as facades `immutable()` / `deepImmutable()`.
 *
 * Norma de origem: handbook/interviews/0001-functional-ddd-domain-refresh.md §Bloco B — DO B§10
 * (identidade fixa via facade) e DON'T B§5 (`Object.freeze` direto no domínio é proibido). A razão
 * está no docblock da facade: ela esconde o MECANISMO (`Object.freeze` hoje, Records & Tuples
 * amanhã) atrás do vocabulário do projeto. Congelamento espalhado transforma a troca de mecanismo
 * numa varredura por 44 arquivos.
 *
 * Aderência hoje: 100%, e sem nenhum mecanismo até este teste — o tipo de norma que se sustenta
 * por disciplina e cai no primeiro colaborador que não leu a entrevista.
 *
 * O padrão exige o PARÊNTESE de chamada: `Object.freeze(`. As menções em comentário — três, todas
 * explicando esta mesma norma (`contracts/domain/{contract,amendment}/types.ts`,
 * `amendment/amendment.ts`) — escrevem `` `Object.freeze` `` sem chamada e não são violação.
 * Um padrão sem o parêntese acusaria justamente quem documenta a regra.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, filesUsing } from '../support/source-scan.ts';

const SRC_ROOT = join(PROJECT_ROOT, 'src');

const FREEZE_CALL = 'Object.freeze(';
const FACADE = 'src/shared/primitives/immutable.ts';

const freezeCallers = (): readonly string[] => filesUsing(SRC_ROOT, FREEZE_CALL, { ext: '.ts' });

describe('IMMUTABLE-FACADE — Object.freeze só na facade', () => {
  it('nenhum arquivo fora da facade chama Object.freeze(', () => {
    const offenders = freezeCallers().filter((rel) => rel !== FACADE);
    assert.deepEqual(
      offenders,
      [],
      'Arquivos congelam direto em vez de usar immutable()/deepImmutable() ' +
        "(DON'T B§5 — trocar o mecanismo passa a exigir varredura):\n" +
        offenders.join('\n'),
    );
  });

  it('a facade continua sendo quem congela (guarda contra verde por vacuidade)', () => {
    // Sem esta guarda, apagar `Object.freeze` da facade — ou renomear a API — deixaria o teste
    // acima verde sem que ninguém congele nada.
    assert.deepEqual([...freezeCallers()], [FACADE]);
  });
});
