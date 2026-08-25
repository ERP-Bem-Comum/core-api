/**
 * HANDBOOK-REFS — a referência por identificador resolve (Fase 5 da spec 041).
 *
 * As fases anteriores CONTIVERAM o link morto: o tombstone impede remoção silenciosa, o gate impede
 * link novo quebrado, o mapa endereça o estoque. Nenhuma delas atacou a causa — o caminho do arquivo
 * ser a identidade do documento. `[[adr-0017]]` desacopla: o identificador é o que o documento É;
 * onde mora e como se chama o arquivo viram detalhe, e renomear deixa de quebrar citação.
 *
 * A forma ANTERIOR de `[[…]]` no repositório era o nome do arquivo — `[[0018-auditlog-transversal-todos-bcs]]`
 * —, que tem exatamente o defeito que a sintaxe deveria curar: renomeie o arquivo e a referência
 * morre. Normalizadas para `[[inquiry-0018]]` nesta fase.
 *
 * ⚠️ Limitação declarada: `[[id]]` não é clicável no GitHub. O ganho é sobreviver a rename; o custo
 * é um clique. Por isso a convenção recomenda ID onde o alvo é volátil e caminho onde é estável.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { repoPaths } from '../../scripts/handbook/link-scan.ts';
import {
  buildRegistry,
  findRefs,
  unresolved,
  REF_PATTERN,
  REF_SOURCES,
} from '../../scripts/handbook/refs.ts';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

const registry = () => buildRegistry(PROJECT_ROOT);
const refs = () => findRefs(PROJECT_ROOT, ['handbook']);

describe('HANDBOOK-REFS — todo identificador citado existe', () => {
  it('nenhuma citação [[id]] fica sem destino', () => {
    const bad = unresolved(refs(), registry())
      .map((r) => `${r.from} → [[${r.id}]]`)
      .sort();
    assert.deepEqual(
      bad,
      [],
      'citação por identificador que o registro não resolve. O id vem do PREFIXO numérico do ' +
        'arquivo (ou do diretório, no caso de spec):\n' +
        bad.join('\n'),
    );
  });

  it('todo caminho do registro está no repositório', () => {
    // Pelo git, não pelo disco — ver .claude/rules/testing.md §"Gate estrutural pergunta ao git".
    const reg = registry();
    const repo = repoPaths(PROJECT_ROOT, [...reg.values()]);
    const dead = [...reg]
      .filter(([, path]) => !repo.exists(path))
      .map(([id, path]) => `${id} → ${path}`)
      .sort();
    assert.deepEqual(dead, [], 'registro aponta para caminho inexistente:\n' + dead.join('\n'));
  });

  it('o registro cobre as três famílias e enxerga volume (guarda contra vacuidade)', () => {
    const reg = registry();
    for (const { kind } of REF_SOURCES) {
      assert.ok(
        [...reg.keys()].some((id) => id.startsWith(`${kind}-`)),
        `nenhum identificador da família '${kind}': o diretório-fonte mudou de forma`,
      );
    }
    assert.ok(reg.size > 50, `só ${reg.size} identificadores — a varredura quebrou`);
  });

  it('há citações a verificar (guarda contra gate vazio)', () => {
    // Sem esta guarda, remover a última citação do repositório deixaria a primeira asserção
    // verde para sempre, sobre um conjunto vazio.
    assert.ok(
      refs().length > 0,
      'nenhuma citação [[id]] no handbook: o extrator ou a convenção mudou',
    );
  });
});

describe('HANDBOOK-REFS — a sintaxe não colide com o que já existe no repo', () => {
  const matches = (s: string): readonly string[] =>
    [...s.matchAll(REF_PATTERN)].map((m) => m[1] ?? '');

  it('casa a forma canônica', () => {
    assert.deepEqual(matches('ver [[adr-0017]] e [[inquiry-0011]] e [[spec-041]]'), [
      'adr-0017',
      'inquiry-0011',
      'spec-041',
    ]);
  });

  it('NÃO casa teste de bash — `[[ "$x" == y ]]` vive nos hooks', () => {
    assert.deepEqual(matches('if [[ "$FILE_PATH" != *.ts ]]; then'), []);
    assert.deepEqual(matches('[[ $- == *i* ]]'), []);
  });

  it('NÃO casa array aninhado de exemplo', () => {
    assert.deepEqual(matches("[['1','2']]"), []);
    assert.deepEqual(matches('[[0, 1]]'), []);
  });

  it('NÃO casa a forma antiga por nome de arquivo — era o defeito que a sintaxe cura', () => {
    assert.deepEqual(matches('[[0018-auditlog-transversal-todos-bcs]]'), []);
  });
});
