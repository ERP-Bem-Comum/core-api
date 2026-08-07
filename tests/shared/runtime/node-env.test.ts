/**
 * NODE-ENV — a decisão "isto é produção?" mora num lugar só, e normaliza (#606).
 *
 * Quatro guards decidiam produção por igualdade estrita contra `'production'`, cada um com a
 * mesma linha copiada. `NODE_ENV=Production` num taskdef fazia os três primeiros concluírem
 * "não é produção" e DEGRADAREM em silêncio — driver caindo para memória, link de e-mail com
 * default localhost, chave JWT virando par efêmero. O quarto é a comparação invertida em
 * `app.ts`, que no mesmo cenário EXPÕE superfície que o comentário dele promete nunca expor
 * em produção.
 *
 * A assimetria que a issue #606 aponta é o argumento: `rbac-mode.ts` resolve o problema
 * equivalente pelo lado seguro (valor desconhecido → `enforced`), enquanto os guards de boot
 * resolviam pelo lado permissivo (valor desconhecido → degrada). Mesma classe de risco, decisões
 * opostas, no mesmo repositório.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isProductionEnv } from '#src/shared/runtime/node-env.ts';

describe('isProductionEnv — normaliza antes de decidir', () => {
  it('reconhece produção independente de caixa e espaço', () => {
    for (const value of ['production', 'Production', 'PRODUCTION', ' production ', '\tprod\n']) {
      assert.equal(
        isProductionEnv({ NODE_ENV: value }),
        true,
        `"${value}" pretendia ser produção e precisa ser reconhecido`,
      );
    }
  });

  it('aceita a abreviação `prod`', () => {
    // Errar para o lado de "é produção" restringe; errar para o outro degrada em silêncio.
    // Entre os dois, o lado seguro é o restritivo — mesma lógica do default de `rbac-mode.ts`.
    assert.equal(isProductionEnv({ NODE_ENV: 'prod' }), true);
    assert.equal(isProductionEnv({ NODE_ENV: 'Prod' }), true);
  });

  it('não confunde outros ambientes com produção', () => {
    for (const value of ['development', 'test', 'staging', 'homolog', 'qa', '']) {
      assert.equal(
        isProductionEnv({ NODE_ENV: value }),
        false,
        `"${value}" não é produção e não pode ativar o modo restritivo`,
      );
    }
  });

  it('ausência de NODE_ENV não é produção', () => {
    assert.equal(isProductionEnv({}), false);
    assert.equal(isProductionEnv({ NODE_ENV: undefined }), false);
  });

  it('não casa por prefixo nem por substring', () => {
    // `production-like` e `preproduction` são ambientes distintos, não produção.
    assert.equal(isProductionEnv({ NODE_ENV: 'preproduction' }), false);
    assert.equal(isProductionEnv({ NODE_ENV: 'production-like' }), false);
    assert.equal(isProductionEnv({ NODE_ENV: 'not-prod' }), false);
  });
});
