/**
 * INVENTORY — a métrica de alcance do handbook, e os quatro limites que ela aprendeu quebrando.
 *
 * O inventário mede "quem referencia este documento" para orientar higienização. Na PRIMEIRA
 * aplicação real ele disse que `handbook/research/feture_propose/` tinha ZERO citadores — e aquele
 * diretório é a fonte canônica declarada de quatro specs entregues. Seguir o número teria arquivado
 * material vivo.
 *
 * Cada asserção aqui corresponde a uma calibragem que custou um erro observado:
 *
 *   1. menção em prosa conta        — 4 das 6 citações estavam em crase
 *   2. redirect resolve             — 2 vinham por caminho que só o mapa endereça
 *   3. diretório específico credita — a spec cita a PASTA, não cada arquivo
 *   4. diretório de topo NÃO credita — senão o próprio inventário, que lista todos os diretórios
 *                                      numa tabela, zera os órfãos do repositório inteiro
 *
 * ⚠️ Isto é HEURÍSTICA, não verdade. Serve para PRIORIZAR leitura, nunca para decidir remoção
 * sozinha — a decisão continua sendo de quem conhece o conteúdo.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { extractMentions, buildReferences } from '../../scripts/handbook/inventory.ts';

describe('INVENTORY — menção em prosa é referência', () => {
  it('captura caminho citado em crase, que o extrator de LINK ignora', () => {
    const md = 'A fonte canônica é `handbook/research/feture_propose/x.md` — ver lá.';
    assert.ok(extractMentions(md).includes('handbook/research/feture_propose/x.md'));
  });

  it('captura caminho em prosa sem crase', () => {
    assert.ok(
      extractMentions('ver handbook/specs/008/spec.md hoje').includes('handbook/specs/008/spec.md'),
    );
  });

  it('ignora bloco cercado — ali caminho é saída de comando, não referência', () => {
    assert.deepEqual(extractMentions('```\nhandbook/research/x.md\n```'), []);
  });

  it('não arrasta pontuação final para dentro do caminho', () => {
    assert.deepEqual(extractMentions('ver handbook/a/b.md.'), ['handbook/a/b.md']);
  });
});

describe('INVENTORY — crédito de referência', () => {
  let root = '';

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'inventory-'));
    mkdirSync(join(root, 'handbook/research/feture_propose/tema'), { recursive: true });
    mkdirSync(join(root, 'handbook/specs'), { recursive: true });
    writeFileSync(join(root, 'handbook/research/feture_propose/tema/a.md'), '# a\n');
    writeFileSync(join(root, 'handbook/research/feture_propose/tema/b.md'), '# b\n');
    writeFileSync(join(root, 'handbook/research/solto.md'), '# solto\n');
    // Redirect: o alvo citado com prefixo errado precisa creditar o documento real.
    writeFileSync(
      join(root, 'handbook/redirects.json'),
      JSON.stringify({
        'handbook/handbook/research/solto.md': {
          to: 'handbook/research/solto.md',
          reason: 'prefixo duplicado',
          since: '2026-08-07',
        },
      }),
    );
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const refsOf = (doc: string): ReadonlyMap<string, readonly string[]> => {
    writeFileSync(join(root, 'handbook/specs/spec.md'), doc);
    return buildReferences(root, ['handbook']);
  };

  it('citar o DIRETÓRIO específico credita os arquivos dentro dele', () => {
    // O caso real: a spec 005 declara "Insumo: `handbook/research/feture_propose/gestao_de_usuarios`"
    // — os documentos daquela pasta são o insumo, e nenhum deles é nomeado.
    const refs = refsOf('Insumo: `handbook/research/feture_propose/tema`');
    assert.deepEqual(refs.get('handbook/research/feture_propose/tema/a.md'), [
      'handbook/specs/spec.md',
    ]);
    assert.deepEqual(refs.get('handbook/research/feture_propose/tema/b.md'), [
      'handbook/specs/spec.md',
    ]);
  });

  it('citar o diretório de TOPO não credita o conteúdo', () => {
    // Sem esta regra, o próprio review de inventário — que lista `handbook/research`,
    // `handbook/specs` etc. numa tabela — passa a "citar" todos os arquivos do repositório e
    // zera os órfãos. Enumerar diretório é índice, não referência ao conteúdo.
    const refs = refsOf('| `handbook/research` | 8 | 6.830 |');
    assert.equal(refs.get('handbook/research/feture_propose/tema/a.md'), undefined);
  });

  it('redirect resolve: citar o caminho morto credita o documento vivo', () => {
    const refs = refsOf('ver `handbook/handbook/research/solto.md`');
    assert.deepEqual(refs.get('handbook/research/solto.md'), ['handbook/specs/spec.md']);
  });

  it('documento que ninguém cita segue sem crédito', () => {
    const refs = refsOf('sem citação nenhuma aqui');
    assert.equal(refs.get('handbook/research/solto.md'), undefined);
  });
});
