/**
 * HTTP-EDGE-BOUNDARY — o Zod não sai da borda, e o shell não conhece domínio.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Duas invariantes que a própria `.claude/rules/http-edge.md` declarava manter "por disciplina",
 * dizendo com todas as letras que não havia lint que as barrasse:
 *
 * 1. **Zod só na borda.** Domínio e application nunca importam `zod`. O schema de borda descreve
 *    o CONTRATO HTTP — shape do envelope, serialização, OpenAPI. Regra de negócio se expressa em
 *    smart constructor e `Result`, que o compilador cobra. Um `z.object` dentro de um use case
 *    acopla a decisão de negócio ao framework de validação da borda, e a regra passa a mudar
 *    quando o contrato HTTP muda — que é exatamente o acoplamento que o ADR-0025/0027 evita.
 *
 * 2. **O shell transversal é agnóstico de domínio.** `src/shared/http/` hospeda `buildApp`, o
 *    error handler, o envelope e o `sendResult`; nenhuma rota, handler ou schema de feature vive
 *    ali (ADR-0028). Um import de `modules/` no shell inverte a direção — o transversal passaria a
 *    depender do específico, e subir a app exigiria carregar todos os módulos.
 *
 * O shell PODE importar `zod` (serializa resposta e gera OpenAPI); o que ele não pode é conhecer
 * módulo. São invariantes independentes, por isso duas asserções e não uma.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, walkFiles, importSpecifiers } from '../support/source-scan.ts';

const isZod = (specifier: string): boolean => specifier === 'zod' || specifier.startsWith('zod/');

/** A borda: HTTP de cada módulo mais o shell transversal. */
const isEdge = (rel: string): boolean =>
  rel.includes('/adapters/http/') || rel.startsWith('src/shared/http/');

describe('HTTP-EDGE — o Zod não vaza para dentro', () => {
  it('nenhum arquivo fora da borda importa zod', () => {
    const offenders = walkFiles(join(PROJECT_ROOT, 'src'), { ext: '.ts' })
      .filter((f) => !isEdge(f))
      .filter((f) => importSpecifiers(f).some(isZod))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Zod fora da borda HTTP — a regra de negócio passa a depender do validador do contrato ' +
        'HTTP (ADR-0025/0027):\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura encontra zod na borda (guarda contra verde por vacuidade)', () => {
    const naBorda = walkFiles(join(PROJECT_ROOT, 'src'), { ext: '.ts' })
      .filter(isEdge)
      .filter((f) => importSpecifiers(f).some(isZod));
    assert.ok(naBorda.length > 0, 'nenhum uso de zod encontrado — o parser parou de casar');
  });
});

describe('HTTP-EDGE — o shell transversal não conhece módulo', () => {
  it('nenhum arquivo de src/shared/http/ importa de modules/', () => {
    const offenders = walkFiles(join(PROJECT_ROOT, 'src', 'shared', 'http'), { ext: '.ts' })
      .filter((f) => importSpecifiers(f).some((s) => s.includes('modules/')))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Shell HTTP importando módulo — o transversal passa a depender do específico e subir a app ' +
        'exige carregar todos os módulos (ADR-0028):\n' +
        offenders.join('\n'),
    );
  });
});
