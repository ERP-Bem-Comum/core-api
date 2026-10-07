/**
 * WORKLOADS-MANIFEST — o manifesto de deploy descreve o repositório que existe.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * `src/deploy/workloads.ts` declara o que este repositório sabe executar e o que exige do
 * ambiente. Um manifesto que ninguém verifica vira a terceira verdade — este arquivo é o que o
 * amarra ao código.
 *
 * ⚠️ **A detecção de leitura de env NÃO extrai o nome da variável, e isso é deliberado.** Sete
 * módulos leem por constante (`env[field]` dentro de `for…of REQUIRED_FIELDS`), invisíveis a
 * qualquer busca pelo nome: uma varredura literal encontra 75 nomes onde existem 106, subcontando
 * em ~32%. Um gate construído sobre essa extração daria verde por cegueira. A saída é inverter a
 * propriedade cobrada: detectar que um arquivo **lê** env é trivial e confiável; onde ele lê é o
 * que se cobra. Daí `ENV_READ` casar a forma de acesso, nunca o nome.
 *
 * ⚠️ **`\b` não é confiável em `git grep -E`** (POSIX ERE não garante word-boundary): a mesma
 * varredura devolveu 29 arquivos no shell e 46 aqui, e os 46 é que estão certos. Por isso a
 * detecção vive em JavaScript, sobre o `source-scan`, e não num comando externo.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import { PROJECT_ROOT, readSource, isCommentLine } from '../support/source-scan.ts';
import { WORKLOADS } from '#src/deploy/workloads.ts';

/** O próprio manifesto — sai da varredura de fonte, sob pena de o gate se auto-satisfazer. */
const MANIFEST_PATH = 'src/deploy/workloads.ts';

/** Acesso a variável de ambiente, pela FORMA — `process.env…` ou indexação de um `env`. */
const ENV_READ = /process\.env\b|\benv\[/;

/** Nome que gera um grupo de log válido (`/ecs/erp-bem-comum-<name>-<env>`). */
const WORKLOAD_NAME = /^[a-z][a-z0-9-]*$/;

/** Expressão do EventBridge Scheduler: `cron(...)` com seis campos. */
const SCHEDULER_CRON = /^cron\((?:[^\s)]+\s+){5}[^\s)]+\)$/;

/**
 * Arquivos que leem env sem serem módulo de configuração, entrypoint ou composition root.
 *
 * @remarks
 * Cada entrada é uma exceção consciente, não um resíduo. A lista existe para que um arquivo NOVO
 * que passe a ler env no meio de lógica de negócio seja acusado — o valor do gate está em ela não
 * crescer. Encolher é sempre bem-vindo; crescer exige justificar aqui.
 */
const ENV_READERS_OUTSIDE_CONFIG: readonly string[] = [
  // Decorators e políticas de borda que se autoconfiguram a partir do ambiente.
  'src/modules/notifications/adapters/email/rate-limit.ts',
  'src/modules/financial/adapters/http/van-sandbox-auth.ts',
  'src/modules/financial/adapters/http/plugin.ts',
  'src/modules/auth/adapters/http/rbac-mode.ts',
  // Semeadura de e2e, guardada por dupla flag; nunca ativa em produção.
  'src/modules/auth/adapters/http/e2e-seed.ts',
  'src/modules/budget-plans/adapters/http/e2e-seed.ts',
  // Infraestrutura compartilhada que traduz ambiente em decisão de wiring.
  'src/shared/runtime/node-env.ts',
  'src/shared/http/app.ts',
  'src/shared/http/email-link-base-urls.ts',
  'src/shared/outbox/registered-consumers.ts',
  // Tabela de specs do runner: recebe `env` e a repassa a cada SpecBuilder.
  'src/workers/runner/specs.ts',
];

/**
 * Entrypoints que existem para uso local e depuração, e que NÃO são unidades de deploy.
 *
 * @remarks
 * São os seis standalone que a consolidação da #407 substituiu pelo runner: cada um tem
 * equivalente 1-para-1 em `GROUPS` (`src/workers/runner/specs.ts`), e nenhum roda em produção — a
 * rule `jobs-and-workers.md` registra a assimetria. Estão aqui, e não no manifesto, porque
 * declarar unidade de deploy que ninguém deploya é mentir sobre a topologia.
 *
 * **Esta lista deve encolher até esvaziar.** Enquanto tiver entrada, há duas formas de wiring para
 * a mesma lógica — e só a que ninguém exercita localmente é a que roda.
 */
const LOCAL_ONLY_ENTRYPOINTS: readonly string[] = [
  'src/modules/contracts/worker/run.ts',
  'src/modules/partners/worker/run.ts',
  'src/workers/email-dispatch/run.ts',
  'src/workers/payable-view-projection/run.ts',
  'src/workers/supplier-view-projection/run.ts',
  'src/workers/contract-count-projection/run.ts',
];

/**
 * Se o caminho é um lugar legítimo para ler ambiente: módulo de configuração, composition root ou
 * entrypoint.
 *
 * @remarks
 * A palavra `config` é procurada em QUALQUER posição do nome, não como sufixo. O sufixo parece
 * mais rigoroso e acusa o arquivo errado: `s3-config-aws.ts` é módulo de configuração pelo nome e
 * pelo conteúdo, e um padrão preso a `-config.ts` o reprovaria — empurrando para a allowlist um
 * arquivo que está exatamente onde deveria. O que o gate cobra é a intenção declarada no nome.
 */
const isConfigLike = (rel: string): boolean =>
  /(^|\/)[^/]*config[^/]*\.ts$|(^|\/)[^/]*composition[^/]*\.ts$|(^|\/)(run|server)\.ts$/.test(rel);

/** Caminhos versionados, perguntados ao git — nunca ao disco. */
const trackedFiles = (): ReadonlySet<string> =>
  new Set(
    execFileSync('git', ['ls-files', 'src'], { cwd: PROJECT_ROOT, encoding: 'utf-8' })
      .split('\n')
      .filter((l) => l !== ''),
  );

/**
 * Os `.ts` de `src/` que o git conhece.
 *
 * @remarks
 * Perguntar ao git, e não ao disco, é exigência da `.claude/rules/testing.md` — "gate cuja
 * resposta depende de onde roda não verifica nada". Um `.ts` não versionado (rascunho local,
 * experimento) existe na máquina de quem escreve e não existe no runner: varrido pelo disco,
 * ele deixa o gate vermelho aqui e verde no CI. As duas varreduras que usam este helper
 * chamavam `walkFiles`, ao lado de um `trackedFiles` que já perguntava certo.
 */
const trackedTs = (): readonly string[] => [...trackedFiles()].filter((f) => f.endsWith('.ts'));

/** Arquivos de `src/` que leem ambiente, pela forma de acesso. */
const envReaders = (): readonly string[] =>
  trackedTs().filter((f) =>
    readSource(f)
      .split('\n')
      .some((line) => !isCommentLine(line) && ENV_READ.test(line)),
  );

/**
 * O entrypoint que uma unidade executa — o primeiro `.ts` do `command`.
 *
 * @remarks
 * Derivado, e não fixado em `command[1]`, porque `command` é `readonly string[]` e só o
 * elemento 0 é contratado (`node`). Declarar `['node', '--max-old-space-size=512', 'x/run.ts']`
 * com a posição fixa fazia o gate acusar a **flag** como entrypoint não versionado, e a
 * varredura de órfãos reportar o arquivo real como "entrypoint que ninguém declara" — duas
 * mensagens apontando para longe da causa.
 */
const entrypointOf = (w: (typeof WORKLOADS)[number]): string | undefined =>
  w.command.find((a) => a.endsWith('.ts'));

/** Toda variável citada por uma unidade, em qualquer das três listas ou nas constraints. */
const allEnvsOf = (w: (typeof WORKLOADS)[number]): readonly string[] => [
  ...w.env,
  ...w.envWithDefault,
  ...w.envProductionOnly,
  ...w.constraints.flatMap((c) => c.envs),
];

describe('WORKLOADS-MANIFEST — forma do manifesto', () => {
  it('nomes são únicos e geram grupo de log válido', () => {
    const invalid = WORKLOADS.filter((w) => !WORKLOAD_NAME.test(w.name)).map((w) => w.name);
    assert.deepEqual(
      invalid,
      [],
      `nome fora de /ecs/erp-bem-comum-<name>-<env>:\n${invalid.join('\n')}`,
    );

    const names = WORKLOADS.map((w) => w.name);
    assert.equal(new Set(names).size, names.length, 'há nome de unidade repetido');
  });

  it('todo command roda node e nomeia exatamente um entrypoint .ts', () => {
    const bad = WORKLOADS.filter(
      (w) => w.command[0] !== 'node' || w.command.filter((a) => a.endsWith('.ts')).length !== 1,
    ).map((w) => `${w.name}: ${w.command.join(' ')}`);
    assert.deepEqual(
      bad,
      [],
      `Todo command é "node [flags] <um .ts>". Sem isso, o entrypoint não é derivável e as ` +
        `duas asserções abaixo passam a medir a flag:\n${bad.join('\n')}`,
    );
  });

  it('todo command aponta para arquivo versionado', () => {
    const tracked = trackedFiles();
    const missing = WORKLOADS.map((w) => ({ w, e: entrypointOf(w) }))
      .filter(({ e }) => e === undefined || !tracked.has(e))
      .map(({ w, e }) => `${w.name}: ${e ?? '(nenhum .ts no command)'}`);
    assert.deepEqual(
      missing,
      [],
      `Unidade apontando para entrypoint que o git não conhece:\n${missing.join('\n')}`,
    );
  });

  it('nenhuma variável aparece em duas listas da mesma unidade', () => {
    const clashes: string[] = [];
    for (const w of WORKLOADS) {
      const seen = new Map<string, string>();
      const add = (envs: readonly string[], list: string): void => {
        for (const e of envs) {
          const prev = seen.get(e);
          if (prev !== undefined) clashes.push(`${w.name}: ${e} em ${prev} e ${list}`);
          else seen.set(e, list);
        }
      };
      add(w.env, 'env');
      add(w.envWithDefault, 'envWithDefault');
      add(w.envProductionOnly, 'envProductionOnly');
    }
    assert.deepEqual(
      clashes,
      [],
      `Uma variável ou derruba o boot, ou tem default, ou é exigida só em produção — ` +
        `nunca duas ao mesmo tempo:\n${clashes.join('\n')}`,
    );
  });

  it('unidade agendada declara cron do Scheduler e fuso explícito', () => {
    const bad = WORKLOADS.filter((w) => w.kind === 'scheduled')
      .filter((w) => !SCHEDULER_CRON.test(w.cron) || !w.timezone.includes('/'))
      .map((w) => `${w.name}: cron=${w.cron} tz=${w.timezone}`);
    assert.deepEqual(
      bad,
      [],
      `Cron fora do dialeto de 6 campos, ou fuso não-IANA — o cutoff de negócio depende dos dois:\n${bad.join('\n')}`,
    );
  });
});

describe('WORKLOADS-MANIFEST — a cadeia de precedência se sustenta', () => {
  it('dependsOn cita unidade que existe, e nunca a si mesma', () => {
    const names = new Set<string>(WORKLOADS.map((w) => w.name));
    const broken = WORKLOADS.flatMap((w) =>
      w.dependsOn.filter((d) => !names.has(d) || d === w.name).map((d) => `${w.name} → ${d}`),
    ).sort();
    assert.deepEqual(
      broken,
      [],
      `Precedência apontando para unidade inexistente ou para si mesma:\n${broken.join('\n')}`,
    );
  });

  it('a precedência é acíclica — existe ordem de partida', () => {
    // Nome inexistente e auto-referência já são barrados acima; ciclo de dois ou mais saltos
    // passava, e descreve uma topologia que NUNCA inicia: a suíte promete que a cadeia se
    // sustenta, e um ciclo é precisamente o que a derruba.
    const deps = new Map<string, readonly string[]>(WORKLOADS.map((w) => [w.name, w.dependsOn]));
    const state = new Map<string, 'visiting' | 'done'>();
    const cycles: string[] = [];

    const visit = (name: string, path: readonly string[]): void => {
      if (state.get(name) === 'done') return;
      if (state.get(name) === 'visiting') {
        const from = path.indexOf(name);
        cycles.push([...path.slice(from === -1 ? 0 : from), name].join(' → '));
        return;
      }
      state.set(name, 'visiting');
      for (const d of deps.get(name) ?? []) visit(d, [...path, name]);
      state.set(name, 'done');
    };

    for (const w of WORKLOADS) visit(w.name, []);

    assert.deepEqual(
      [...new Set(cycles)].sort(),
      [],
      `Ciclo em dependsOn — nenhuma das unidades do ciclo tem como partir:\n${cycles.join('\n')}`,
    );
  });

  it('a migration precede o RBAC, que precede a borda HTTP', () => {
    // A invariante da #462: permissão nova que não é semeada antes de a porta abrir vira 403 mudo
    // — falha de autorização, não de boot, e por isso passa despercebida no deploy.
    // O retorno é alargado para `readonly string[]` de propósito: com `as const`, o `dependsOn`
    // vazio do `migrate` tem tipo `readonly []`, e `includes` passaria a exigir `never`.
    const dependsOnOf = (n: string): readonly string[] =>
      WORKLOADS.find((w) => w.name === n)?.dependsOn ?? [];
    assert.ok(
      dependsOnOf('sync-permissions').includes('migrate'),
      'sync-permissions não espera migrate',
    );
    assert.ok(
      dependsOnOf('backend').includes('sync-permissions'),
      'backend não espera sync-permissions',
    );
    assert.equal(dependsOnOf('migrate').length, 0, 'migrate deveria ser a raiz da cadeia');
  });
});

describe('WORKLOADS-MANIFEST — o manifesto casa com o código', () => {
  it('toda variável declarada aparece no fonte', () => {
    // O manifesto sai da varredura, e é ele que decidia o resultado: `src/deploy/workloads.ts`
    // vive DENTRO de `src/`, e cada variável aparece lá como literal `'NOME'` — então
    // `src.includes("'NOME'")` era satisfeito pelo próprio arquivo sob verificação, `ghosts`
    // era sempre `[]` e este gate NUNCA podia falhar. Apagar `SWEEP_BATCH_SIZE` de
    // `src/jobs/contracts/sweeper/config.ts` mantinha o verde — exatamente a variável-fantasma
    // que a `jobs-and-workers.md` promete acusar. Gate que não pode reprovar é pior que gate
    // ausente: o ausente não dá confiança falsa.
    const src = trackedTs()
      .filter((f) => f !== MANIFEST_PATH)
      .map((f) => readSource(f))
      .join('\n');
    const ghosts = [...new Set(WORKLOADS.flatMap(allEnvsOf))]
      .filter((e) => !src.includes(`'${e}'`) && !src.includes(`"${e}"`))
      .sort();
    assert.deepEqual(
      ghosts,
      [],
      `Variável declarada no manifesto que nenhum arquivo de src/ menciona — ` +
        `ou foi removida do código, ou nunca existiu:\n${ghosts.join('\n')}`,
    );
  });

  it('toda leitura de ambiente vive em config, entrypoint ou composition root', () => {
    const allowed = new Set(ENV_READERS_OUTSIDE_CONFIG);
    const strays = envReaders()
      .filter((f) => !isConfigLike(f) && !allowed.has(f))
      .sort();
    assert.deepEqual(
      strays,
      [],
      `Arquivo lendo ambiente fora de um módulo de configuração. Mova a leitura para um ` +
        `*-config.ts, ou justifique a exceção em ENV_READERS_OUTSIDE_CONFIG:\n${strays.join('\n')}`,
    );
  });

  it('a allowlist de leitores não cita arquivo que sumiu', () => {
    const readers = new Set(envReaders());
    const stale = ENV_READERS_OUTSIDE_CONFIG.filter((f) => !readers.has(f)).sort();
    assert.deepEqual(
      stale,
      [],
      `Exceção que já não lê ambiente — remover da lista para ela não proteger nada em ` +
        `silêncio:\n${stale.join('\n')}`,
    );
  });

  it('todo entrypoint de src/ está no manifesto ou é declarado local-only', () => {
    const declared = new Set<string>(
      WORKLOADS.map((w) => entrypointOf(w)).filter((e): e is string => e !== undefined),
    );
    const localOnly = new Set(LOCAL_ONLY_ENTRYPOINTS);
    const orphans = trackedTs()
      .filter((f) => /(^|\/)(run|server)\.ts$/.test(f))
      .filter((f) => !declared.has(f) && !localOnly.has(f))
      .sort();
    assert.deepEqual(
      orphans,
      [],
      `Entrypoint que ninguém declara: não é unidade de deploy nem exceção local. ` +
        `Sem declaração, ele não tem como ser provisionado:\n${orphans.join('\n')}`,
    );
  });

  it('os entrypoints local-only ainda existem', () => {
    const tracked = trackedFiles();
    const stale = LOCAL_ONLY_ENTRYPOINTS.filter((f) => !tracked.has(f)).sort();
    assert.deepEqual(
      stale,
      [],
      `Entrypoint local-only já removido — apagar da lista (ela deve encolher até esvaziar):\n${stale.join('\n')}`,
    );
  });
});

describe('WORKLOADS-MANIFEST — guardas contra verde por vacuidade', () => {
  it('o manifesto cobre os três regimes de execução', () => {
    const kinds = new Set(WORKLOADS.map((w) => w.kind));
    for (const expected of ['service', 'task', 'scheduled']) {
      assert.ok(kinds.has(expected as never), `nenhuma unidade do regime '${expected}'`);
    }
  });

  it('o detector enxerga leitura de ambiente', () => {
    assert.ok(
      envReaders().length > 20,
      'o detector de leitura de ambiente não achou quase nada — o padrão quebrou e os gates ' +
        'acima passariam sem verificar coisa alguma',
    );
  });

  it('há unidade provisionada e unidade apenas declarada', () => {
    const states = new Set(WORKLOADS.map((w) => w.provisioning));
    assert.ok(states.has('provisioned'), 'nenhuma unidade marcada como provisionada');
    assert.ok(
      states.has('declared-only'),
      'nenhuma unidade declared-only — a lacuna entre o que o repo sabe executar e o que roda ' +
        'deixou de ser visível',
    );
  });
});
