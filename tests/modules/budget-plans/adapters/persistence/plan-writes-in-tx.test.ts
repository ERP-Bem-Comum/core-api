// `describeDbError` e `mysqlErrorOf` (plan-writes-in-tx.drizzle.ts) — a linha de log de falha do
// módulo. Duas exigências que puxam em sentidos opostos, e as duas ficam presas aqui:
//   • F5 da revisão da #1092: nunca os parâmetros da query (ids, centavos) nem o valor da chave;
//   • R2 da segunda revisão: o erro que NÃO vem do driver mantém a mensagem, senão o 503 fica
//     impossível de diagnosticar; FK e duplicate key trazem o nome da constraint.
import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import {
  describeDbError,
  mysqlErrorOf,
} from '#src/modules/budget-plans/adapters/persistence/repos/plan-writes-in-tx.drizzle.ts';

// Forma do erro do mysql2 (os campos que o driver preenche).
const driverError = (fields: Readonly<Record<string, unknown>>): Error => {
  const message = typeof fields['sqlMessage'] === 'string' ? fields['sqlMessage'] : 'mysql';
  return Object.assign(new Error(message), fields);
};

// Forma do embrulho do Drizzle: mensagem com SQL + params, erro do driver em `cause`.
const drizzleWrapped = (cause: unknown): Error =>
  new Error('Failed query: insert into `t` values (?, ?)\nparams: SEGREDO-ID,123456', { cause });

describe('describeDbError — log de falha sem dado e com diagnóstico', () => {
  it('erro comum (não é do driver) mantém nome e mensagem', () => {
    assert.equal(
      describeDbError(new TypeError('x is not a function')),
      'TypeError: x is not a function',
    );
  });

  it('embrulho do Drizzle sem errno na causa: usa a mensagem da causa, nunca os params', () => {
    const line = describeDbError(drizzleWrapped(new Error('Pool is closed.')));
    assert.equal(line, 'Error: Pool is closed.');
    assert.ok(!line.includes('SEGREDO-ID'));
  });

  it('duplicate key: errno, code e o índice — sem o valor da chave', () => {
    const line = describeDbError(
      drizzleWrapped(
        driverError({
          errno: 1062,
          code: 'ER_DUP_ENTRY',
          sqlMessage: "Duplicate entry 'SEGREDO-ID-1' for key 'bgp_budget_results.uq_x'",
        }),
      ),
    );
    assert.equal(line, 'errno=1062 code=ER_DUP_ENTRY key=bgp_budget_results.uq_x');
    assert.ok(!line.includes('SEGREDO-ID'));
  });

  it('violação de FK: o nome da constraint aparece (antes saía key=-)', () => {
    const err = driverError({
      errno: 1451,
      code: 'ER_ROW_IS_REFERENCED_2',
      sqlMessage:
        'Cannot delete or update a parent row: a foreign key constraint fails (`core`.`bgp_budget_plans`, CONSTRAINT `bgp_budget_plans_parent_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `bgp_budget_plans` (`id`))',
    });
    assert.equal(mysqlErrorOf(drizzleWrapped(err)).key, 'bgp_budget_plans_parent_id_fk');
    assert.equal(
      describeDbError(drizzleWrapped(err)),
      'errno=1451 code=ER_ROW_IS_REFERENCED_2 key=bgp_budget_plans_parent_id_fk',
    );
  });
});
