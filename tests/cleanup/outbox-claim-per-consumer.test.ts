/**
 * OUTBOX-CLAIM-PER-CONSUMER — CA4 da #824. Todo consumidor de outbox reivindica POR CONSUMIDOR,
 * e nenhum apaga a linha de origem.
 *
 * Molde: `tests/cleanup/*.test.ts` (varrem o fonte e exigem um estado desejado).
 *
 * ## A propriedade, e por que não é a que a issue pediu literalmente
 *
 * A #824 pediu um gate que "acuse a competição" quando um `SpecBuilder` novo registrar um segundo
 * consumidor sobre um outbox que já tem outro. Isso descrevia a defesa certa para o desenho
 * ANTIGO — onde dois consumidores sobre a mesma tabela era, de fato, o defeito. Depois desta
 * correção, dois consumidores é o caso SUPORTADO: contar consumidores acusaria justamente o que
 * passou a ser correto.
 *
 * A propriedade que sobrevive à correção é outra, e é a que fecha a porta de volta: **nenhum
 * consumidor de outbox pode decidir pendência por estado global da linha, nem apagar a origem.**
 * Um gate que afirma propriedade não envelhece com a contagem de hoje.
 *
 * ## Por que ler o fonte, e não testar comportamento
 *
 * O comportamento já é testado (`tests/shared/outbox/fanout-two-consumers.test.ts`). O que
 * nenhum teste de comportamento pega é o adapter NOVO — o sexto outbox, escrito daqui a um ano
 * por quem copiou o padrão errado de algum lugar. Cinco adapters já concordaram entre si estando
 * errados; foi a ausência de um gate estrutural que deixou isso durar.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { PROJECT_ROOT, walkFiles, readSource, isCommentLine } from '../support/source-scan.ts';
import { join } from 'node:path';

/** Linhas de CÓDIGO de um arquivo — comentário não conta como uso (nem como violação). */
const codeLines = (rel: string): readonly string[] =>
  readSource(rel)
    .split('\n')
    .filter((l) => !isCommentLine(l));

/**
 * Consumidores de outbox, identificados por USO e não por caminho: quem declara
 * `withPendingBatch` consome. `budget-plans` e `programs` têm outbox mas são só produtores
 * (`append`), e um gate que os incluísse por morarem em `adapters/outbox/` cobraria deles uma
 * propriedade que não lhes diz respeito.
 */
const outboxConsumers = (): readonly string[] =>
  walkFiles(join(PROJECT_ROOT, 'src/modules'), { ext: '.ts' }).filter((rel) =>
    codeLines(rel).some((l) => l.includes('withPendingBatch')),
  );

describe('OUTBOX-CLAIM — pendência é por consumidor, e a origem nunca é apagada', () => {
  it('a varredura encontra os consumidores (guarda contra verde por vacuidade)', () => {
    // Cinco hoje: ctr_outbox, par_outbox, par_email_outbox, auth_outbox, fin_outbox. O piso é 5
    // porque abaixo disso a varredura deixou de enxergar algo — não é a contagem que se afirma.
    const found = outboxConsumers();
    assert.ok(
      found.length >= 5,
      `esperado 5+ consumidores de outbox, encontrado ${found.length}: ${found.join(', ')}`,
    );
  });

  it('todo consumidor decide pendência contra o progresso do consumidor', () => {
    const offenders = outboxConsumers().filter((rel) => {
      const code = codeLines(rel).join('\n');
      // Drizzle consulta `eventos_processados`; in-memory usa o espelho compartilhado. Um
      // consumidor que não referencia nenhum dos dois só pode estar decidindo pela linha.
      return !code.includes('eventosProcessados') && !code.includes('createInMemoryProgressStore');
    });
    assert.deepEqual(
      offenders,
      [],
      'Consumidor de outbox que não consulta o progresso por consumidor — ele decide pendência ' +
        'pelo estado GLOBAL da linha, e sob dois consumidores isso vira fila em vez de fanout, ' +
        `perdendo evento em silêncio (#800, #824): ${offenders.join(', ')}`,
    );
  });

  it('nenhum consumidor apaga a linha de origem do outbox', () => {
    const offenders: string[] = [];
    for (const rel of outboxConsumers()) {
      for (const [i, line] of codeLines(rel).entries()) {
        // `.delete(` sobre a tabela de outbox (Drizzle) ou `splice` no array (in-memory).
        const deletesOutbox = /\.delete\(\s*\w*[Ss]chema\w*\.\w*[Oo]utbox\b/.test(line);
        const splicesRows = /\brows\.splice\(/.test(line);
        if (deletesOutbox || splicesRows) offenders.push(`${rel}:${i + 1}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'Consumidor de outbox que APAGA a linha de origem. Sob fanout, a desistência de um ' +
        'consumidor roubaria o evento dos demais; e o ADR-0022:27-29 decide que "o outbox RETÉM ' +
        'as entradas após a entrega… NÃO deleta", garantia de que depende a reconstrução de ' +
        `0022:40: ${offenders.join(', ')}`,
    );
  });

  it('os consumerId declarados são únicos entre si', () => {
    // A separação entre consumidores É o `consumer_id`. Dois consumidores do mesmo outbox com o
    // mesmo id voltam a dividir a fila — o defeito de #800/#824 de volta, e em silêncio, porque
    // nada no schema impede: a PK `(consumer_id, event_id)` fica satisfeita com um id repetido.
    //
    // Cobre os ids LITERAIS das deliveries de projeção. Os dois loggers recebem o seu por env
    // (`OUTBOX_CONSUMER_ID`, `compose.yaml:387` = `worker-outbox`) e escapam desta varredura —
    // registrado como pendência no ADR-0064, porque uma guarda de runtime no worker-runner é o
    // lugar certo para isso e é trabalho à parte.
    const declared = walkFiles(join(PROJECT_ROOT, 'src/workers'), { ext: '.ts' }).flatMap((rel) =>
      codeLines(rel)
        .flatMap((l) => [...l.matchAll(/consumerId:\s*'([^']+)'/g)])
        .map((m) => m[1] ?? ''),
    );
    const duplicates = declared.filter((id, i) => declared.indexOf(id) !== i);
    assert.deepEqual(
      [...new Set(duplicates)],
      [],
      `consumerId repetido entre consumidores: ${duplicates.join(', ')} — dois consumidores com ` +
        'o mesmo id dividem a fila em vez de cada um receber todos os eventos',
    );
    assert.ok(declared.length >= 3, `esperado 3+ consumerId declarados, achei ${declared.length}`);
  });

  it('todo consumerId registrado num worker está na lista que o sweeper usa', () => {
    // ⚠️ A assimetria que este caso protege: o sweeper marca `processed_at` quando TODOS os
    // consumidores de `registered-consumers.ts` resolveram um evento, e essa marca REMOVE a
    // linha do claim de todo mundo. Consumidor a MAIS na lista só deixa o claim lento;
    // consumidor a MENOS faz a marca sair antes de ele processar — e ele perde o evento em
    // silêncio, que é exatamente o defeito de #800/#824 voltando por outra porta.
    //
    // Cobre os ids LITERAIS de `src/workers/`. Os dois loggers recebem o seu por env, e a
    // resolução deles está espelhada em `registered-consumers.ts` — pendência 3 do ADR-0064.
    const registered = readSource('src/shared/outbox/registered-consumers.ts');
    const declared = walkFiles(join(PROJECT_ROOT, 'src/workers'), { ext: '.ts' }).flatMap((rel) =>
      codeLines(rel)
        .flatMap((l) => [...l.matchAll(/consumerId:\s*'([^']+)'/g)])
        .map((m) => m[1] ?? ''),
    );

    const missing = [...new Set(declared)].filter((id) => !registered.includes(`'${id}'`)).sort();
    assert.deepEqual(
      missing,
      [],
      'consumerId registrado num worker mas AUSENTE de registered-consumers.ts — o sweeper ' +
        'marcaria o evento como resolvido antes de este consumidor processá-lo, e ele o perderia ' +
        `em silêncio: ${missing.join(', ')}`,
    );
  });

  it('o claim roda em READ COMMITTED, não no default do servidor', () => {
    // Sob REPEATABLE READ o `FOR UPDATE` do claim trava GAPS no índice `(processed_at,
    // occurred_at)`; evento novo nasce com `processed_at = NULL`, cai no gap, e o INSERT do
    // PRODUTOR estoura `1205 Lock wait timeout` — medido em MySQL 8.4.11. O consumidor passa a
    // brigar com a transação de negócio, que é o lado que não pode falhar.
    const offenders = outboxConsumers().filter((rel) => {
      const code = codeLines(rel).join('\n');
      // Só cobra de quem abre transação para reivindicar — o in-memory não tem isolamento.
      return code.includes('db.transaction(') && !code.includes('CLAIM_ISOLATION');
    });
    assert.deepEqual(
      offenders,
      [],
      'Consumidor de outbox que abre a transação de claim sem `CLAIM_ISOLATION` (READ ' +
        `COMMITTED) — sob REPEATABLE READ o gap lock bloqueia o INSERT do produtor: ${offenders.join(', ')}`,
    );
  });
});
