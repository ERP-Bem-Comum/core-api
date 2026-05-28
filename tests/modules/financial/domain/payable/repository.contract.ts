/**
 * Shape contract test do port `PayableRepository`.
 *
 * Verifica APENAS a forma estrutural do port (keys) — não invoca repositório
 * real. Pattern de `tests/modules/contracts/application/ports/document-storage.contract.ts`.
 *
 * Suite reusável (sufixo `.contract.ts`) — NÃO é descoberta diretamente pelo
 * runner de testes (glob `tests/**\/*.test.ts`). Consumida via import por
 * arquivos `.test.ts` que invocam a função.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { PayableRepository } from '#src/modules/financial/domain/payable/repository.ts';

export const runPayableRepositoryShapeContract = (label: string): void => {
  describe(`PayableRepository shape — ${label}`, () => {
    it('exporta exatamente 4 keys (findById, findByFitid, list, save)', () => {
      // Compile-time bidirectional extends check sobre keyof — garante
      // igualdade exata. Adicionar ou remover método quebra o build aqui.
      type _Keys = keyof PayableRepository;
      type _Expected = 'findById' | 'findByFitid' | 'list' | 'save';
      type _KeysExact = _Keys extends _Expected ? (_Expected extends _Keys ? true : never) : never;
      const check: _KeysExact = true;
      assert.equal(check, true);
    });
  });
};
