/**
 * #636 — os tipos de identificador carregam a collation no PRÓPRIO tipo.
 *
 * `getSQLType()` devolve a string que `drizzle-kit generate` emite verbatim no DDL — é a mesma
 * fonte, não uma aproximação. Testar aqui custa milissegundos; testar rodando o gerador custaria
 * um processo por módulo e exigiria escrever no diretório de migrations.
 *
 * A largura faz parte da asserção de propósito: ela carrega significado (14 = CNPJ do ADR-0044,
 * 11 = CPF, 64 = SHA-256 hex). Um tipo que mudasse de largura em silêncio produziria truncamento
 * no INSERT, e o `COLLATE` correto não salvaria disso.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mysqlTable } from 'drizzle-orm/mysql-core';

import {
  cnpjKey,
  cpfKey,
  opaqueKey,
  permissionKey,
  sha256HexKey,
  uuidKey,
  uuidKeyFixed,
} from '#src/shared/persistence/identifier-columns.ts';

const EXPECTED = [
  ['uuidKey', uuidKey, 'varchar(36) COLLATE utf8mb4_bin'],
  ['uuidKeyFixed', uuidKeyFixed, 'char(36) COLLATE utf8mb4_bin'],
  ['cnpjKey', cnpjKey, 'varchar(14) COLLATE utf8mb4_bin'],
  ['cpfKey', cpfKey, 'varchar(11) COLLATE utf8mb4_bin'],
  ['sha256HexKey', sha256HexKey, 'char(64) COLLATE utf8mb4_bin'],
  ['opaqueKey', opaqueKey, 'varchar(64) COLLATE utf8mb4_bin'],
  ['permissionKey', permissionKey, 'varchar(128) COLLATE utf8mb4_bin'],
] as const;

describe('#636 identifier-columns — a collation vem do tipo', () => {
  for (const [name, factory, sqlType] of EXPECTED) {
    it(`${name} emite \`${sqlType}\``, () => {
      const t = mysqlTable('probe', { c: factory('c') });
      assert.equal(t.c.getSQLType(), sqlType);
    });
  }

  it('todo tipo exportado declara utf8mb4_bin (guarda contra tipo novo sem collation)', () => {
    for (const [name, factory] of EXPECTED) {
      const t = mysqlTable('probe', { c: factory('c') });
      assert.match(
        t.c.getSQLType(),
        /COLLATE utf8mb4_bin$/,
        `${name} não termina em COLLATE utf8mb4_bin — o tipo existe para carregar a collation`,
      );
    }
  });
});
