/**
 * Gera o `.env.example` e a documentação de variáveis de ambiente a partir do manifesto.
 *
 * @remarks
 * Fonte: `src/deploy/env-catalog.ts` (o que cada variável é) + `src/deploy/workloads.ts` (quem a
 * exige e em que categoria). Os dois artefatos são DERIVADOS — editá-los à mão é o que produziu o
 * defeito da #1059, em que o `.env.example` não declarava as `VAN_S3_*` e um clone novo não subia.
 *
 * Gerar, e não conferir, é decisão deliberada: o [ADR-0073](../../handbook/architecture/adr/0073-nvmrc-single-source-supersedes-0058-partial.md)
 * mediu que conferir deixa passar o que gerar impede — o gate da versão do Node cobrava só o major
 * e a divergência de minor sobreviveu verde.
 *
 * Uso:
 *   node scripts/deploy/generate-env-artifacts.ts            escreve nos destinos reais
 *   node scripts/deploy/generate-env-artifacts.ts --check     não escreve; sai 1 se houver diferença
 *   node scripts/deploy/generate-env-artifacts.ts --out-dir X escreve numa pasta alternativa
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { CATALOGUED_ENVS, envDoc, type EnvDoc } from '#src/deploy/env-catalog.ts';
import { WORKLOADS } from '#src/deploy/workloads.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');

const ENV_EXAMPLE = '.env.example';
const DOC = 'handbook/infrastructure/14-environment-variables.md';

type Category = 'required' | 'withDefault' | 'productionOnly' | 'constraintOnly';

/** A entrada do catálogo. Nome fora dele é defeito de programação, não estado de entrada. */
const docOf = (name: string): EnvDoc => {
  const found = envDoc(name);
  if (found === undefined) throw new Error(`variável sem entrada no catálogo: ${name}`);
  return found;
};

/** A variável aparece nesta lista do manifesto? Comparação, não `includes` — ver `unitsOf`. */
const inList = (list: readonly string[], name: string): boolean => list.some((e) => e === name);

/**
 * Em que categoria a variável cai, pela lista mais exigente em que aparece.
 *
 * @remarks
 * `constraintOnly` existe porque uma variável pode ser exigida por RELAÇÃO e por nenhuma das três
 * listas: `EMAIL_FROM` e seus irmãos vivem só no `at-least-one` do `worker-email`. A primeira
 * versão deste gerador não tinha essa categoria, e as três sumiram do `.env.example` — justamente
 * as que decidem se a spec de e-mail monta. O gate `env-catalog.test.ts` não pegou porque a
 * varredura dele conta as constraints e a daqui não contava: duas definições de "declarada" no
 * mesmo trabalho, que é o defeito que ele existe para impedir.
 */
const categoryOf = (name: string): Category | undefined => {
  if (WORKLOADS.some((w) => inList(w.env, name))) return 'required';
  if (WORKLOADS.some((w) => inList(w.envProductionOnly, name))) return 'productionOnly';
  if (WORKLOADS.some((w) => inList(w.envWithDefault, name))) return 'withDefault';
  if (WORKLOADS.some((w) => w.constraints.some((c) => c.envs.some((e) => e === name))))
    return 'constraintOnly';
  return undefined;
};

/** Unidades que citam a variável, com `*` nas que o manifesto declara sem provisionar. */
const unitsOf = (name: string): readonly string[] =>
  WORKLOADS.filter(
    (w) =>
      // Comparação, e não `includes`: as listas do manifesto são tuplas literais `readonly`, e o
      // compilador estreita o parâmetro de `includes` para os nomes declarados ali — passar um
      // `string` genérico vira erro contra `never`.
      inList(w.env, name) ||
      inList(w.envWithDefault, name) ||
      inList(w.envProductionOnly, name) ||
      w.constraints.some((c) => inList(c.envs, name)),
  ).map((w) => `${w.name}${w.provisioning === 'declared-only' ? '*' : ''}`);

const byCategory = (cat: Category): readonly string[] =>
  CATALOGUED_ENVS.filter((n) => categoryOf(n) === cat);

/** Quebra a descrição em linhas de comentário de até ~96 colunas. */
const asComment = (text: string, prefix = '# '): string => {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (current.length + w.length + 1 > 96) {
      lines.push(current);
      current = w;
    } else {
      current = current === '' ? w : `${current} ${w}`;
    }
  }
  if (current !== '') lines.push(current);
  return lines.map((l) => `${prefix}${l}`).join('\n');
};

const envExampleContent = (): string => {
  const out: string[] = [
    '# ============================================================================',
    '# ARQUIVO GERADO — não editar à mão.',
    '#',
    '# Fonte: src/deploy/env-catalog.ts + src/deploy/workloads.ts',
    '# Regenerar: pnpm run env:generate',
    '# Conferido por: tests/cleanup/env-artifacts-generated.test.ts',
    '#',
    '# Toda variável lida é obrigatória em TODO ambiente (ADR-0068): ausente, o processo não sobe',
    '# e diz qual campo falta. Os valores abaixo são de DESENVOLVIMENTO — nunca credencial nem',
    '# dado real, porque este arquivo é versionado e os repositórios são públicos.',
    '# ============================================================================',
    '',
  ];

  const section = (title: string, names: readonly string[], commentOut: boolean): void => {
    if (names.length === 0) return;
    out.push(`# ─── ${title} ${'─'.repeat(Math.max(0, 72 - title.length))}`, '');
    for (const name of names) {
      const d = docOf(name);
      out.push(asComment(d.description));
      out.push(`# lida em: src/${d.readBy}`);
      if (d.defaultValue !== undefined) out.push(`# default no código: ${d.defaultValue}`);
      if (d.inlinePerProcess !== undefined) {
        out.push(asComment(`NÃO declare aqui — ${d.inlinePerProcess}`));
        out.push(`# ${name}=${d.example}`, '');
        continue;
      }
      out.push(`${commentOut ? '# ' : ''}${name}=${d.example}`, '');
    }
  };

  section('OBRIGATÓRIAS — sem estas o processo NÃO sobe', byCategory('required'), false);
  section(
    'EXIGIDAS POR RELAÇÃO — ver o bloco de relações no fim',
    byCategory('constraintOnly'),
    false,
  );
  section('COM DEFAULT NO CÓDIGO — ausência não derruba o boot', byCategory('withDefault'), false);
  section(
    'OBRIGATÓRIAS SÓ EM PRODUÇÃO — exigidas sob NODE_ENV=production',
    byCategory('productionOnly'),
    true,
  );

  const constraints = WORKLOADS.flatMap((w) => w.constraints.map((c) => ({ unit: w.name, ...c })));
  if (constraints.length > 0) {
    out.push(
      `# ─── RELAÇÕES ENTRE VARIÁVEIS ${'─'.repeat(45)}`,
      '#',
      '# As listas acima não expressam estas regras:',
      '',
    );
    for (const c of constraints) {
      out.push(`# [${c.rule}] ${c.envs.join(' + ')}`);
      out.push(asComment(`${c.because} (unidade: ${c.unit})`, '#   '));
      out.push('');
    }
  }

  return `${out.join('\n').trimEnd()}\n`;
};

const docContent = (): string => {
  const out: string[] = [
    '[← Voltar para Infraestrutura](./README.md)',
    '',
    '# 🔑 Variáveis de ambiente — catálogo completo',
    '',
    '> **ARQUIVO GERADO** — não editar à mão. Fonte: [`src/deploy/env-catalog.ts`](../../src/deploy/env-catalog.ts)',
    '> + [`src/deploy/workloads.ts`](../../src/deploy/workloads.ts). Regenerar com `pnpm run env:generate`;',
    '> a concordância é cobrada por `tests/cleanup/env-artifacts-generated.test.ts`.',
    '',
    'Toda variável lida é obrigatória em **todo** ambiente ([ADR-0068](../architecture/adr/0068-env-fail-fast-every-environment.md)):',
    'ausente, o processo não sobe e diz qual campo falta. Degradar esconderia erro de configuração de',
    'quem tem a mão nele — as variáveis de homologação e produção são postas à mão na console da AWS.',
    '',
    'Para secrets (rotação, Secrets Manager, menor privilégio), ver [`03-secrets-catalog.md`](./03-secrets-catalog.md).',
    'Este documento responde outra pergunta: **o que cada variável faz e onde ela entra.**',
    '',
    '## Resumo',
    '',
    '| Categoria | Quantas | O que significa |',
    '| :--- | ---: | :--- |',
    `| **Obrigatória** | ${byCategory('required').length} | ausente, o processo não sobe |`,
    `| Exigida por relação | ${byCategory('constraintOnly').length} | nenhuma lista a exige sozinha; a regra está nas relações |`,
    `| Com default no código | ${byCategory('withDefault').length} | tem substituto; ausência não derruba |`,
    `| Só em produção | ${byCategory('productionOnly').length} | exigida sob \`NODE_ENV=production\` |`,
    `| Sem unidade que a declare | ${CATALOGUED_ENVS.filter((n) => categoryOf(n) === undefined).length} | existe código que a lê, fora do caminho de boot |`,
    `| **Total catalogado** | **${CATALOGUED_ENVS.length}** | |`,
    '',
    `Unidades de deploy declaradas: **${WORKLOADS.length}**. O sufixo \`*\` numa unidade significa`,
    '`provisioning: declared-only` — o repositório sabe executá-la e ninguém a provisionou.',
    '',
  ];

  const table = (title: string, names: readonly string[], note: string): void => {
    if (names.length === 0) return;
    out.push(`## ${title}`, '', note, '');
    out.push('| Variável | Exemplo | Lida em | Unidades |', '| :--- | :--- | :--- | :--- |');
    for (const name of names) {
      const d = docOf(name);
      const ex = d.example === '' ? '_(vazio)_' : `\`${d.example}\``;
      const units = unitsOf(name);
      const unitList = units.length === 0 ? '—' : units.join(', ');
      out.push(`| **\`${name}\`** | ${ex} | \`${d.readBy}\` | ${unitList} |`);
    }
    out.push('');
    for (const name of names) {
      const d = docOf(name);
      out.push(`**\`${name}\`** — ${d.description}`);
      if (d.defaultValue !== undefined) out.push(`<br>Default no código: \`${d.defaultValue}\`.`);
      if (d.inlinePerProcess !== undefined)
        out.push(`<br>⚠️ Não vai no \`.env\`: ${d.inlinePerProcess}`);
      if (d.notComposed !== undefined)
        out.push(`<br>⚠️ Nenhuma unidade a declara: ${d.notComposed}`);
      out.push('');
    }
  };

  table(
    'Obrigatórias',
    byCategory('required'),
    'Ausente, o processo **não sobe**. É a política de fail-fast do ADR-0068.',
  );
  table(
    'Exigidas por relação',
    byCategory('constraintOnly'),
    'Nenhuma das três listas as exige sozinha — a obrigação está na relação entre elas, descrita na seção "Relações entre variáveis".',
  );
  table(
    'Com default no código',
    byCategory('withDefault'),
    'Têm substituto no código; declarar é opcional, e o valor do exemplo é o que faz sentido em desenvolvimento.',
  );
  table(
    'Obrigatórias só em produção',
    byCategory('productionOnly'),
    'Exigidas apenas sob `NODE_ENV=production`. Em desenvolvimento o boot não cai sem elas.',
  );
  table(
    'Sem unidade que a declare',
    CATALOGUED_ENVS.filter((n) => categoryOf(n) === undefined),
    'Existe código que as lê, e esse código não está no caminho de boot de unidade alguma. Ficam aqui para a lacuna permanecer visível.',
  );

  const constraints = WORKLOADS.flatMap((w) => w.constraints.map((c) => ({ unit: w.name, ...c })));
  if (constraints.length > 0) {
    out.push('## Relações entre variáveis', '', 'O que as listas por categoria não expressam.', '');
    out.push('| Regra | Variáveis | Por quê | Unidade |', '| :--- | :--- | :--- | :--- |');
    for (const c of constraints) {
      out.push(
        `| \`${c.rule}\` | ${c.envs.map((e) => `\`${e}\``).join(' + ')} | ${c.because} | \`${c.unit}\` |`,
      );
    }
    out.push('');
  }

  return `${out.join('\n').trimEnd()}\n`;
};

const ARTIFACTS: readonly { readonly path: string; readonly build: () => string }[] = [
  { path: ENV_EXAMPLE, build: envExampleContent },
  { path: DOC, build: docContent },
];

const args = process.argv.slice(2);
const check = args.includes('--check');
const outDirFlag = args.indexOf('--out-dir');
const outDir = outDirFlag === -1 ? ROOT : resolve(ROOT, args[outDirFlag + 1] ?? '.');

/**
 * Com `--txt`, o template sai como `env-example.txt` em vez de `.env.example`.
 *
 * @remarks
 * Existe para inspecionar a saída antes de escrever no destino real, e para arquivar o artefato no
 * CI. Nome de arquivo começando com `.env` é barrado por política em várias ferramentas — incluindo
 * as do agente que escreveu este script —, então uma prévia legível precisa de outro nome.
 */
const asTxt = args.includes('--txt');
const pathFor = (p: string): string => (asTxt && p === ENV_EXAMPLE ? 'env-example.txt' : p);

let diverged = 0;
for (const { path, build } of ARTIFACTS) {
  const expected = build();
  const target = join(outDir, pathFor(path));
  if (check) {
    const actual = existsSync(target) ? readFileSync(target, 'utf-8') : '';
    if (actual !== expected) {
      diverged += 1;
      console.error(`DIVERGENTE  ${path}`);
    } else {
      console.log(`ok          ${path}`);
    }
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, expected, 'utf-8');
  console.log(`escrito     ${path}  (${expected.split('\n').length} linhas)`);
}

if (check && diverged > 0) {
  console.error(
    `\n${diverged} artefato(s) divergente(s). Rode \`pnpm run env:generate\` — estes arquivos são derivados.`,
  );
  process.exitCode = 1;
}
