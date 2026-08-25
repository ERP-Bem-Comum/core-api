/**
 * CANONICAL-UNITS-ON-EDGE — a borda do core devolve unidade canônica, não apresentação.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma ([ADR-0049](../../handbook/architecture/adr/0049-core-api-bff-boundary.md) §"Domain API"):
 * o core expõe recursos por agregado em UNIDADES CANÔNICAS — dinheiro em `bigint` cents, IDs em
 * `varchar(36)`, datas em ISO-8601, enums como união EN. SEM formatação de apresentação: nada de
 * `R$ 1.234,56`, label PT ou `%` calculado para o widget. Renderizar artefato é trabalho do BFF.
 *
 * ## Por que este gate existe, e por que ele é a resposta a uma alegação e não a um capricho
 *
 * A alegação `ADR-0049-C9` (promovida em 2026-08-05) registra que o ADR nomeia `budget-plans` como
 * alvo de conformidade RIGOROSA à régua — e é exatamente onde a régua foi violada, sem nenhum teste
 * provando conformidade. "Rollout rigoroso" escrito em ADR não segurou nada.
 *
 * A resposta não é mecanizar a DESIGNAÇÃO (que vive em prosa e muda a cada épico), é mecanizar a
 * RÉGUA. Um módulo designado como alvo passa a ter, de fato, verificação — e o próximo módulo herda
 * a mesma barra sem ninguém precisar lembrar de nomeá-lo.
 *
 * ## A allowlist tem UMA entrada e é exceção declarada, não tolerância
 *
 * `budget-plan-csv.ts` formata `R$` de propósito: paridade BYTE-A-BYTE com o `getOneForCsv` do
 * ERP-BACKEND, que usa o mesmo `toLocaleString('pt-BR')` e produz espaço U+00A0 (não 0x20). Quem
 * consome compara com o arquivo do legado; um espaço diferente quebra a comparação. A razão está
 * escrita no ponto do código, e o pin por `deepEqual` impede a lista de crescer em silêncio.
 *
 * ⚠️ Varre USO, nunca menção: `schemas.ts:314` tem `// R$ 100 mi (valor unitário)` num comentário de
 * teto de valor, e um gate que casasse o literal `R$` acusaria justamente quem documenta bem.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import { PROJECT_ROOT, filesUsing } from '../support/source-scan.ts';

/** Mecanismos de formatação de apresentação. Exigem a forma de USO, não o nome solto. */
const PRESENTATION = /toLocaleString\(|Intl\.NumberFormat|Intl\.DateTimeFormat/;

/**
 * 🔒 Allowlist PINADA — formatação na borda com razão declarada no código.
 * Cada entrada exige a razão escrita no ponto de uso; o pin impede crescimento silencioso.
 */
const DECLARED_EXCEPTIONS: readonly string[] = [
  // Paridade byte-a-byte com o CSV do legado (#319). Ver a nota no topo de `formatCentsBRL`.
  'src/modules/budget-plans/adapters/http/budget-plan-csv.ts',
];

const httpDirs = (): readonly string[] =>
  readdirSync(join(PROJECT_ROOT, 'src', 'modules'))
    .map((m) => join(PROJECT_ROOT, 'src', 'modules', m, 'adapters', 'http'))
    .filter((d) => existsSync(d));

const formattingFiles = (): readonly string[] =>
  httpDirs()
    .flatMap((d) => filesUsing(d, PRESENTATION, { ext: '.ts' }))
    .map((f) => (f.startsWith(PROJECT_ROOT) ? relative(PROJECT_ROOT, f) : f))
    .sort();

describe('CANONICAL-UNITS-ON-EDGE — o core devolve dado, o BFF devolve apresentação', () => {
  it('nenhuma rota formata apresentação fora da allowlist', () => {
    const offenders = formattingFiles().filter((f) => !DECLARED_EXCEPTIONS.includes(f));
    assert.deepEqual(
      offenders,
      [],
      'Formatação de apresentação na borda do core. Dinheiro sai em cents (`bigint`), data em ' +
        'ISO-8601, enum como união EN — renderizar é trabalho do BFF (ADR-0049). Se a paridade com ' +
        'o legado exigir formatação, a exceção MUST ser decidida por escrito no ponto do código e ' +
        'entrar na allowlist deste gate:\n' +
        offenders.join('\n'),
    );
  });

  it('a allowlist está pinada', () => {
    assert.deepEqual(
      [...DECLARED_EXCEPTIONS].sort(),
      ['src/modules/budget-plans/adapters/http/budget-plan-csv.ts'],
      'A allowlist mudou. Cada entrada é exceção a um ADR aceito e exige razão escrita no código — ' +
        'crescer aqui é decisão, não manutenção.',
    );
  });

  it('a exceção declarada ainda existe (allowlist não vira entrada morta)', () => {
    const alive = formattingFiles();
    const dead = DECLARED_EXCEPTIONS.filter((f) => !alive.includes(f));
    assert.deepEqual(
      dead,
      [],
      'Entrada de allowlist que não corresponde a nenhuma formatação real. Se a exceção foi ' +
        'removida do código, remova-a daqui — allowlist morta cega o gate para o mesmo arquivo:\n' +
        dead.join('\n'),
    );
  });

  it('a varredura enxerga a borda (guarda contra verde por vacuidade)', () => {
    assert.ok(
      httpDirs().length > 3,
      `esperado 4+ módulos com adapters/http, achei ${httpDirs().length}`,
    );
  });
});
