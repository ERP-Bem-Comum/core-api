/**
 * OUTBOX-AGGREGATE-TYPES-IN-CHECK — o que o código publica, o banco aceita.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: todo valor de `FIN_OUTBOX_AGGREGATE_TYPES` está no CHECK que a MIGRATION criou — nos dois
 * lados, `fin_outbox` e `fin_outbox_dead_letter`.
 *
 * Por que este gate existe: `RemittanceEvent` entrou na union de eventos publicáveis, o TypeScript
 * aprovou, e todo `save` de remessa passou a reverter em runtime contra
 * `fin_outbox_aggregate_type_chk`. O sintoma era um `Result` de erro de persistência que não dizia
 * a causa, e a transação levava junto o estado — a remessa nem mudava de status. Só o job de
 * integração pegou, depois do push.
 *
 * A fonte única + o tipo em `extractAggregateInfo` fecham o caso "esqueci de listar o agregado":
 * não compila. O que eles NÃO alcançam é "listei, mas não rodei `db:generate`" — a constraint vive
 * no banco, e o compilador não sabe disso. É o buraco que este teste tapa, e ele roda no `pnpm test`
 * comum, sem MySQL: o erro aparece na máquina de quem escreveu, não no CI.
 *
 * A asserção é de PROPRIEDADE (todo tipo emitido é aceito), nunca de contagem — acrescentar um
 * agregado com sua migration mantém o teste verde, como deve.
 *
 * Fonte da verdade do lado do banco: os arquivos `.sql` de migration, não o snapshot JSON. O
 * snapshot descreve o que o drizzle-kit PENSA do schema; o `.sql` é o que roda no banco.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FIN_OUTBOX_AGGREGATE_TYPES } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { PROJECT_ROOT } from '../support/source-scan.ts';

const MIGRATIONS_DIR = 'src/modules/financial/adapters/persistence/migrations/mysql';

/** Constraints cobertas: a da tabela e a da DLQ. Ambas devem aceitar tudo que o código emite. */
const CONSTRAINTS = ['fin_outbox_aggregate_type_chk', 'fin_outbox_dl_aggregate_type_chk'] as const;

/**
 * `.sql` de migration do financial, em ordem — a última definição de cada CHECK é a vigente.
 *
 * Pergunta ao GIT, não ao disco (`.claude/rules/testing.md`): migration é conteúdo versionado, e um
 * `.sql` não commitado não roda em ambiente nenhum. Ler do disco daria verde na máquina de quem
 * escreveu e vermelho no runner — ou pior, o contrário.
 */
const migrationFiles = (): readonly string[] =>
  execFileSync('git', ['ls-files', MIGRATIONS_DIR], { encoding: 'utf8', cwd: PROJECT_ROOT })
    .split('\n')
    .filter((f) => f.endsWith('.sql'))
    .sort();

/**
 * Valores aceitos pela definição VIGENTE do CHECK — a última que aparece nas migrations, já que uma
 * migration posterior faz DROP + ADD e substitui a anterior.
 */
const acceptedValues = (constraint: string): readonly string[] => {
  let latest: string[] = [];

  for (const file of migrationFiles()) {
    const sql = readFileSync(join(PROJECT_ROOT, file), 'utf8');
    // `ADD CONSTRAINT <nome> CHECK (... IN ('A', 'B'))` — captura a lista entre os parênteses do IN.
    const pattern = new RegExp(
      `ADD CONSTRAINT \`?${constraint}\`?[\\s\\S]*?IN\\s*\\(([^)]*)\\)`,
      'g',
    );
    for (const match of sql.matchAll(pattern)) {
      const list = match[1] ?? '';
      latest = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '');
    }
  }

  return latest;
};

describe('OUTBOX-AGGREGATE-TYPES-IN-CHECK — o que o código publica, o banco aceita', () => {
  // Sem esta guarda, um erro no glob tornaria todo o resto verde por vacuidade.
  it('há migrations a inspecionar', () => {
    assert.ok(
      migrationFiles().length > 0,
      `nenhum .sql encontrado em ${MIGRATIONS_DIR} — o glob quebrou`,
    );
  });

  it('a fonte única não está vazia', () => {
    assert.ok(FIN_OUTBOX_AGGREGATE_TYPES.length > 0);
  });

  for (const constraint of CONSTRAINTS) {
    describe(constraint, () => {
      // Guarda contra regex que casa nada: se o formato do DDL gerado mudar, o teste passaria
      // comparando contra lista vazia — e diria "tudo certo" justamente quando não sabe nada.
      it('a constraint foi encontrada nas migrations', () => {
        assert.ok(
          acceptedValues(constraint).length > 0,
          `nenhuma definição de ${constraint} casada — regex desatualizada com o DDL do drizzle-kit?`,
        );
      });

      it('aceita todo agregado que o código emite', () => {
        const accepted = acceptedValues(constraint);
        const missing = FIN_OUTBOX_AGGREGATE_TYPES.filter((t) => !accepted.includes(t));

        assert.deepEqual(
          missing,
          [],
          `Agregado(s) que o código publica e o banco RECUSA em ${constraint}: ${missing.join(', ')}.\n` +
            `  aceitos hoje: ${accepted.join(', ')}\n` +
            'Rode `pnpm run db:generate:financial` — a constraint vive no banco, e sem a migration ' +
            'o INSERT reverte a transação inteira em runtime.',
        );
      });
    });
  }
});
