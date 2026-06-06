/**
 * CTR-DOCS-UPDATE-FOR-ADR-0020 — W0 (RED)
 *
 * Tests estruturais que descrevem o estado desejado da documentação após o
 * cleanup pós-ADR-0020. Começam RED (CLAUDE.md/handbook/SKILLs ainda têm
 * strings SQLite operacionais).
 *
 * Categorias (11 CAs):
 *   - CLAUDE.md (CA-1..4): stack, ADRs vigentes, exemplos de CLI, topologia.
 *   - handbook (CA-5..6): persistence-strategy banner + índice atualizado.
 *   - SKILLs (CA-7..10): refs operacionais atualizadas em 8 SKILLs.
 *   - Sanidade (CA-11): test suite não regrede.
 *
 * Princípio: distinguir refs OPERACIONAIS (atualizar) de HISTÓRICAS (preservar).
 * Assertions são específicas a strings target — minimizam falsos positivos em
 * refs históricas legítimas (ex.: "ADR-0018 baniu X em 2026-05-14...").
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');

const read = (relPath: string): string => readFileSync(join(PROJECT_ROOT, relPath), 'utf-8');

// ─── CA-1..4 — doc canônica (AGENTS.md) ─────────────────────────────────────
// CLAUDE.md passou a ser um stub `@AGENTS.md` (commit da2d25d); o conteúdo canônico
// (stack, ADRs, topologia) vive em AGENTS.md. Estas CAs validam a doc canônica de fato.
describe('CTR-DOCS-UPDATE — CA-1..4: AGENTS.md (doc canônica; CLAUDE.md é stub @AGENTS.md)', () => {
  const canonicalDoc = (): string => read('AGENTS.md');

  it('CA-1: AGENTS.md sem strings operacionais SQLite (flags CLI, scripts, paths)', () => {
    const content = canonicalDoc();
    const offenders: string[] = [];

    // Flags da CLI removidas
    if (content.includes('--driver sqlite')) offenders.push('--driver sqlite');
    if (content.includes('--in-memory')) offenders.push('--in-memory');
    // Script pnpm renomeado
    if (content.includes('db:generate:sqlite')) offenders.push('db:generate:sqlite');
    if (content.includes('db:generate:mysql'))
      offenders.push('db:generate:mysql (sufixo desnecessário agora)');
    // Paths legados
    if (content.includes('schemas/sqlite.ts')) offenders.push('schemas/sqlite.ts');
    if (content.includes('drivers/sqlite.ts')) offenders.push('drivers/sqlite.ts');
    if (content.includes('drivers/sqlite-driver.ts')) offenders.push('drivers/sqlite-driver.ts');

    assert.equal(offenders.length, 0, `CLAUDE.md ainda menciona: ${offenders.join(', ')}`);
  });

  it('CA-2: AGENTS.md cita ADR-0020 entre os ADRs críticos', () => {
    const content = canonicalDoc();
    assert.match(
      content,
      /\bADR-0020\b/,
      'AGENTS.md não menciona ADR-0020 — deve estar entre os ADRs críticos vigentes',
    );
  });

  it('CA-3: AGENTS.md stack diz mysql2 (sem "better-sqlite3 dev")', () => {
    const content = canonicalDoc();
    assert.doesNotMatch(content, /better-sqlite3\s+dev/i, 'stack ainda diz "better-sqlite3 dev"');
    assert.match(content, /mysql2/, 'stack deve mencionar mysql2');
  });

  it('CA-4: AGENTS.md topologia por driver lista só memory e mysql', () => {
    const content = canonicalDoc();
    // Procura a tabela "Topologia de execução por driver" (ou similar) e
    // verifica que não há linha "sqlite" como driver vigente.
    // Heurística: a linha de tabela `| \`sqlite\`` (driver) não deve existir.
    assert.doesNotMatch(
      content,
      /\|\s*`sqlite`\s*\|/,
      'tabela de topologia ainda lista driver sqlite como vigente',
    );
  });
});

// ─── CA-5..6 — handbook ────────────────────────────────────────────────────
describe('CTR-DOCS-UPDATE — CA-5..6: handbook', () => {
  it('CA-5: handbook/architecture/06-persistence-strategy.md tem banner ADR-0020 e remove refs operacionais SQLite', () => {
    const content = read('handbook/architecture/06-persistence-strategy.md');
    // Banner apontando ADR-0020 no topo
    assert.match(content, /ADR-0020/, 'banner apontando ADR-0020 ausente');
    // Decisão fonte atualizada (era ADR-0018; deve passar a citar ADR-0020 ou
    // pelo menos ter banner explícito de superseded).
    assert.match(
      content,
      /Superseded|superseded|MySQL.*único|MySQL.*single/i,
      'arquivo não sinaliza que o ADR-0018 foi superseded',
    );
    // Refs operacionais a SQLite específicas (não-históricas) devem sumir:
    // tabela "Mapeamentos canônicos" tinha coluna SQLite — checar que não há
    // mais 2 colunas dialect.
    assert.doesNotMatch(
      content,
      /better-sqlite3.*:memory:/,
      'ainda menciona better-sqlite3 :memory: como caminho ativo',
    );
    assert.doesNotMatch(
      content,
      /--driver sqlite/,
      'ainda menciona --driver sqlite como caminho ativo',
    );
  });

  it('CA-6: handbook/architecture/README.md descrição da seção 06 atualizada (sem Dual-dialect)', () => {
    const content = read('handbook/architecture/README.md');
    // Linha de índice da seção 06 não deve dizer "Dual-dialect"
    assert.doesNotMatch(
      content,
      /Dual-dialect.*MySQL.*SQLite/,
      'índice ainda descreve seção 06 como Dual-dialect',
    );
  });
});

// ─── CA-7..10 — SKILLs ────────────────────────────────────────────────────
describe('CTR-DOCS-UPDATE — CA-7..10: SKILLs', () => {
  it('CA-7: database-engineer SKILL — refs operacionais atualizadas', () => {
    const content = read('.claude/skills/database-engineer/SKILL.md');
    // Sem menção a "db:generate:sqlite" como comando vivo
    assert.doesNotMatch(content, /db:generate:sqlite/, 'menciona db:generate:sqlite');
    // Sem refs a schemas/sqlite.ts como caminho ativo (regex tolera SE for refs históricas demarcadas)
    assert.doesNotMatch(
      content,
      /schemas\/sqlite\.ts.*Comando/,
      'cita schemas/sqlite.ts em contexto operacional ("Comando:")',
    );
    // Sem "Dual-dialect" como decisão vigente (manter histórica é OK se demarcada)
    assert.doesNotMatch(
      content,
      /\| \*\*Dual-dialect/,
      'tabela "Decisões adotadas" ainda lista Dual-dialect como vigente',
    );
  });

  it('CA-8: application-cli-builder SKILL — drivers vigentes são memory|mysql', () => {
    const content = read('.claude/skills/application-cli-builder/SKILL.md');
    assert.doesNotMatch(
      content,
      /memory[\s|]+\\?\|[\s|]+sqlite[\s|]+\\?\|[\s|]+mysql/,
      'ainda lista "memory | sqlite | mysql" como drivers vigentes',
    );
    assert.doesNotMatch(
      content,
      /drivers\/\{memory,sqlite,mysql\}\.ts/,
      'estrutura de pastas ainda lista drivers/sqlite.ts',
    );
  });

  it('CA-9: tdd-strategist + tdd-tutor — sem refs a tests SQLite deletados', () => {
    const strategist = read('.claude/skills/tdd-strategist/SKILL.md');
    const tutor = read('.claude/skills/tdd-tutor/SKILL.md');

    for (const [name, content] of [
      ['tdd-strategist', strategist],
      ['tdd-tutor', tutor],
    ] as const) {
      assert.doesNotMatch(
        content,
        /contracts\.cli\.sqlite\.test\.ts/,
        `${name}: ainda referencia contracts.cli.sqlite.test.ts (deletado em #5)`,
      );
      assert.doesNotMatch(
        content,
        /drizzle-sqlite\.test\.ts/,
        `${name}: ainda referencia drizzle-sqlite.test.ts (deletado em #5)`,
      );
    }
  });

  it('CA-10: database-tutor + ports-and-adapters + clean-code-theorist — refs operacionais atualizadas', () => {
    const tutor = read('.claude/skills/database-tutor/SKILL.md');
    const ports = read('.claude/skills/ports-and-adapters/SKILL.md');
    const theorist = read('.claude/skills/clean-code-theorist/SKILL.md');

    // database-tutor não deve dizer "schemas espelhados" como verdade vigente
    assert.doesNotMatch(
      tutor,
      /SQLite \(dev\/CI\) \+ MySQL \(prod\) com schemas espelhados/,
      'database-tutor ainda descreve dual-dialect como vigente',
    );

    // ports-and-adapters não deve apresentar "Persistência dual-dialect" como adotado
    assert.doesNotMatch(
      ports,
      /\*\*Persistência dual-dialect\*\*/,
      'ports-and-adapters ainda lista Persistência dual-dialect como adotado',
    );

    // clean-code-theorist — o exemplo "DRY radical vs WET pragmático" precisa
    // de exemplo vigente (ou nota de que era histórico).
    // Refs históricas demarcadas são OK; refs como "Mappers SQLite e MySQL
    // propositalmente duplicados" no presente NÃO.
    assert.doesNotMatch(
      theorist,
      /Mappers SQLite e MySQL \*\*propositalmente duplicados\*\*/,
      'clean-code-theorist apresenta duplicação SQLite+MySQL no presente — fato deixou de ser verdade após #5',
    );
  });
});

// ─── CA-11 — Sanidade ────────────────────────────────────────────────────
// Não-trivial pois exige rodar a suite — fica como check manual no W3.
// Aqui um placeholder que sempre passa: a sanidade real é validada por
// `pnpm test` rodando após as edições e mostrando 0 fail.
describe('CTR-DOCS-UPDATE — CA-11: sanidade', () => {
  it('CA-11: docs-update.test.ts compila e existe (sanidade pro W3)', () => {
    // Trivial — se este test rodou, o arquivo compila.
    // Sanidade real (pnpm test sem regressão) é check do W3.
    assert.ok(true);
  });
});
