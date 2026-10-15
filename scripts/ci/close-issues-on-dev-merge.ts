import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// "Issue fecha entrando na `dev`; a release é o ajuntamento que fecha na `main`."
//
// Por que um script de CI e NÃO a troca da branch default:
//   o GitHub fecha issue automaticamente só quando o PR entra na branch **default**, e a default
//   deste repositório é a `main` — de propósito, porque é ela que o Dependabot e o code scanning
//   medem. Trocar a default para `dev` daria o fechamento de graça e tiraria PRODUÇÃO de vigilância:
//   o alerta "N vulnerabilidades high na branch default" passaria a falar da linha de trabalho, não
//   do que está no ar. Este script entrega a semântica sem pagar esse preço.
//
// O passivo que isto resolve é pequeno e real. Medido em 15/10/2026, cruzando as 153 issues abertas
// com os 120 PRs mergeados na `dev`: 30 eram citadas e exatamente UMA tinha fechamento declarado e
// seguia aberta — entregue em 09/09, publicada na `v1.0.0-rc.3`, aberta por 51 dias. O fechamento
// manual não falha em massa; falha em silêncio, uma issue por vez.
//
// ⚠️ Toda a disciplina abaixo serve a UMA propriedade: **nenhum resultado silencioso**. Fechar a
// issue errada e deixar de fechar a certa são falhas igualmente graves, e as duas são invisíveis
// quando o job termina verde. É por isso que o caminho de erro aqui prefere ficar VERMELHO a
// adivinhar.
//
// As funções puras são testáveis; o `main()` é glue fina (lê env, chama `gh`).

/**
 * Verbos que DECLARAM fechamento.
 *
 * @remarks
 * Menção simples não fecha: `ver #930`, `relacionado a #59` e `traslado do #983` seguem abertas.
 * A distinção não é purismo — foi medida. Das 30 issues abertas citadas por PR mergeado, 29 eram
 * menção de contexto; tratá-las como fechamento encerraria 29 issues vivas de uma vez.
 */
const CLOSING_VERBS = [
  'fecha',
  'fecham',
  'fechando',
  'encerra',
  'closes',
  'close',
  'closed',
  'fixes',
  'fix',
  'fixed',
  'resolve',
  'resolves',
  'resolved',
] as const;

/** Artigo opcional entre o verbo e a referência. */
const ARTICLES = '(?:a|o|as|os|tamb[ée]m\\s+a)';

/** Uma referência: `**#123**`, `#123`, `a #123`. */
const ONE_REF = `(?:${ARTICLES}\\s+)?\\*{0,2}#\\d{1,5}\\b`;

/**
 * Cláusula de fechamento inteira, com a LISTA que compartilha o verbo.
 *
 * @remarks
 * ⚠️ Um verbo governa várias referências: "Fecha as #816 e #820", "Fecha #816, #820 e #830".
 * Capturar só a primeira é a pior falha possível aqui, porque o log imprime um fechamento e o
 * autor conclui que todas entraram — reproduzindo em silêncio o passivo que este script existe
 * para eliminar. A captura é a cláusula toda; os números saem dela num segundo passo.
 */
const CLOSING_CLAUSE = new RegExp(
  `\\b(?:${CLOSING_VERBS.join('|')})\\s+(${ONE_REF}(?:\\s*(?:,|e|and)\\s*${ONE_REF})*)`,
  'giu',
);

const REF_NUMBER = /#(\d{1,5})\b/gu;

/**
 * Negação ADJACENTE ao verbo de fechamento.
 *
 * @remarks
 * ⚠️ Esta guarda existe porque o corpo de PR deste repositório discute, por disciplina, o que
 * **não** foi fechado: o commit de release da `rc.4` escreve _"o defeito continua aberto — aqui ele
 * foi contornado, não corrigido"_. Sem a guarda, um texto que nega o fechamento fecharia a issue
 * que ele declara aberta, punindo quem foi preciso.
 *
 * **Adjacência estrita, e não uma janela de palavras.** A versão anterior aceitava negação a até 40
 * caracteres de distância e produzia falso NEGATIVO em frase corriqueira: "Não houve regressão:
 * fecha a #12" e "Mudança sem risco, fecha a #12" não fechavam nada, sem aviso — a referência nem
 * aparecia no log. Falso negativo aqui é tão silencioso quanto falso positivo. Exigindo que a
 * negação seja a palavra imediatamente anterior (com advérbio opcional), "não fecha" e "ainda não
 * resolve" continuam bloqueados e as frases acima voltam a funcionar.
 *
 * `sem` saiu da lista: "sem risco, fecha" é negação de outra coisa, nunca do fechamento.
 */
const ADJACENT_NEGATION = /\b(?:n[ãa]o|nunca|jamais)\s+(?:\w+\s+)?$/iu;

/**
 * Remove do texto o que é CITAÇÃO, não declaração.
 *
 * @remarks
 * ⚠️ Bloco de código e blockquote transcrevem corpo de outro PR — e o repositório faz isso: PR de
 * consolidação cita o texto do PR que substitui, e PR de release transcreve entradas de CHANGELOG.
 * Sem este corte, citar "fecha a #940" fecha a #940.
 *
 * **Limitação honesta:** isto cobre bloco cercado, código inline e blockquote. Prosa que cite entre
 * aspas — `o PR dizia "fecha a #940"` — continua passando, porque distinguir isso de uma declaração
 * de verdade exigiria entender a frase. O risco restante é aceito; o alternativo era exigir uma
 * seção dedicada no corpo do PR, o que trocaria uma falha rara por atrito em todo PR.
 */
export function stripQuotations(text: string): string {
  return text
    .replace(/```[\s\S]*?```/gu, ' ')
    .replace(/`[^`\n]*`/gu, ' ')
    .replace(/^[ \t]*>.*$/gmu, ' ');
}

/**
 * Extrai os números de issue que o texto DECLARA fechar, em ordem crescente e sem repetição.
 *
 * @param text - título e corpo do PR, concatenados.
 */
export function extractClosingRefs(text: string): number[] {
  const refs = new Set<number>();
  const clean = stripQuotations(text);

  for (const match of clean.matchAll(CLOSING_CLAUSE)) {
    const clause = match[1];
    if (clause === undefined) continue;

    const before = clean.slice(0, match.index);
    if (ADJACENT_NEGATION.test(before)) continue;

    for (const ref of clause.matchAll(REF_NUMBER)) {
      const raw = ref[1];
      if (raw === undefined) continue;
      const parsed = Number.parseInt(raw, 10);
      if (Number.isSafeInteger(parsed) && parsed > 0) refs.add(parsed);
    }
  }

  return [...refs].sort((a, b) => a - b);
}

/** Corpo do comentário que acompanha o fechamento. */
export function closingComment(prNumber: string): string {
  return [
    `Integrada na \`dev\` pelo #${prNumber}.`,
    '',
    'A entrega em **produção** acontece na próxima release — é ela o ajuntamento que vai à `main`.',
    'Até lá, o código existe e está integrado, mas não está no ar.',
    '',
    'Fechada por `.github/workflows/close-issues-on-dev-merge.yml`.',
  ].join('\n');
}

/**
 * O que a API disse sobre a referência.
 *
 * @remarks
 * As quatro variantes existem para que nenhuma delas caia em "ignora e segue verde". `not-found` e
 * `pull-request` são erro do AUTOR do PR (escreveu o número de memória) e seguem; `unreachable` é
 * falha de infraestrutura e precisa ficar vermelha.
 */
export type RefProbe =
  | Readonly<{ tag: 'issue'; state: string }>
  | Readonly<{ tag: 'pull-request' }>
  | Readonly<{ tag: 'not-found' }>
  | Readonly<{ tag: 'unreachable'; detail: string }>;

/**
 * Classifica a saída do `gh api` sobre uma referência.
 *
 * @remarks
 * ⚠️ `gh issue view <N>` **não** serve para saber se `N` é issue: medido com gh 2.95.0 contra este
 * repositório, `gh issue view 1061` (um PR) devolve `MERGED` com exit 0. Um PR ABERTO devolveria
 * `OPEN`, e o script chamaria `gh issue close` sobre um pull request — com o workflow declarando só
 * `issues: write`, o resultado é fechar um PR vivo ou deixar o job vermelho depois do merge. A
 * resposta de `repos/{repo}/issues/{n}` traz a chave `pull_request` quando o número é um PR, e é
 * essa a única distinção confiável.
 */
export function classifyProbe(raw: string): RefProbe {
  const [state = '', kind = ''] = raw.trim().split('|');
  if (kind === 'pr') return { tag: 'pull-request' };
  if (state === '') return { tag: 'unreachable', detail: 'resposta sem campo state' };
  return { tag: 'issue', state: state.toUpperCase() };
}

/**
 * Decide, pela mensagem de erro do `gh`, se a falha é 404 (erro do autor) ou transporte (defeito).
 *
 * @remarks
 * ⚠️ Era aqui o furo mais grave da primeira versão: um `catch` único convertia QUALQUER falha em
 * "não é uma issue deste repositório" e o job seguia verde. Rate limit secundário, 5xx da API ou
 * `GH_TOKEN` sem escopo passariam como se as issues não existissem — nenhuma fecharia e ninguém
 * veria vermelho. É precisamente o fechamento silencioso que este workflow existe para eliminar,
 * reintroduzido pelo tratamento de erro.
 */
export function isNotFound(message: string): boolean {
  return /\b404\b|not found/iu.test(message);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    process.stderr.write(`[close-issues] a variavel ${name} nao esta definida\n`);
    process.exit(1);
  }
  return value;
}

function probeRef(repo: string, id: string): RefProbe {
  try {
    const raw = execFileSync(
      'gh',
      [
        'api',
        `repos/${repo}/issues/${id}`,
        '-q',
        '.state + "|" + (if .pull_request then "pr" else "issue" end)',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return classifyProbe(raw);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return isNotFound(detail) ? { tag: 'not-found' } : { tag: 'unreachable', detail };
  }
}

function main(): void {
  const repo = requireEnv('REPO');
  const prNumber = requireEnv('PR_NUMBER');
  const text = `${process.env['PR_TITLE'] ?? ''}\n${process.env['PR_BODY'] ?? ''}`;

  const refs = extractClosingRefs(text);
  if (refs.length === 0) {
    process.stdout.write('Nenhuma issue declarada para fechamento neste PR.\n');
    return;
  }

  process.stdout.write(`Declaradas para fechamento: ${refs.map((n) => `#${n}`).join(', ')}\n`);
  const comment = closingComment(prNumber);
  let failed = 0;

  for (const number of refs) {
    const id = String(number);
    const probe = probeRef(repo, id);

    switch (probe.tag) {
      case 'not-found':
        process.stdout.write(`  #${id}: ignorada — não existe neste repositório\n`);
        continue;

      case 'pull-request':
        process.stdout.write(`  #${id}: ignorada — é um pull request, não uma issue\n`);
        continue;

      case 'unreachable':
        // Infraestrutura, não erro do autor. Fica VERMELHO: o contrário seria o job dizer que
        // fechou o que não fechou.
        failed += 1;
        process.stderr.write(`  #${id}: FALHOU ao consultar — ${probe.detail}\n`);
        continue;

      case 'issue':
        if (probe.state !== 'OPEN') {
          process.stdout.write(`  #${id}: já estava ${probe.state.toLowerCase()}\n`);
          continue;
        }
        break;
    }

    try {
      execFileSync('gh', ['issue', 'close', id, '--repo', repo, '--comment', comment], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      process.stdout.write(`  #${id}: fechada\n`);
    } catch (cause) {
      failed += 1;
      process.stderr.write(`  #${id}: FALHOU ao fechar — ${String(cause)}\n`);
    }
  }

  if (failed > 0) process.exit(1);
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
