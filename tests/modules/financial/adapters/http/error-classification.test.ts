/**
 * FIN-HTTP-ERROR-PUBLIC-CODE — W0 RED (#52, OWASP API8:2023).
 *
 * Classificação de erro de domínio → status HTTP + code público + mensagem PT-BR.
 * RED enquanto `error-mapping.ts` não existir (a lógica vive hoje inline no plugin).
 * Cobre os 2 bugs de mapeamento: `partner-ref-invalid` (deve 400) e
 * `timeline-document-not-found` (deve 404) — hoje ambos caem em 422.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  writeErrorStatus,
  toPublicCode,
  toPublicMessage,
} from '#src/modules/financial/adapters/http/error-mapping.ts';

describe('error-mapping — status HTTP por slug (#52)', () => {
  const cases: readonly (readonly [string, number])[] = [
    ['document-not-found', 404],
    ['timeline-document-not-found', 404], // bug-fix (hoje 422)
    ['document-version-conflict', 409],
    ['invalid-state-transition', 409],
    ['partner-ref-invalid', 400], // bug-fix (hoje 422)
    ['user-ref-invalid', 400], // W2-F3: ref inválida é bad-request
    ['financial-ref-invalid', 400],
    ['document-id-invalid', 400],
    ['net-value-not-positive', 422],
    ['document-incomplete', 422],
    ['document-repository-failure', 503],
    ['timeline-repository-failure', 503], // W2-F2: falha de infra é 503, não 422
    ['outbox-append-failed', 503],
  ];
  for (const [slug, status] of cases) {
    it(`${slug} → ${status}`, () => {
      assert.equal(writeErrorStatus(slug), status);
    });
  }
});

describe('error-mapping — code público (#52)', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['document-not-found', 'not-found'],
    ['timeline-document-not-found', 'not-found'],
    ['document-version-conflict', 'conflict'],
    ['invalid-state-transition', 'conflict'],
    ['partner-ref-invalid', 'bad-request'],
    ['user-ref-invalid', 'bad-request'],
    ['document-id-invalid', 'bad-request'],
    ['net-value-not-positive', 'unprocessable'],
    ['document-incomplete', 'unprocessable'],
    ['document-repository-failure', 'internal'],
    ['timeline-repository-failure', 'internal'],
  ];
  for (const [slug, code] of cases) {
    it(`${slug} → ${code}`, () => {
      assert.equal(toPublicCode(slug), code);
    });
  }
});

describe('error-mapping — mensagem PT-BR nunca vaza o slug (#52)', () => {
  const slugs = [
    'document-version-conflict',
    'document-not-found',
    'invalid-state-transition',
    'document-incomplete',
    'partner-ref-invalid',
    'net-value-not-positive',
  ];
  for (const slug of slugs) {
    it(`${slug} tem mensagem PT-BR ≠ slug`, () => {
      const msg = toPublicMessage(slug);
      assert.ok(msg.length > 0, 'mensagem não pode ser vazia');
      assert.notEqual(msg, slug, 'mensagem não pode ser o slug interno');
    });
  }
});
