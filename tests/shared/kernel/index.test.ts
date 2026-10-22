import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { isExportDeclaration, isNamedExports } from 'typescript/unstable/ast';

import { withSourceFiles } from '#tests/support/ts-ast.ts';

import * as Kernel from '#src/shared/kernel/index.ts';
import type { Money, MoneyError } from '#src/shared/kernel/index.ts';
import * as MoneyModule from '#src/shared/kernel/money.ts';
import * as PeriodModule from '#src/shared/kernel/period.ts';
import * as UserRefModule from '#src/shared/kernel/user-ref.ts';
import * as NonZeroMoneyModule from '#src/shared/kernel/non-zero-money.ts';
import * as CpfModule from '#src/shared/kernel/cpf.ts';
import * as CnpjModule from '#src/shared/kernel/cnpj.ts';
import * as PlainDateModule from '#src/shared/kernel/plain-date.ts';

/** Igualdade de tipos em tempo de compilação. */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Só compila quando o argumento de tipo é exatamente `true`.
 *
 * @param proof - o literal `true`, aceito apenas quando `T` é `true`.
 * @returns o próprio `proof`.
 */
const assertType = <T extends true>(proof: T): T => proof;

/** Caminho absoluto do barrel do Shared Kernel. */
const BARREL_PATH = resolve('src/shared/kernel/index.ts');

/** UUID v4 válido usado como identidade de usuário de referência. */
const VALID_USER_ID = '3f1c2a4e-8b7d-4c6a-9e5f-1a2b3c4d5e6f';

/** Lista os módulos de `src/modules/` que importam o arquivo do kernel informado. */
const modulesImporting = (kernelFile: string): readonly string[] => {
  const out = execFileSync(
    'git',
    ['grep', '-lE', `shared/kernel/${kernelFile}(\\.ts)?'`, '--', 'src/modules'],
    { encoding: 'utf8' },
  );
  const names = out
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => line.split('/')[2] ?? '');
  return [...new Set(names)].sort();
};

/**
 * Lê pela AST os nomes que `src/shared/kernel/index.ts` reexporta.
 *
 * @returns os nomes exportados, em ordem alfabética.
 */
const barrelExportedNames = (): readonly string[] =>
  withSourceFiles([BARREL_PATH], (files) => {
    const sf = files.get(BARREL_PATH);
    assert.ok(sf !== undefined);
    const names: string[] = [];
    for (const statement of sf.statements) {
      if (!isExportDeclaration(statement)) continue;
      const clause = statement.exportClause;
      if (clause === undefined || !isNamedExports(clause)) continue;
      for (const element of clause.elements) names.push(element.name.text);
    }
    return names.sort();
  });

describe('Shared Kernel — barrel `index.ts` em runtime', () => {
  it('importado com `import * as`, não expõe nenhum valor em runtime', () => {
    assert.deepEqual(Object.keys(Kernel), []);
  });

  it('não reexporta as funções dos módulos: `fromCents` e `parse` ficam ausentes', () => {
    const ns: Readonly<Record<string, unknown>> = Kernel;
    assert.equal(ns.fromCents, undefined);
    assert.equal(ns.parse, undefined);
  });

  it('nenhum arquivo de `src/` importa o barrel', () => {
    const result = spawnSync(
      'git',
      ['grep', '-lE', `shared/kernel/index(\\.ts)?'`, '--', 'src', ':!src/shared/kernel/index.ts'],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
  });
});

describe('Shared Kernel — tipos reexportados pelo barrel', () => {
  it('`import type { Money, MoneyError }` do barrel tipa o resultado de `Money.fromCents`', () => {
    const okResult = MoneyModule.fromCents(150);
    const money: Money | undefined = okResult.ok ? okResult.value : undefined;
    assert.equal(money?.cents, 150);

    const errResult = MoneyModule.fromCents(-1);
    const error: MoneyError | undefined = errResult.ok ? undefined : errResult.error;
    assert.equal(error, 'money-negative-value');
  });

  it('`Money` e `MoneyError` do barrel são idênticos aos de `money.ts`', () => {
    assertType<Equals<Kernel.Money, MoneyModule.Money>>(true);
    assertType<Equals<Kernel.MoneyError, MoneyModule.MoneyError>>(true);
  });

  it('`Period` e `PeriodError` do barrel são idênticos aos de `period.ts`', () => {
    assertType<Equals<Kernel.Period, PeriodModule.Period>>(true);
    assertType<Equals<Kernel.PeriodError, PeriodModule.PeriodError>>(true);
    const day = PlainDateModule.from('2026-01-01');
    assert.ok(day.ok);
    const r = PeriodModule.create(day.value, day.value);
    const error: Kernel.PeriodError | undefined = r.ok ? undefined : r.error;
    assert.equal(error, 'period-zero-duration');
  });

  it('`UserRef` e `UserRefError` do barrel são idênticos aos de `user-ref.ts`', () => {
    assertType<Equals<Kernel.UserRef, UserRefModule.UserRef>>(true);
    assertType<Equals<Kernel.UserRefError, UserRefModule.UserRefError>>(true);
    const r = UserRefModule.rehydrate(VALID_USER_ID);
    const ref: Kernel.UserRef | undefined = r.ok ? r.value : undefined;
    assert.equal(ref, VALID_USER_ID);
  });

  it('`NonZeroMoney` e `NonZeroMoneyError` do barrel são idênticos aos de `non-zero-money.ts`', () => {
    assertType<Equals<Kernel.NonZeroMoney, NonZeroMoneyModule.NonZeroMoney>>(true);
    assertType<Equals<Kernel.NonZeroMoneyError, NonZeroMoneyModule.NonZeroMoneyError>>(true);
    const r = NonZeroMoneyModule.from(MoneyModule.ZERO);
    const error: Kernel.NonZeroMoneyError | undefined = r.ok ? undefined : r.error;
    assert.equal(error, 'money-must-be-non-zero');
  });

  it('`Cpf` e `CpfError` do barrel são idênticos aos de `cpf.ts`', () => {
    assertType<Equals<Kernel.Cpf, CpfModule.Cpf>>(true);
    assertType<Equals<Kernel.CpfError, CpfModule.CpfError>>(true);
    const r = CpfModule.parse('00000000000');
    const error: Kernel.CpfError | undefined = r.ok ? undefined : r.error;
    assert.equal(error, 'invalid-cpf');
  });

  it('`Cnpj` e `CnpjError` do barrel são idênticos aos de `cnpj.ts`', () => {
    assertType<Equals<Kernel.Cnpj, CnpjModule.Cnpj>>(true);
    assertType<Equals<Kernel.CnpjError, CnpjModule.CnpjError>>(true);
    const r = CnpjModule.parse('00000000000000');
    const error: Kernel.CnpjError | undefined = r.ok ? undefined : r.error;
    assert.equal(error, 'invalid-cnpj');
  });

  it('reexporta exatamente doze tipos, sem `PlainDate` nem `PlainDateError`', () => {
    const names = barrelExportedNames();
    assert.deepEqual(names, [
      'Cnpj',
      'CnpjError',
      'Cpf',
      'CpfError',
      'Money',
      'MoneyError',
      'NonZeroMoney',
      'NonZeroMoneyError',
      'Period',
      'PeriodError',
      'UserRef',
      'UserRefError',
    ]);
    assert.ok(!names.includes('PlainDate'));
    assert.ok(!names.includes('PlainDateError'));
  });

  it('`Money` do barrel recusa `number` cru', () => {
    assertType<Equals<number extends Kernel.Money ? true : false, false>>(true);
  });
});

describe('Shared Kernel — consumo por namespace direto do módulo', () => {
  it('`import * as Money` de `money.ts` expõe `ZERO`, `add`, `equals`, `fromCents`, `greaterThan` e `subtract`', () => {
    assert.deepEqual(Object.keys(MoneyModule), [
      'ZERO',
      'add',
      'equals',
      'fromCents',
      'greaterThan',
      'subtract',
    ]);
  });

  it('`import * as Period` de `period.ts` expõe `contains`, `create`, `createIndefinite`, `equals` e `isIndefinite`', () => {
    assert.deepEqual(Object.keys(PeriodModule), [
      'contains',
      'create',
      'createIndefinite',
      'equals',
      'isIndefinite',
    ]);
  });

  it('`import * as UserRef` de `user-ref.ts` expõe só `rehydrate`', () => {
    assert.deepEqual(Object.keys(UserRefModule), ['rehydrate']);
  });

  it('`import * as NonZeroMoney` de `non-zero-money.ts` expõe só `from`', () => {
    assert.deepEqual(Object.keys(NonZeroMoneyModule), ['from']);
  });

  it('`import * as Cpf` de `cpf.ts` expõe só `parse`', () => {
    assert.deepEqual(Object.keys(CpfModule), ['parse']);
  });

  it('`import * as Cnpj` de `cnpj.ts` expõe `isValidCnpj` e `parse`', () => {
    assert.deepEqual(Object.keys(CnpjModule), ['isValidCnpj', 'parse']);
  });
});

describe('Shared Kernel — uso real dos VOs pelos módulos de `src/modules/`', () => {
  it('`money`, `user-ref`, `cnpj` e `period` são importados por pelo menos dois módulos', () => {
    assert.ok(modulesImporting('money').length >= 2);
    assert.ok(modulesImporting('user-ref').length >= 2);
    assert.ok(modulesImporting('cnpj').length >= 2);
    assert.ok(modulesImporting('period').length >= 2);
  });

  it('`cpf` é importado só por `partners` e `non-zero-money` só por `contracts`', () => {
    assert.deepEqual(modulesImporting('cpf'), ['partners']);
    assert.deepEqual(modulesImporting('non-zero-money'), ['contracts']);
  });

  it('`plain-date`, fora do barrel, é importado por três módulos', () => {
    assert.deepEqual(modulesImporting('plain-date'), ['contracts', 'financial', 'partners']);
  });
});
