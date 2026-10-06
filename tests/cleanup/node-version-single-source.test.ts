/**
 * NODE-VERSION-SINGLE-SOURCE — a versão do Node vive no `.nvmrc`, e as demais declarações derivam.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 * Irmão direto de `supply-chain-settings.test.ts`, que faz o mesmo para o pnpm.
 *
 * Norma: [ADR-0073](../../handbook/architecture/adr/0073-nvmrc-single-source-supersedes-0058-partial.md),
 * que supersede parcialmente o [ADR-0058](../../handbook/architecture/adr/0058-runtime-tracks-recommended-lts.md)
 * §2 e §4 — a §1 (acompanhar o LTS recomendado, por subida gradual) e a §3 (troca de tecnologia por
 * inquiry) seguem integralmente vigentes.
 *
 *   `.nvmrc`                     → a FONTE. major.minor.patch exato
 *   `devEngines.runtime.version` → derivada, exata (o pnpm baixa este runtime)
 *   `engines.node`               → derivada, piso por major
 *   `Dockerfile` → `FROM node:`  → derivada, major.minor (é o que a tag oficial publica)
 *   `LABEL image.base.name`      → derivada, igual à tag do FROM
 *   `@types/node`                → derivada, faixa do major
 *   workflows → `node-version-file: .nvmrc` → leem a fonte, não repetem o número
 *
 * ## Por que a granularidade difere, e por que isto NÃO é o afrouxamento que a versão anterior fazia
 *
 * A versão anterior deste gate cobrava só o **major**, argumentando que exigir o patch produziria
 * vermelho a cada release do Node. O argumento valia enquanto cada ponto carregava o número escrito
 * à mão: três cópias, três cadências, vermelho a cada bump.
 *
 * Com `.nvmrc` como fonte, o custo desaparece — subir o runtime é editar um arquivo, e as derivadas
 * que ainda escrevem o número (Dockerfile, devEngines) são conferidas contra ele. O que sobra de
 * frouxo é só o que a natureza do alvo impõe: a tag Docker oficial não publica patch, e
 * `engines.node`/`@types/node` são faixas por desenho.
 *
 * O preço de ter cobrado só o major está medido: o ADR-0058:41 registrou em 05/08/2026 que os três
 * pontos divergiam (`>=24.0.0`, `node:24.15`, `node-version: '24'`) e que a §4 existia para tornar
 * isso visível. O gate passou verde sobre essa divergência por dois meses — ela era de **minor**, e
 * ninguém tinha mandado olhar o minor. Em 06/10/2026 dev e produção rodavam `24.16.0` e `24.15`.
 *
 * ## O que este gate NÃO cobre, e é declarado
 *
 * Se o major é o **LTS recomendado** — isso exige rede, e o gate local é offline e determinístico
 * por desenho (ADR-0058 §4, ainda vigente nesta parte). Um repositório inteiro coerente numa versão
 * EOL passa aqui. A pendência de CI agendado do ADR-0058 segue aberta.
 *
 * O **digest** do `FROM` também não: a tag é reconstruída upstream a cada patch de Debian, e um
 * gate tag↔digest nasceria vermelho no primeiro rebuild. Digest errado falha o build com
 * `manifest unknown` — ruidoso, na hora, sem precisar de teste.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

/**
 * Workflows VERSIONADOS. `git ls-files` e não `readdirSync`: gate estrutural pergunta ao git, que
 * responde a mesma coisa aqui e no runner (rule `testing.md`). O efeito colateral desejado é que
 * workflow novo só entra na varredura quando staged — e aí a cobertura cresce sozinha.
 */
const workflowFiles = (): readonly string[] =>
  execFileSync(
    'git',
    ['-C', PROJECT_ROOT, 'ls-files', '.github/workflows/*.yml', '.github/workflows/*.yaml'],
    { encoding: 'utf-8' },
  )
    .split('\n')
    .filter((l) => l.length > 0);

type PackageManifest = Readonly<{
  engines?: Readonly<{ node?: string }>;
  devEngines?: Readonly<{ runtime?: Readonly<{ name?: string; version?: string }> }>;
  devDependencies?: Readonly<Record<string, string>>;
}>;

const pkg = (): PackageManifest => JSON.parse(readSource('package.json')) as PackageManifest;

/** A fonte: `major.minor.patch` exato, sem `v`, como o fnm e o `setup-node` esperam. */
const NVMRC = readSource('.nvmrc').trim();

const PARSED = /^(\d+)\.(\d+)\.(\d+)$/.exec(NVMRC);
const MAJOR = PARSED?.[1];
const MINOR = PARSED?.[2];

/** `FROM node:24.21-bookworm-slim@sha256:…` → `24.21`, exigindo o digest pin do ADR-0011. */
const FROM_BASE = /^FROM node:(\d+\.\d+)-bookworm-slim@sha256:[0-9a-f]{64} AS base$/m;

describe('NODE-VERSION-SINGLE-SOURCE — a fonte é legível', () => {
  it('.nvmrc declara uma versão exata major.minor.patch', () => {
    assert.ok(
      PARSED !== null,
      `.nvmrc contém ${JSON.stringify(NVMRC)}, que não é uma versão exata. Este arquivo é a fonte ` +
        'que o fnm lê no `cd` e que o `setup-node` resolve por `node-version-file` — uma faixa ' +
        'aqui devolve ao CI a liberdade de escolher sozinho o runtime, que é o defeito que o ' +
        'ADR-0073 fecha.',
    );
  });
});

describe('NODE-VERSION-SINGLE-SOURCE — package.json deriva do .nvmrc', () => {
  it('devEngines.runtime fixa exatamente a versão do .nvmrc', () => {
    const runtime = pkg().devEngines?.runtime;
    assert.equal(
      runtime?.name,
      'node',
      'devEngines.runtime.name deixou de ser `node` — a declaração que faz o pnpm baixar o ' +
        'runtime certo (`onFail: "download"`) perde o efeito em silêncio.',
    );
    assert.equal(
      runtime?.version,
      NVMRC,
      `devEngines.runtime.version é ${String(runtime?.version)} e .nvmrc é ${NVMRC}. O pnpm ` +
        'baixaria um runtime e o fnm outro, na mesma máquina.',
    );
  });

  it('engines.node cobre o major do .nvmrc', () => {
    assert.match(
      pkg().engines?.node ?? '',
      new RegExp(`>=\\s*${String(MAJOR)}\\.`),
      `engines.node não cobre o major ${String(MAJOR)} do .nvmrc — o install passaria num runtime ` +
        'que ninguém testou.',
    );
  });

  it('@types/node acompanha o major do runtime', () => {
    const types = pkg().devDependencies?.['@types/node'];
    assert.ok(types !== undefined, '@types/node saiu de devDependencies');
    assert.match(
      types,
      new RegExp(`^[~^]?${String(MAJOR)}\\.`),
      `@types/node está em ${types} e o runtime é ${NVMRC}. Tipo de uma major e runtime de outra ` +
        'deixa o typecheck aprovar API que não existe em execução — ou reprovar a que existe.',
    );
  });
});

describe('NODE-VERSION-SINGLE-SOURCE — produção constrói do mesmo major.minor', () => {
  it('o FROM da base usa a major.minor do .nvmrc e continua pinado por digest', () => {
    const match = FROM_BASE.exec(readSource('Dockerfile'));
    assert.ok(
      match !== null,
      'não achei `FROM node:<major>.<minor>-bookworm-slim@sha256:<64 hex> AS base` no Dockerfile. ' +
        'O digest pin é exigência do ADR-0011 (supply chain) — perder a forma é perder a ' +
        'reproducibilidade, não só a legibilidade.',
    );
    assert.equal(
      match?.[1],
      `${String(MAJOR)}.${String(MINOR)}`,
      `a imagem base é node:${String(match?.[1])} e o repo desenvolve em ${NVMRC}. A diferença ` +
        'entre dev e produção é exatamente a classe de defeito que só reproduz no ambiente que ' +
        'ninguém usa para desenvolver.',
    );
  });

  it('o LABEL base.name cita a mesma tag do FROM', () => {
    const dockerfile = readSource('Dockerfile');
    const from = FROM_BASE.exec(dockerfile)?.[1];
    const label = /image\.base\.name="docker\.io\/library\/node:(\d+\.\d+)-bookworm-slim"/.exec(
      dockerfile,
    )?.[1];
    assert.equal(
      label,
      from,
      `o LABEL anuncia node:${String(label)} e o FROM constrói de node:${String(from)}. O label é ` +
        'o que Trivy, Scout e Snyk leem para decidir quais CVEs se aplicam — divergente, ele ' +
        'manda o scanner auditar uma imagem que não está no ar.',
    );
  });
});

describe('NODE-VERSION-SINGLE-SOURCE — o CI lê a fonte em vez de repetir o número', () => {
  const workflows = workflowFiles();

  it('há workflow versionado para varrer (guarda contra verde por vacuidade)', () => {
    assert.ok(
      workflows.length > 0,
      'nenhum workflow veio do `git ls-files` — o gate passaria sem verificar nada. Arquivo novo ' +
        'precisa estar staged para este gate o ver.',
    );
  });

  /**
   * Esta guarda é a que pegou a própria migração para `node-version-file`: a versão anterior do
   * gate contava workflows com `node-version:` e, ao somarem zero, ela foi o único teste a falhar.
   * Sem ela, a troca teria deixado o gate verde por não achar o que verificar.
   */
  it('algum workflow usa actions/setup-node (guarda contra verde por vacuidade)', () => {
    const withSetupNode = workflows.filter((f) => readSource(f).includes('actions/setup-node'));
    assert.ok(
      withSetupNode.length > 0,
      'nenhum workflow usa actions/setup-node — ou o CI deixou de instalar Node, ou a action ' +
        'mudou de nome e os casos abaixo passaram a não verificar nada.',
    );
  });

  /**
   * O critério é QUEM RODA Node, não quem já declara `setup-node` — e a diferença não é teórica:
   * `audit.yml` executava `corepack enable` + `pnpm audit` sem declarar runtime algum, caindo no
   * Node pré-instalado da imagem do runner. É precisamente o "o CI escolhe sozinho" que o
   * ADR-0073 §2 encerra, e um gate que varresse só quem tem `setup-node` seria cego justamente
   * para o workflow em falta.
   *
   * O padrão cobre as QUATRO formas em que a invocação aparece, porque varrer só uma delas é
   * aprovar por vacuidade quem usa as outras — e a versão anterior varria uma só, `run:` em linha
   * própria. Media em 06/10: ela não casava nem `- run: pnpm install`, a forma mais comum, nem
   * `run: |` com o comando na linha seguinte; `audit.yml` só foi pego porque, além dos três blocos
   * escalares, tinha um `run: corepack enable` numa linha. Nenhum workflow de hoje depende da
   * diferença (os 9 recebem o mesmo veredito nas duas versões): o buraco era latente, e o próximo
   * workflow escrito com bloco escalar o tornaria vivo com o gate verde.
   *
   * O `\b` imediatamente após o prefixo opcional é o que mantém a precisão: `name: valida o pnpm`,
   * `# pnpm install` e `uses:` não casam, porque neles o comando não abre a linha nem segue um
   * `run:`.
   */
  const RUNS_NODE = /^\s+(-\s+)?(run:\s*\|?.*)?\b(node|pnpm|npx|corepack)\b/m;

  it('todo workflow que roda Node declara o runtime por setup-node', () => {
    const offenders = workflows
      .filter((f) => {
        const body = readSource(f);
        return RUNS_NODE.test(body) && !body.includes('actions/setup-node');
      })
      .sort();
    assert.deepEqual(
      offenders,
      [],
      `workflow(s) executando Node sem declarar a versão: ${offenders.join(', ')}. Sem ` +
        '`setup-node` + `node-version-file: .nvmrc`, o job roda no Node pré-instalado do runner, ' +
        'que muda sem aviso e sem diff.',
    );
  });

  for (const workflow of workflows) {
    const body = readSource(workflow);
    if (!body.includes('actions/setup-node')) continue;

    it(`${workflow} resolve o runtime por node-version-file`, () => {
      const literal = /^\s*node-version:\s*(.+)$/m.exec(body);
      // `assert.ok` e não `assert.equal(literal, null)`: o segundo imprime o RegExpExecArray
      // inteiro, e seu campo `input` é o workflow COMPLETO — 140 linhas de YAML enterrando a
      // mensagem que diz o que fazer. Medido na primeira execução deste caso.
      assert.ok(
        literal === null,
        `${workflow} fixa \`node-version: ${String(literal?.[1]).trim()}\` à mão. Um major solto ` +
          'flutua a cada release upstream e um valor exato vira a quarta cópia do número — as ' +
          'duas formas são o que o ADR-0073 proíbe. Trocar por `node-version-file: .nvmrc`.',
      );
      assert.match(
        body,
        /^\s*node-version-file:\s*\.nvmrc\s*$/m,
        `${workflow} usa actions/setup-node sem declarar \`node-version-file: .nvmrc\` — sem ` +
          'isso o runner cai no Node pré-instalado da imagem, que muda sem aviso.',
      );
    });
  }
});
