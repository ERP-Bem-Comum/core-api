/**
 * MYSQL-TEST-PORT-HELPER — W0 (RED) — teste ESTRUTURAL (fonte única).
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado). Aqui o estado
 * desejado é: NENHUM arquivo de tests/ fixa `127.0.0.1:3306` fora de uma allowlist pinada, e o
 * runner de integração (scripts/ci/test-integration.ts) não mantém sua própria cópia da lógica
 * de porta — todos consomem o helper único tests/support/mysql-conn.ts.
 *
 * RED hoje: `grep -rl 127.0.0.1:3306 tests/` (fora de tests/reports/CA-*) acha 69 arquivos; com
 * os 2 arquivos novos do W0 (este + o teste do helper), a varredura acha 71, dos quais 3 estão
 * na allowlist ⇒ 68 offenders fora da allowlist. O W1 migra os 68 → 0.
 *
 * Cobertura: CA1 (0 fora da allowlist), CA7 (runner usa o helper), CA6 (caso protegido intacto).
 * Sustentação: 000-request.md §Critérios de aceite + §🚨 Caso protegido.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');
const TESTS_ROOT = join(PROJECT_ROOT, 'tests');

// A substring proibida: host:porta fixos do MySQL de teste. (Este arquivo contém o needle → é
// um offender legítimo, logo entra na allowlist abaixo.)
const NEEDLE = '127.0.0.1:3306';

// tests/reports/CA-* são artefatos FORENSES (registro histórico) — fora de escopo
// (000-request §Fora de escopo). Excluídos da varredura, NÃO entram na allowlist.
const EXCLUDED_DIRS = new Set(['reports']);

// 🔒 Allowlist PINADA — as ÚNICAS ocorrências legítimas do literal em tests/ após o W1.
// Cada entrada tem justificativa. Pinada por deepEqual para não crescer em silêncio.
const ALLOWLIST: readonly string[] = [
  // a fonte única — constrói a conn default a partir de host+porta (pode ou não conter o
  // literal contíguo, dependendo de como o W1 interpolar; pinada defensivamente).
  'tests/support/mysql-conn.ts',
  // o teste do helper — PINA a string congelada (CA2); precisa conter o literal por definição.
  'tests/support/mysql-conn.test.ts',
  // este próprio teste — contém o needle na constante NEEDLE / na allowlist.
  'tests/cleanup/mysql-test-port-single-source.test.ts',
  // 🚨 caso protegido — o literal aqui está NUM COMENTÁRIO que explica a ausência DELIBERADA de
  // default (AUTH_SYNC_TEST_DATABASE_URL ?? ''). NÃO homogeneizar (CA6).
  'tests/jobs/auth/sync-permissions.drizzle-mysql.test.ts',
];

// Walk recursivo — lista todos os arquivos sob tests/ (exceto EXCLUDED_DIRS e dot-dirs),
// devolvendo paths relativos ao PROJECT_ROOT em formato posix (/).
const walkTests = (): string[] => {
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.')) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (dir === TESTS_ROOT && EXCLUDED_DIRS.has(entry)) continue;
        visit(full);
      } else if (st.isFile()) {
        out.push(relative(PROJECT_ROOT, full).split(sep).join('/'));
      }
    }
  };
  visit(TESTS_ROOT);
  return out;
};

// Equivalente a `grep -rl NEEDLE tests/` (fora dos excluídos), ordenado.
const filesContainingNeedle = (): string[] =>
  walkTests()
    .filter((rel) => readFileSync(join(PROJECT_ROOT, rel), 'utf-8').includes(NEEDLE))
    .sort();

// ─── CA1 — fonte única: 0 ocorrências fora da allowlist ─────────────────────
describe('MYSQL-TEST-PORT — CA1: nenhum literal 127.0.0.1:3306 fora da allowlist', () => {
  it('offenders fora da allowlist === [] (hoje: 68 → RED; W1 migra para 0)', () => {
    const allow = new Set(ALLOWLIST);
    const offenders = filesContainingNeedle().filter((f) => !allow.has(f));
    assert.deepEqual(
      offenders,
      [],
      `Arquivos ainda fixam "${NEEDLE}" fora da allowlist (migrar para o helper mysql-conn):\n${offenders.join('\n')}`,
    );
  });

  it('a allowlist está pinada (não cresce em silêncio)', () => {
    // Pin defensivo: mudar a allowlist exige tocar este deepEqual conscientemente.
    assert.deepEqual([...ALLOWLIST].sort(), [
      'tests/cleanup/mysql-test-port-single-source.test.ts',
      'tests/jobs/auth/sync-permissions.drizzle-mysql.test.ts',
      'tests/support/mysql-conn.test.ts',
      'tests/support/mysql-conn.ts',
    ]);
  });
});

// ─── CA7 — runner de integração consome o helper (uma fonte só p/ a porta) ──
describe('MYSQL-TEST-PORT — CA7: runner usa a fonte única de porta', () => {
  const runner = join(PROJECT_ROOT, 'scripts/ci/test-integration.ts');
  const content = readFileSync(runner, 'utf-8');

  it('não mantém sua própria derivação de porta default (sem `MYSQL_PORT ?? ...` inline)', () => {
    assert.doesNotMatch(
      content,
      /process\.env\[['"]MYSQL_PORT['"]\]\s*\?\?/,
      'runner ainda deriva a porta por conta própria — deve delegar ao helper mysql-conn',
    );
  });

  it('não constrói a conn inline com host:porta interpolada (`127.0.0.1:${...}`)', () => {
    assert.doesNotMatch(
      content,
      /127\.0\.0\.1:\$\{/,
      'runner ainda monta a conn inline — deve delegar ao helper mysql-conn',
    );
  });

  it('consome o helper mysql-conn', () => {
    assert.match(content, /mysql-conn/, 'runner não referencia o helper mysql-conn');
  });
});

// ─── CA6 — caso protegido segue SEM default (guarda de regressão) ───────────
describe('MYSQL-TEST-PORT — CA6: caso protegido (sync-permissions) intacto', () => {
  // Guarda de invariante: começa VERDE e DEVE seguir verde após o W1 (o W1 não pode dar default
  // a este arquivo). Ver 000-request §🚨 Caso protegido.
  const protectedFile = join(
    PROJECT_ROOT,
    'tests/jobs/auth/sync-permissions.drizzle-mysql.test.ts',
  );
  const content = readFileSync(protectedFile, 'utf-8');

  it("AUTH_SYNC_TEST_DATABASE_URL ?? '' segue sem default de conexão", () => {
    assert.match(content, /AUTH_SYNC_TEST_DATABASE_URL['"]\]\s*\?\?\s*''/);
  });

  it('não passou a consumir o helper mysql-conn (nenhum caminho novo até um banco com dados)', () => {
    assert.doesNotMatch(content, /mysql-conn/);
  });
});
