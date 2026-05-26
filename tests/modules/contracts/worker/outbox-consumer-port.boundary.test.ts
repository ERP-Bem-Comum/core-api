/**
 * CTR-OUTBOX-CONSUMER-PORT — W0 (RED)
 *
 * Testes estruturais de FRONTEIRA que descrevem o estado-alvo da refatoração:
 * o contrato de consumo do outbox (`OutboxBatchOps` / `WorkerOutboxOps`) deve
 * morar num PORT (`application/ports/`), não na camada `worker/`, e os adapters
 * devem implementá-lo importando do port — invertendo a dependência atual
 * `adapter → worker` para a direção correta `adapter → port ← worker` (ADR-0006).
 *
 * São mecanismo-agnósticos: NÃO prescrevem se o contrato vai estender
 * `outbox.ts` ou viver num arquivo novo, nem se `OutboxRow` será tipo canônico
 * no port ou contrato genérico — isso é decisão do W1 (ver 000-request.md
 * §"Hipóteses de solução"). Verificam apenas os invariantes observáveis.
 *
 * Mapeamento CA → teste:
 *   - CA1 (contrato fora do worker)            → INV-2, INV-3
 *   - CA2 (application não importa de adapters) → INV-4 (guard; já verde hoje)
 *   - CA3 (ciclo eliminado)                     → INV-1, INV-5
 *   - CA4 (guard type-level OutboxRow↔schema)   → typecheck (W1/W3), não node:test
 *   - CA5 (sem regressão de comportamento)      → suíte de integração (W3)
 *
 * Estado RED inicial: INV-1, INV-2, INV-3, INV-5 falham (o contrato é declarado
 * no worker e os adapters importam de `worker/`). INV-4 já passa — é um guard
 * que trava o W1 contra a "correção" errada (importar OutboxRow do mapper p/ o port).
 *
 * Precedente de teste estrutural via fs: tests/cleanup/docs-update.test.ts.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..', '..', '..');

const read = (relPath: string): string => readFileSync(join(PROJECT_ROOT, relPath), 'utf-8');

const WORKER = 'src/modules/contracts/worker/outbox-worker.ts';
const DRIZZLE = 'src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts';
const INMEMORY = 'src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
const PORTS_DIR = 'src/modules/contracts/application/ports';
const APPLICATION_DIR = 'src/modules/contracts/application';

const CONTRACT_TYPES = ['OutboxBatchOps', 'WorkerOutboxOps'] as const;

// ─── helpers ──────────────────────────────────────────────────────────────

/** Pares { bindings, path } de cada `import [type] { ... } from '...'` do conteúdo. */
const parseImports = (content: string): readonly { bindings: string; path: string }[] => {
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g;
  const out: { bindings: string; path: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    out.push({ bindings: m[1] ?? '', path: m[2] ?? '' });
  }
  return out;
};

/** Lista recursiva de .ts sob um dir relativo ao PROJECT_ROOT. */
const listTsFiles = (relDir: string): readonly string[] => {
  const abs = join(PROJECT_ROOT, relDir);
  const acc: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const childRel = join(relDir, entry.name);
    if (entry.isDirectory()) acc.push(...listTsFiles(childRel));
    else if (entry.name.endsWith('.ts')) acc.push(childRel);
  }
  return acc;
};

const importsFromWorkerLayer = (content: string): boolean =>
  parseImports(content).some((i) => /(^|\/)worker\//.test(i.path) || i.path.includes('/worker/'));

// ─── CA3 + CA1 — adapters não dependem da camada worker (INV-1) ─────────────

describe('CTR-OUTBOX-CONSUMER-PORT — INV-1: adapters não importam de worker/', () => {
  it('outbox-repository.drizzle.ts não importa nada de worker/', () => {
    assert.equal(
      importsFromWorkerLayer(read(DRIZZLE)),
      false,
      'adapter Drizzle ainda importa da camada worker (esperado: importar o contrato do port)',
    );
  });

  it('outbox.in-memory.ts não importa nada de worker/', () => {
    assert.equal(
      importsFromWorkerLayer(read(INMEMORY)),
      false,
      'adapter InMemory ainda importa da camada worker (esperado: importar o contrato do port)',
    );
  });
});

// ─── CA1 — contrato de consumo não é declarado no worker (INV-2) ────────────

describe('CTR-OUTBOX-CONSUMER-PORT — INV-2: contrato não mora na camada worker', () => {
  for (const t of CONTRACT_TYPES) {
    it(`worker/outbox-worker.ts não declara \`${t}\``, () => {
      const re = new RegExp(`export\\s+type\\s+${t}\\b`);
      assert.equal(
        re.test(read(WORKER)),
        false,
        `${t} ainda é declarado no worker (esperado: declarado num port de application/ports/)`,
      );
    });
  }
});

// ─── CA1 + CA3 — contrato de consumo mora num port (INV-3) ──────────────────

describe('CTR-OUTBOX-CONSUMER-PORT — INV-3: contrato declarado em application/ports/', () => {
  it('algum arquivo em application/ports/ declara OutboxBatchOps E WorkerOutboxOps', () => {
    const declarers = listTsFiles(PORTS_DIR).filter((rel) => {
      const c = read(rel);
      return CONTRACT_TYPES.every((t) => new RegExp(`export\\s+type\\s+${t}\\b`).test(c));
    });
    assert.ok(
      declarers.length >= 1,
      'nenhum port em application/ports/ declara o contrato de consumo (OutboxBatchOps + WorkerOutboxOps)',
    );
  });
});

// ─── CA3 — worker consome o contrato a partir do port (INV-5) ───────────────

describe('CTR-OUTBOX-CONSUMER-PORT — INV-5: worker importa o contrato do port', () => {
  for (const t of CONTRACT_TYPES) {
    it(`worker importa \`${t}\` de application/ports/`, () => {
      const fromPorts = parseImports(read(WORKER)).some(
        (i) => i.path.includes('application/ports') && new RegExp(`\\b${t}\\b`).test(i.bindings),
      );
      assert.ok(
        fromPorts,
        `worker não importa ${t} de application/ports/ (hoje declara localmente)`,
      );
    });
  }
});

// ─── CA2 — application não cruza para adapters (INV-4, guard) ───────────────
// Já verde hoje. Trava o W1 contra a "correção" errada: importar OutboxRow do
// mapper (adapter) para dentro do port violaria .claude/rules/application.md.

describe('CTR-OUTBOX-CONSUMER-PORT — INV-4 (guard): application não importa de adapters/', () => {
  it('nenhum arquivo em application/ importa de adapters/', () => {
    const offenders = listTsFiles(APPLICATION_DIR).filter((rel) =>
      parseImports(read(rel)).some((i) => i.path.includes('adapters/')),
    );
    assert.deepEqual(
      offenders,
      [],
      `arquivos de application/ importando de adapters/: ${offenders.join(', ')}`,
    );
  });
});
