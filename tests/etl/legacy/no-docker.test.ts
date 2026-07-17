import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { access, readFile } from 'node:fs/promises';

// ETL-LEGACY-DIRECT-CONNECTION (W0 RED) — CA3: a dependência de Docker/dump some de vez.
// Testes estruturais (leem o source como texto, não importam os módulos) que só ficam
// GREEN quando restore.ts for apagado e os entrypoints deixarem de costurar
// `withLegacyMysql`. Raiz do repo = 3 níveis acima de tests/etl/legacy/.
//
// ETL-BUDGET-PLANS (2026-07-17): o `compose.etl.yaml` VOLTOU, com papel DIFERENTE — banco de
// REFERÊNCIA/ambiente isolado para conferir a migração (decisão do tech lead), NÃO parte do
// caminho de leitura do ETL. O invariante que importa nunca foi "o arquivo não existe"; é "o
// CÓDIGO do ETL não depende de Docker/compose". A asserção de ausência do arquivo (proxy estrito
// demais) deu lugar à checagem do invariante real: nenhum script em `scripts/etl/` referencia o
// compose. Assim o ambiente de referência convive com a decisão de 02/07 sem contradizê-la.
const rootUrl = new URL('../../../', import.meta.url);

const exists = async (rel: string): Promise<boolean> => {
  try {
    await access(new URL(rel, rootUrl));
    return true;
  } catch {
    return false;
  }
};

const read = async (rel: string): Promise<string> => readFile(new URL(rel, rootUrl), 'utf8');

const ENTRYPOINTS = [
  'scripts/etl/main.ts',
  'scripts/etl/contracts/main.ts',
  'scripts/etl/financial/main.ts',
];

describe('ETL sem Docker (CA3) — ETL-LEGACY-DIRECT-CONNECTION', () => {
  it('scripts/etl/legacy/restore.ts foi removido', async () => {
    assert.equal(await exists('scripts/etl/legacy/restore.ts'), false);
  });

  it('nenhum script do ETL depende do compose.etl.yaml (o arquivo pode existir como ambiente de referência)', async () => {
    for (const f of ENTRYPOINTS) {
      const src = await read(f);
      assert.ok(!src.includes('compose.etl'), `${f} referencia compose.etl.yaml`);
    }
    const connect = await read('scripts/etl/legacy/connect.ts');
    assert.ok(!connect.includes('compose.etl'), 'connect.ts referencia compose.etl.yaml');
  });

  it('nenhum entrypoint costura withLegacyMysql nem a flag --dump', async () => {
    for (const f of ENTRYPOINTS) {
      const src = await read(f);
      assert.ok(!src.includes('withLegacyMysql'), `${f} ainda usa withLegacyMysql`);
      assert.ok(!src.includes('--dump'), `${f} ainda referencia --dump`);
    }
  });

  it('connect.ts não importa restore.ts e lê ETL_LEGACY_CONNECTION_STRING', async () => {
    const src = await read('scripts/etl/legacy/connect.ts');
    assert.ok(!src.includes('restore.ts'), 'connect.ts ainda importa restore.ts');
    assert.ok(
      src.includes('ETL_LEGACY_CONNECTION_STRING'),
      'connect.ts não lê ETL_LEGACY_CONNECTION_STRING',
    );
  });

  it('diagnostics/check-duplicates.ts usa a URL do legado, não o container efêmero', async () => {
    const src = await read('scripts/etl/diagnostics/check-duplicates.ts');
    assert.ok(
      src.includes('ETL_LEGACY_CONNECTION_STRING'),
      'check-duplicates.ts não usa ETL_LEGACY_CONNECTION_STRING',
    );
  });
});
