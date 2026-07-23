// Fixture de teste do Semgrep (SEMGREP-ADR-ENFORCER, #548) — NAO e codigo de producao.
// Anotacoes `ruleid:`/`ok:` sao lidas por `semgrep --test`: a linha SEGUINTE a `ruleid:` DEVE
// disparar a rule; a linha seguinte a `ok:` NAO deve. Fora do tsconfig/eslint/prettier de proposito
// (contem violacoes intencionais de ADR-0020).
import { mysqlTable, varchar, json, mysqlEnum } from 'drizzle-orm/mysql-core';

export const exampleTable = mysqlTable('example', {
  // ruleid: mysql-enum-forbidden
  status: mysqlEnum('status', ['active', 'inactive']),
  // ruleid: mysql-json-forbidden
  metadata: json('metadata'),
  // ok: mysql-enum-forbidden
  // ok: mysql-json-forbidden
  kind: varchar('kind', { length: 16 }),
});
