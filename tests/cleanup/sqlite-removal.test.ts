/**
 * CTR-CLEANUP-SQLITE — W0 (RED)
 *
 * Testes estruturais que descrevem o estado desejado pós-cleanup do SQLite.
 * Começam RED (arquivos SQLite ainda existem; renames pendentes; deps presentes).
 *
 * Categorias (18 CAs):
 *   - DELETE (8): arquivos SQLite não devem existir.
 *   - RENAME (5): mappers/repos MySQL renomeados para canônicos (sem sufixo).
 *   - CLI/Config (5): parse-driver-flags sem `sqlite`, package.json sem `better-sqlite3`,
 *     `.npmrc` sem hoist do drizzle-orm, `src/**` sem referências a sqlite/sqlitehandle.
 *
 * Sustentação: ADR-0020, decisões D1-D12 de `000-request.md`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');

const src = (p: string): string => join(PROJECT_ROOT, 'src', p);
const tests = (p: string): string => join(PROJECT_ROOT, 'tests', p);

// Walk recursivo simples — lista todos os arquivos .ts sob um diretório.
const walkTs = (root: string): string[] => {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        visit(full);
      } else if (st.isFile() && entry.endsWith('.ts')) {
        out.push(full);
      }
    }
  };
  visit(root);
  return out;
};

// ─── CA-1..8 — DELETE ─────────────────────────────────────────────────────
describe('CTR-CLEANUP-SQLITE — CA-1..8: artefatos SQLite removidos', () => {
  const filesThatMustNotExist: readonly (readonly [string, string])[] = [
    [
      'CA-1: sqlite-driver.ts',
      src('modules/contracts/adapters/persistence/drivers/sqlite-driver.ts'),
    ],
    ['CA-2: schemas/sqlite.ts', src('modules/contracts/adapters/persistence/schemas/sqlite.ts')],
    ['CA-3: migrations/sqlite/', src('modules/contracts/adapters/persistence/migrations/sqlite')],
    ['CA-4: cli/drivers/sqlite.ts', src('modules/contracts/cli/drivers/sqlite.ts')],
    [
      'CA-5: drizzle-sqlite.test.ts',
      tests('modules/contracts/adapters/persistence/drizzle-sqlite.test.ts'),
    ],
    ['CA-6: contracts.cli.sqlite.test.ts', tests('cli/contracts.cli.sqlite.test.ts')],
    ['CA-7: helpers/temp-db.ts', tests('cli/helpers/temp-db.ts')],
    [
      'CA-8: drizzle.config.ts legado (SQLite) ausente; o canônico é o renomeado de drizzle.mysql.config.ts',
      // Este caso é especial: o nome `drizzle.config.ts` deve existir, mas seu conteúdo
      // não pode referenciar SQLite. Verificamos a SEMÂNTICA, não a existência.
      '',
    ],
  ];

  for (const [name, path] of filesThatMustNotExist) {
    if (name.startsWith('CA-8')) continue; // tratado abaixo
    it(name, () => {
      assert.equal(existsSync(path), false, `${path} ainda existe — DELETE pendente`);
    });
  }

  it('CA-8: config drizzle MySQL vive em db/drizzle/ (sem SQLite, sem legado na raiz)', () => {
    // Repo cleanup (Fase 2): os drizzle.config.*.ts da raiz foram movidos para db/drizzle/.
    const drizzleConfig = join(PROJECT_ROOT, 'db/drizzle/contracts.ts');
    assert.ok(existsSync(drizzleConfig), 'db/drizzle/contracts.ts ausente');
    const content = readFileSync(drizzleConfig, 'utf-8');
    assert.match(
      content,
      /dialect:\s*['"]mysql['"]/,
      'db/drizzle/contracts.ts não tem dialect:mysql',
    );
    // Não deve sobrar config drizzle legado na raiz.
    for (const legado of ['drizzle.config.ts', 'drizzle.mysql.config.ts']) {
      assert.equal(
        existsSync(join(PROJECT_ROOT, legado)),
        false,
        `${legado} ainda existe na raiz — mover para db/drizzle/ pendente`,
      );
    }
  });
});

// ─── CA-9..13 — RENAME (mappers e repos sem sufixo mysql) ─────────────────
describe('CTR-CLEANUP-SQLITE — CA-9..13: mappers/repos MySQL renomeados para canônicos', () => {
  it('CA-9: mappers/contract.mapper.ts é o canônico (era contract.mapper.mysql.ts)', () => {
    const canonical = src('modules/contracts/adapters/persistence/mappers/contract.mapper.ts');
    const parallel = src('modules/contracts/adapters/persistence/mappers/contract.mapper.mysql.ts');
    assert.ok(existsSync(canonical), 'contract.mapper.ts ausente');
    assert.equal(existsSync(parallel), false, 'contract.mapper.mysql.ts ainda existe');
    const content = readFileSync(canonical, 'utf-8');
    // Exports canônicos (sem sufixo Mysql)
    assert.match(content, /export\s+const\s+contractFromRow\b/);
    assert.match(content, /export\s+const\s+contractToInsert\b/);
    assert.match(content, /export\s+type\s+ContractRow\b/);
    assert.match(content, /export\s+type\s+ContractInsert\b/);
    assert.match(content, /export\s+type\s+ContractMapperError\b/);
  });

  it('CA-10: mappers/amendment.mapper.ts é o canônico', () => {
    const canonical = src('modules/contracts/adapters/persistence/mappers/amendment.mapper.ts');
    const parallel = src(
      'modules/contracts/adapters/persistence/mappers/amendment.mapper.mysql.ts',
    );
    assert.ok(existsSync(canonical), 'amendment.mapper.ts ausente');
    assert.equal(existsSync(parallel), false, 'amendment.mapper.mysql.ts ainda existe');
    const content = readFileSync(canonical, 'utf-8');
    assert.match(content, /export\s+const\s+amendmentFromRow\b/);
    assert.match(content, /export\s+const\s+amendmentToInsert\b/);
    assert.match(content, /export\s+type\s+AmendmentMapperError\b/);
  });

  it('CA-11: mappers/period.mapper.ts é o canônico', () => {
    const canonical = src('modules/contracts/adapters/persistence/mappers/period.mapper.ts');
    const parallel = src('modules/contracts/adapters/persistence/mappers/period.mapper.mysql.ts');
    assert.ok(existsSync(canonical), 'period.mapper.ts ausente');
    assert.equal(existsSync(parallel), false, 'period.mapper.mysql.ts ainda existe');
    const content = readFileSync(canonical, 'utf-8');
    assert.match(content, /export\s+const\s+periodFromColumns\b/);
    assert.match(content, /export\s+const\s+periodToColumns\b/);
    assert.match(content, /export\s+type\s+PeriodColumns\b/);
    assert.match(content, /export\s+type\s+PeriodMapperError\b/);
  });

  it('CA-12: repos/contract-repository.drizzle.ts é o canônico (era ...drizzle-mysql.ts)', () => {
    const canonical = src(
      'modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts',
    );
    const parallel = src(
      'modules/contracts/adapters/persistence/repos/contract-repository.drizzle-mysql.ts',
    );
    assert.ok(existsSync(canonical), 'contract-repository.drizzle.ts ausente');
    assert.equal(existsSync(parallel), false, 'contract-repository.drizzle-mysql.ts ainda existe');
    const content = readFileSync(canonical, 'utf-8');
    assert.match(content, /export\s+const\s+createDrizzleContractRepository\b/);
    // Não deve mais ter o nome com sufixo Mysql:
    assert.doesNotMatch(content, /createDrizzleMysqlContractRepository/);
  });

  it('CA-13: repos/amendment-repository.drizzle.ts é o canônico', () => {
    const canonical = src(
      'modules/contracts/adapters/persistence/repos/amendment-repository.drizzle.ts',
    );
    const parallel = src(
      'modules/contracts/adapters/persistence/repos/amendment-repository.drizzle-mysql.ts',
    );
    assert.ok(existsSync(canonical), 'amendment-repository.drizzle.ts ausente');
    assert.equal(existsSync(parallel), false, 'amendment-repository.drizzle-mysql.ts ainda existe');
    const content = readFileSync(canonical, 'utf-8');
    assert.match(content, /export\s+const\s+createDrizzleAmendmentRepository\b/);
    assert.doesNotMatch(content, /createDrizzleMysqlAmendmentRepository/);
  });
});

// ─── CA-14..17 — CLI/Config ────────────────────────────────────────────────
describe('CTR-CLEANUP-SQLITE — CA-14..17: CLI/Config', () => {
  it('CA-14: parse-driver-flags.ts removido com a CLI embutida (CLI-RETIRE-EMBEDDED)', () => {
    // A CLI (e seus driver-flags) foi removida — sqlite trivialmente ausente lá.
    const file = src('modules/contracts/cli/parse-driver-flags.ts');
    assert.equal(existsSync(file), false);
  });

  it('CA-15: package.json sem better-sqlite3 e sem @types/better-sqlite3', () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      pnpm?: { onlyBuiltDependencies?: readonly string[] };
    };
    assert.equal(pkg.dependencies?.['better-sqlite3'], undefined, 'better-sqlite3 ainda em deps');
    assert.equal(
      pkg.devDependencies?.['@types/better-sqlite3'],
      undefined,
      '@types/better-sqlite3 ainda em devDeps',
    );
    // pnpm.onlyBuiltDependencies só servia para better-sqlite3 — pode sair ou ficar []
    const obd = pkg.pnpm?.onlyBuiltDependencies;
    if (obd !== undefined) {
      assert.equal(
        (obd as readonly string[]).includes('better-sqlite3'),
        false,
        'pnpm.onlyBuiltDependencies ainda lista better-sqlite3',
      );
    }
  });

  it('CA-16: package.json#scripts.db:generate aponta para drizzle.config.ts; sem db:generate:sqlite', () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    assert.equal(
      pkg.scripts?.['db:generate:sqlite'],
      undefined,
      'db:generate:sqlite ainda em scripts',
    );
    const dbGen = pkg.scripts?.['db:generate'];
    assert.ok(dbGen, 'db:generate ausente');
    assert.match(dbGen, /drizzle-kit\s+generate/);
    // Não deve passar --config=drizzle.mysql.config.ts (esse arquivo foi renomeado)
    assert.doesNotMatch(dbGen, /drizzle\.mysql\.config\.ts/);
  });

  it('CA-17: .npmrc mantém dedupe-peer-dependents, removeu public-hoist-pattern do drizzle-orm', () => {
    const npmrc = readFileSync(join(PROJECT_ROOT, '.npmrc'), 'utf-8');
    assert.match(npmrc, /dedupe-peer-dependents\s*=\s*true/);
    assert.doesNotMatch(
      npmrc,
      /public-hoist-pattern\[\]\s*=\s*drizzle-orm/,
      'public-hoist-pattern do drizzle-orm ainda em .npmrc — pode sair sem better-sqlite3',
    );
  });
});

// ─── CA-18 — Audit exhaustivo de referências a SQLite em src/ ────────────
describe('CTR-CLEANUP-SQLITE — CA-18: nenhuma referência a SQLite em src/', () => {
  it('CA-18: nenhum arquivo em src/ menciona better-sqlite3, SqliteHandle, SqliteDriverError, sqlite-driver-*', () => {
    const SRC = join(PROJECT_ROOT, 'src');
    const files = walkTs(SRC);
    const banned: RegExp[] = [
      /better-sqlite3/,
      /\bSqliteHandle\b/,
      /\bSqliteDriverError\b/,
      /'sqlite-driver-[a-z-]+'/,
      /\bopenSqlite\b/,
      /\bcreateDrizzleSqlite/,
      /from\s+['"][^'"]*sqlite-driver[^'"]*['"]/,
      /from\s+['"][^'"]*schemas\/sqlite[^'"]*['"]/,
      /buildSqliteContext/,
    ];
    const offenders: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      for (const re of banned) {
        if (re.test(content)) {
          offenders.push(`${f}: matches ${re.source}`);
          break;
        }
      }
    }
    assert.equal(
      offenders.length,
      0,
      `Referências a SQLite encontradas em src/:\n${offenders.join('\n')}`,
    );
  });
});
