/**
 * HOOKS-STDIN — todo hook que lê o payload do stdin o drena ANTES de qualquer saída antecipada.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Por que existe: quem invoca um hook escreve o payload JSON no stdin dele. Se o script sai antes
 * de consumir esse stdin, o lado que escreve recebe **EPIPE** — e o sintoma é intermitente, porque
 * o buffer do pipe (64 KB no Linux e no macOS) absorve a escrita quando o payload é pequeno e o
 * processo sai rápido.
 *
 * Medido em 06/10/2026, com o `cat` depois do `exit` em `post-compact-rules-reminder.sh`:
 *
 * | payload | resultado |
 * | --- | --- |
 * | ~60 B, ~1 KB | 5 de 5 OK — cabe no buffer |
 * | ~70 KB, ~500 KB | 5 de 5 **EPIPE** — não cabe |
 *
 * Foi assim que o defeito se disfarçou de flake: `post-compact-rules-reminder.test.ts` usa payload
 * de ~60 bytes, passava em toda máquina de desenvolvimento, e caiu no CI — onde o runner deixou o
 * script sair antes de a escrita pequena completar. O vermelho parecia infraestrutura e era corrida.
 *
 * ⚠️ **O payload grande é o que torna este gate honesto.** Com payload pequeno ele passaria mesmo
 * sobre os hooks defeituosos, que é precisamente o que o teste existente fazia — medir a ausência
 * do defeito num tamanho em que ele não aparece. A régua não se propagou sozinha: quando esta
 * varredura foi escrita, **3 dos 4** hooks que leem stdin saíam antes de drenar.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PROJECT_ROOT } from '../support/source-scan.ts';

/**
 * Acima do buffer do pipe, de propósito: 64 KB é o tamanho em Linux e macOS, e o defeito só é
 * determinístico quando a escrita não cabe nele de uma vez.
 */
const PAYLOAD_BYTES = 128 * 1024;

/**
 * Hooks versionados que leem o stdin — perguntando ao git, não ao disco (rule `testing.md`):
 * arquivo não versionado existe só na máquina de quem escreve, e gate cuja resposta depende de
 * onde roda não verifica nada.
 */
const hooksThatReadStdin = (): readonly string[] =>
  execFileSync('git', ['ls-files', '.claude/hooks', '.githooks'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((p) => p !== '')
    .filter((p) => {
      const src = readFileSync(join(PROJECT_ROOT, p), 'utf8');
      // Linhas de CÓDIGO: um comentário que MENCIONA `$(cat)` — como as notas desta correção —
      // não lê stdin algum, e acusá-lo reprovaria justamente o arquivo que explica a norma.
      return src
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('#'))
        .some((line) => /=\$\(\s*cat\b/.test(line));
    })
    .sort();

describe('HOOKS-STDIN — nenhum hook deixa quem escreve o payload pendurado', () => {
  const hooks = hooksThatReadStdin();

  it('a varredura encontra hooks (guarda contra verde por vacuidade)', () => {
    assert.ok(
      hooks.length > 0,
      '`git ls-files` não devolveu hook algum que leia stdin — sem isso os casos abaixo não ' +
        'exercitam nada e passam em silêncio.',
    );
  });

  /**
   * DOIS cenários, porque a saída antecipada não é a mesma em todo hook — e um cenário só aprova
   * por vacuidade os hooks cuja saída ele não dispara. Medido em 06/10/2026 com os hooks ainda
   * defeituosos:
   *
   * | cenário | `cd` | post-compact | logbook · log-instructions |
   * | --- | --- | --- | --- |
   * | diretório vazio | funciona | **EPIPE** (falta o log → `exit`) | ok (não sai cedo) |
   * | diretório inexistente | **falha** | **EPIPE** | **EPIPE** (`cd \|\| exit 0`) |
   *
   * A primeira versão deste gate usava só o diretório vazio e passava 4 de 4 **com o `logbook.sh`
   * revertido ao padrão defeituoso** — media a fronteira errada para dois dos três hooks. O
   * segundo cenário é o que o torna honesto.
   */
  const SCENARIOS: readonly Readonly<{ name: string; dir: () => string }>[] = [
    {
      name: 'projeto vazio (o hook sai por falta do arquivo que lê)',
      dir: () => mkdtempSync(join(tmpdir(), 'hook-stdin-')),
    },
    {
      name: 'projeto inexistente (o hook sai porque o `cd` falha)',
      dir: () => join(tmpdir(), `hook-stdin-ausente-${String(process.hrtime.bigint())}`),
    },
  ];

  for (const hook of hooks) {
    for (const scenario of SCENARIOS) {
      it(`${hook} drena o stdin — ${scenario.name}`, () => {
        const payload = JSON.stringify({
          session_id: 'S1',
          hook_event_name: 'PostCompact',
          pad: 'x'.repeat(PAYLOAD_BYTES),
        });

        assert.doesNotThrow(
          () =>
            execFileSync('bash', [join(PROJECT_ROOT, hook)], {
              input: payload,
              encoding: 'utf8',
              // `CLAUDE_PROJECT_DIR` fora do repositório é o que força a saída antecipada — e
              // também o que impede o teste de escrever no repositório de quem o roda.
              env: { ...process.env, CLAUDE_PROJECT_DIR: scenario.dir() },
              // O hook reclama do `cd` no stderr neste cenário, e isso é esperado: o que se mede
              // aqui é o EPIPE do ESCRITOR, não o que o script diz.
              stdio: ['pipe', 'pipe', 'ignore'],
            }),
          `EPIPE ao escrever ${String(Math.round(payload.length / 1024))} KB no stdin de ${hook}: ` +
            'ele sai antes de consumir o payload. Mover a leitura (`payload=$(cat ...)`) para ' +
            'ANTES do primeiro `exit` — inclusive antes do `cd`, que também pode falhar e sair.',
        );
      });
    }
  }
});
