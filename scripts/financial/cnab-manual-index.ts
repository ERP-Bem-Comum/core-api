import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Indexa o layout CNAB 240 Multipag do Bradesco: código de campo → página do PDF.
//
// POR QUE EXISTE. As referências da skill `cnab240-bradesco` citavam páginas de um manual que não é
// o do repositório — declaravam "Versão 6 – julho/2023" enquanto o PDF local é a **Versão 08,
// revisado em julho/2025** (Nº 4008.523.687). O deslocamento não é constante: G009 caía em 82 e
// está em 95; G059 caía em 89 e está em 106. Um agente instruído a "citar a página do manual"
// produzia âncora que aponta para outro campo — que é o defeito descrito no CLAUDE.md §"Fonte de
// verdade", onde onze artefatos afirmaram por meses um layout que o banco recusa.
//
// A saída é ÍNDICE, nunca cópia. `handbook/guidelines/` está no `.gitignore` por restrição de
// redistribuição (o PDF é carimbado INTERNA), e `.claude/skills/` é commitável num repositório
// PÚBLICO. Reproduzir a tabela do manual ali publica material restrito; apontar para a página dele
// não. Por isso o índice carrega código, nome do campo e página — e manda abrir o PDF para ler a
// norma.
//
// SEM DATA DE GERAÇÃO, pelo mesmo motivo que `inquiry-index.ts`: carimbar a data de hoje num
// derivado deixa o `--check` vermelho amanhã sem ninguém ter tocado em nada, e gate que acende
// sozinho é gate que se aprende a ignorar. Quem data o índice é o `git log`.
//
// UMA chamada ao `pdftotext`, não 139: o extrator separa páginas por form feed (`\f`), então o
// índice do fragmento É o número da página. Rodar o binário por página custa 139 processos para
// chegar ao mesmo lugar.

/** Um campo do manual — `G029`, `P001` — e onde a seção de descrição o define. */
export interface FieldEntry {
  readonly code: string;
  readonly name: string;
  readonly page: number;
}

/** Uma ocorrência da tabela G059 — `'AK'` — e a página que a descreve. */
export interface OccurrenceEntry {
  readonly code: string;
  readonly name: string;
  readonly page: number;
}

export interface ManualIndex {
  readonly fields: readonly FieldEntry[];
  readonly occurrences: readonly OccurrenceEntry[];
}

// O layout de duas colunas do PDF quebra a célula do código separada da célula do nome: a seção de
// descrição emite ora `G029 Forma de Lançamento`, ora `G029` sozinho com o nome na linha seguinte.
// Casar só o primeiro formato perdia 23 dos 111 campos — entre eles G007 e G009, dois dos mais
// citados.
const CODE_ALONE = /^([GP]\d{3})$/;
const CODE_WITH_NAME = /^([GP]\d{3})\s+(\S.*)$/;

// A ocorrência aparece como `'AK' = Código da Câmara...` na tabela e como `G059 'AG' – Agência...`
// no cabeçalho da página que a continua. As aspas do PDF são tipográficas em parte das linhas.
const OCCURRENCE = /^(?:G059\s+)?['‘]([A-Z0-9]{2})['’]\s*[=–-]\s*(\S.*)$/;

/**
 * Distingue DEFINIÇÃO de MENÇÃO — e a distinção é o índice inteiro.
 *
 * Buscar `G007` no PDF acusa as páginas 15, 23 e 31, porque a coluna "Desc." de toda tabela de
 * layout referencia o código do campo. Só a seção de descrição o abre no início da linha. Um índice
 * construído sobre menção manda o agente para a tabela que cita o campo em vez da norma que o
 * define — e ele não teria como perceber.
 */
export function parseIndex(pages: readonly string[]): ManualIndex {
  const fields: FieldEntry[] = [];
  const seenField = new Set<string>();

  const linesOf = (text: string): readonly string[] => text.split('\n').map((l) => l.trim());

  pages.forEach((text, i) => {
    const page = i + 1;
    const lines = linesOf(text);

    lines.forEach((line, li) => {
      const withName = CODE_WITH_NAME.exec(line);
      const alone = CODE_ALONE.exec(line);
      const code = withName?.[1] ?? alone?.[1];
      if (code === undefined || seenField.has(code)) return;

      // Nome inline quando a célula não quebrou; senão, a primeira linha não-vazia seguinte. Uma
      // entrada sem nome legível entra mesmo assim: a página é o que o agente precisa, e omitir o
      // campo por causa da coluna cosmética esconderia a âncora que ele foi buscar.
      const inline = withName?.[2];
      const next = lines.slice(li + 1).find((l) => l !== '');
      const name = (inline ?? next ?? '').replace(/\s+/g, ' ');

      seenField.add(code);
      fields.push({ code, name, page });
    });
  });

  return { fields, occurrences: parseOccurrences(pages, fields) };
}

/**
 * Ocorrências G059, e SÓ as do G059 — a delimitação por faixa é o ponto desta função.
 *
 * A sintaxe `'01' = Nome` não é exclusiva do G059: a tabela de códigos de movimento de COBRANÇA
 * usa a mesma forma, e uma varredura do PDF inteiro devolve `'01' = Entrada de Títulos` ao lado de
 * `'01' = Insuficiência de Fundos`. Os dois são reais, significam coisas opostas, e o segundo é o
 * único que responde por que uma remessa de PAGAMENTO foi recusada.
 *
 * É o defeito registrado neste repositório como "o handbook propagou segmento de cobrança em
 * pagamento", cometido de novo por um regex sem noção de seção. A faixa fecha isso: a seção do
 * G059 vai da página onde ele é definido até a página do PRÓXIMO campo definido depois dele.
 */
export function parseOccurrences(
  pages: readonly string[],
  fields: readonly FieldEntry[],
): readonly OccurrenceEntry[] {
  const g059 = fields.find((f) => f.code === 'G059');
  if (g059 === undefined) return [];

  // O primeiro campo definido DEPOIS do G059 fecha a seção. Sem ele — G059 sendo o último do
  // manual — a seção vai até o fim, que é o comportamento correto e não um caso de erro.
  const after = fields
    .filter((f) => f.page > g059.page)
    .reduce<number>((min, f) => Math.min(min, f.page), pages.length + 1);

  const out: OccurrenceEntry[] = [];
  const seen = new Set<string>();

  for (let page = g059.page; page < after; page += 1) {
    for (const line of (pages[page - 1] ?? '').split('\n').map((l) => l.trim())) {
      const m = OCCURRENCE.exec(line);
      const code = m?.[1];
      if (code === undefined || seen.has(code)) continue;
      seen.add(code);
      out.push({ code, name: (m?.[2] ?? '').replace(/\s+/g, ' '), page });
    }
  }

  return out;
}

export function renderIndex(index: ManualIndex, source: string): string {
  const fieldRows = [...index.fields]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((f) => `| \`${f.code}\` | ${f.name} | ${String(f.page)} |`)
    .join('\n');

  const occurrenceRows = [...index.occurrences]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((o) => `| \`${o.code}\` | ${o.name} | ${String(o.page)} |`)
    .join('\n');

  return `# 00 — Índice do manual: campo → página

> **Derivado. Não editar à mão.** Regerado por \`pnpm run cnab:index\`.
> Fonte: \`${source}\` — Manual de Procedimentos Multipag Bradesco, Layout CNAB 240 Posições,
> Nº 4008.523.687, **Versão 08**, revisado em julho/2025 (139 páginas).

Este arquivo **não reproduz o manual** — ele diz em que página está cada coisa. O PDF vive em
\`handbook/guidelines/\`, que está no \`.gitignore\` por restrição de redistribuição; este diretório é
commitável e o repositório é público. Ler a norma é abrir o PDF na página indicada.

**A página é a do PDF, que coincide com a impressa no rodapé.** Números de página vindos de outra
edição do manual não conferem com esta: o deslocamento varia por seção (+13 no G009, +17 no G059),
então não existe conversão por fórmula. Se uma citação não bater com a página daqui, ela veio de
outra edição — reancorar, não ajustar.

## Campos (${String(index.fields.length)})

Onde a seção de descrição **define** o campo. Uma tabela de layout que apenas o cita na coluna
"Desc." não entra aqui.

| Cód. | Campo | Pág. |
| :--- | :--- | ---: |
${fieldRows}

## Ocorrências G059 (${String(index.occurrences.length)})

Códigos de crítica devolvidos no retorno (posições 231-240). **É a tabela que o validador do banco
implementa** — quando ela divergir da tabela de layout, ela vence.

| Cód. | Ocorrência | Pág. |
| :--- | :--- | ---: |
${occurrenceRows}
`;
}

/** O PDF é a única fonte primária e vive fora do versionamento. */
const MANUAL = 'handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf';
const OUTPUT = '.claude/skills/cnab240-bradesco/referencias/00-indice-campos.md';

export function extractPages(pdfPath: string): readonly string[] {
  // `execFileSync`, nunca `exec`: sem shell não há caminho para interpretação de metacaractere no
  // nome do arquivo. `-layout` preserva a ordem de leitura das duas colunas — sem ele, o nome do
  // campo se descola do código e o índice sai com nomes trocados.
  const raw = execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return raw.split('\f');
}

/**
 * O que fazer quando o PDF não está no disco — que é o caso NORMAL fora da máquina de quem tem a
 * documentação Bradesco: `handbook/guidelines/` está no `.gitignore`, então CI, clone novo e
 * `git archive` não têm a fonte, embora tenham o `00-indice-campos.md` commitado.
 *
 * Em `--check`, ausência da fonte não é falha: um gate que exige arquivo que o ambiente não pode
 * ter fica vermelho por motivo alheio ao diff, e vermelho crônico é vermelho que se aprende a
 * ignorar. Devolve exit 0 com aviso explícito — a ausência aparece no log, não no status.
 *
 * Na REGENERAÇÃO, exit 1 — e a assimetria com o `--check` é o ponto.
 *
 * Ali a ausência do PDF é o estado esperado do ambiente; aqui é a frustração de uma intenção
 * declarada: alguém digitou `pnpm run cnab:index` e não há fonte para indexar. Exit code não é
 * lido por humanos, é lido por `&&`, `set -e` e CI — devolver 0 faz o script afirmar "índice
 * atualizado" sobre algo que não aconteceu, e a próxima etapa de qualquer cadeia continua sobre
 * essa afirmação falsa. O `00-indice-campos.md` fica com o conteúdo antigo enquanto todo mundo
 * acredita que ele foi regerado — que é exatamente o defeito que este script existe para não
 * cometer.
 *
 * O preço aceito é quem rodar o comando por engano num clone sem a documentação levar um exit 1.
 * Comando que falha com mensagem clara custa uma leitura; comando que mente custa uma remessa
 * ancorada na edição errada do manual.
 */
export function handleMissingManual(pdfPath: string, check: boolean): number {
  process.stderr.write(
    `Manual não encontrado: ${pdfPath}\n\n` +
      'O PDF vive fora do versionamento (restrição de redistribuição — `.gitignore:44`), então\n' +
      'este ambiente não consegue derivar o índice.\n',
  );

  if (check) {
    process.stderr.write('Em `--check` isso não é falha: o índice commitado segue valendo.\n');
    return 0;
  }

  process.stderr.write(
    'Nada foi regerado. Para indexar, rode na máquina que tem a documentação Bradesco.\n',
  );
  return 1;
}

function main(): void {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
  const pdfPath = join(root, MANUAL);
  const outPath = join(root, OUTPUT);
  const check = process.argv.includes('--check');

  if (!existsSync(pdfPath)) {
    process.exit(handleMissingManual(pdfPath, check));
  }

  const next = renderIndex(parseIndex(extractPages(pdfPath)), MANUAL);
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf-8') : '';

  if (check) {
    if (current !== next) {
      process.stderr.write(
        `Índice do manual desatualizado: ${OUTPUT}\n\n` +
          'Rode `pnpm run cnab:index` e commite o resultado.\n',
      );
      process.exit(1);
    }
    process.stdout.write('OK — índice do manual em dia.\n');
    return;
  }

  if (current === next) {
    process.stdout.write('Nada a fazer — índice já em dia.\n');
    return;
  }

  writeFileSync(outPath, next);
  process.stdout.write(`Regerado: ${OUTPUT}\n`);
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
