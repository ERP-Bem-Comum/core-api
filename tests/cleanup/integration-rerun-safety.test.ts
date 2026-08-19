/**
 * INTEGRATION-RERUN-SAFETY — teste de integração que deriva chave de CONTADOR DE PROCESSO
 * tem de limpar na entrada.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * ## O defeito que este gate captura, medido duas vezes
 *
 * Um contador de módulo (`let naturalKeySeq = 0`) reinicia a cada PROCESSO. Se ele compõe uma chave
 * que vai para coluna com UNIQUE, a 1ª execução contra banco virgem passa e a 2ª colide — com o
 * agravante de que a suíte roda `--test-concurrency=1` no MESMO banco, sem recriação entre arquivos.
 *
 * O que torna a classe cara é o **silêncio**: num `save` que é upsert (`ON DUPLICATE KEY UPDATE`),
 * a colisão não levanta erro. O statement vira UPDATE da linha antiga, o id novo nunca é inserido, e
 * o sintoma aparece muitas asserções adiante como `findById` devolvendo `null`. Quem depura vai
 * primeiro ao adapter, que está certo.
 *
 * Dois casos vivos quando este gate nasceu, ambos com issue aberta — não é gate especulativo:
 *   - #741 — `remittance-repository`: `file_name` determinístico + `fin_remittances_file_name_uq`
 *   - #747 — `cedente-account-store`: chave natural determinística + `fin_cedente_accounts_natural_key_uq`
 *
 * ## Por que a propriedade é ESTREITA de propósito
 *
 * A propriedade ampla — "todo teste de integração que escreve limpa na entrada" — tem 19 violadores
 * entre 51, e a maioria deles está CERTA: quem deriva toda chave de UUID gerado por execução é
 * re-executável sem limpar nada. Um gate assim reprovaria arquivo saudável e treinaria o time a
 * ampliar a allowlist sem pensar, que é como gate vira ruído.
 *
 * O contador de processo é o proxy PRECISO do defeito: 4 arquivos casam, e os 2 que não limpam são
 * exatamente os dois defeitos conhecidos. É a assimetria que se quer — só fica vermelho no caso
 * errado.
 *
 * ⚠️ LIMITE DECLARADO: o gate cobra que o arquivo LIMPE, não *onde*. Um `delete` que estivesse só
 * num `after` passaria aqui e continuaria frágil (a rule manda limpar na ENTRADA, porque quem só
 * limpa na saída fica à mercê da ordem). Verificar o aninhamento exigiria AST; a checagem de
 * presença já captura os dois defeitos vivos, e o resto é julgamento que vive em
 * `.claude/rules/testing.md`.
 *
 * ⚠️ Varre USO, nunca menção: `filesUsing` ignora linha de comentário. Sem isso, este próprio
 * arquivo e a rule que ele mecaniza — que citam `let naturalKeySeq = 0` para ENSINAR o padrão —
 * seriam acusados. É a armadilha nº 6 catalogada em `tests/support/source-scan.ts`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, walkFiles, readSource, isCommentLine } from '../support/source-scan.ts';

/** Gate de integração: o arquivo só roda sob a variável de ambiente. */
const INTEGRATION_GATE = /process\.env\[['"]MYSQL_INTEGRATION['"]\]/;

/**
 * Contador de PROCESSO usado para compor chave. Exige a forma de uso (`let <nome> = 0`), não o nome
 * solto — e os sufixos são os que o repositório de fato usa.
 */
const PROCESS_COUNTER = /^\s*let\s+\w*(Seq|Sequence|Counter|Idx|Nth)\s*=\s*0\b/;

/** Limpeza: alguma chamada de `delete(` E algum hook de entrada onde ela caiba. */
const DELETE_CALL = /\.delete\(|\bdelete\(/;
const ENTRY_HOOK = /\bbefore(Each)?\(/;

/**
 * 🔒 Allowlist PINADA — dívida conhecida, com issue aberta e evidência medida.
 *
 * Cada entrada sai daqui quando a issue fechar. O pin por `deepEqual` impede a lista de crescer em
 * silêncio: arquivo novo com o mesmo defeito reprova, e quem o adicionar aqui precisa justificar.
 */
const KNOWN_DEBT: readonly string[] = [
  // #747 — chave natural de contador + fin_cedente_accounts_natural_key_uq, sem limpeza na entrada.
  'tests/modules/financial/adapters/persistence/cedente-account-store.drizzle-mysql.test.ts',
  // #741 — file_name determinístico + fin_remittances_file_name_uq, sem limpeza na entrada.
  'tests/modules/financial/adapters/persistence/remittance-repository.drizzle-mysql.test.ts',
];

/** Linhas de código do arquivo — comentário fora. */
const codeLines = (rel: string): readonly string[] =>
  readSource(rel)
    .split('\n')
    .filter((l) => !isCommentLine(l));

const usesInCode = (rel: string, pattern: RegExp): boolean =>
  codeLines(rel).some((l) => pattern.test(l));

/** Testes de integração: gated por MYSQL_INTEGRATION. `cleanup/` são gates, não integração. */
const integrationTests = (): readonly string[] =>
  walkFiles(join(PROJECT_ROOT, 'tests'), { ext: '.test.ts', excludeTopLevel: ['cleanup'] }).filter(
    (f) => usesInCode(f, INTEGRATION_GATE),
  );

const withProcessCounter = (): readonly string[] =>
  integrationTests().filter((f) => usesInCode(f, PROCESS_COUNTER));

const cleansOnEntry = (rel: string): boolean =>
  usesInCode(rel, DELETE_CALL) && usesInCode(rel, ENTRY_HOOK);

describe('INTEGRATION-RERUN-SAFETY — a 2ª execução tem de valer o mesmo que a 1ª', () => {
  it('a varredura enxerga testes de integração (guarda contra verde por vacuidade)', () => {
    // Sem esta guarda, um refactor que mude o gate de ambiente deixaria tudo verde sem ler nada.
    assert.ok(
      integrationTests().length > 0,
      'nenhum teste gated por MYSQL_INTEGRATION encontrado — a varredura quebrou',
    );
  });

  it('o padrão de contador ainda casa alguma coisa (guarda contra regex morta)', () => {
    assert.ok(
      withProcessCounter().length > 0,
      'nenhum arquivo casa o padrão de contador de processo — a regex deixou de descrever o repositório',
    );
  });

  it('teste de integração com contador de processo limpa na entrada', () => {
    const offenders = withProcessCounter()
      .filter((f) => !cleansOnEntry(f))
      .filter((f) => !KNOWN_DEBT.includes(f));

    assert.deepEqual(
      offenders,
      [],
      'Contador de processo compondo chave, sem limpeza na entrada. O contador reinicia a cada ' +
        'execução; a suíte roda no MESMO banco, sem recriação entre arquivos. A 2ª execução colide ' +
        'na UNIQUE — e num `save` que é upsert a colisão é SILENCIOSA (vira UPDATE da linha antiga, ' +
        'e o sintoma some para várias asserções adiante).\n' +
        'Saídas: limpar na ENTRADA pelo espaço de chave que o arquivo escreve (molde: ' +
        '`cedente-account-store.contract.ts`), ou derivar a chave de algo único por execução.\n' +
        'Arquivos:\n  ' +
        offenders.join('\n  '),
    );
  });

  it('cada entrada da allowlist ainda existe e ainda viola (allowlist não vira entrada morta)', () => {
    const scanned = new Set(withProcessCounter());
    const stale = KNOWN_DEBT.filter((f) => !scanned.has(f) || cleansOnEntry(f));

    assert.deepEqual(
      stale,
      [],
      'Entrada da allowlist que não descreve mais o repositório — o arquivo foi corrigido, ' +
        'renomeado ou removido. Tire a linha daqui (e feche a issue, se for o caso): allowlist que ' +
        'sobrevive ao defeito passa a esconder o próximo.\n  ' +
        stale.join('\n  '),
    );
  });
});
