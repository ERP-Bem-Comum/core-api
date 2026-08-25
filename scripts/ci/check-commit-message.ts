import process from 'node:process';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Gate LOCAL do trailer `Assisted-by` (ADR-0054 §1), rodado pelo hook `commit-msg` ANTES do commit
// existir. Complementa `check-commit-trailers.ts`, que roda no CI sobre commits já feitos: quando o
// CI acusa, a história já está escrita e o conserto é rebase.
//
// A regra de FORMATO não é redefinida aqui — `ASSISTED_BY_FORMAT` é importado do gate de CI, para
// que os dois nunca discordem sobre o que é um trailer válido.
import { ASSISTED_BY_FORMAT } from './check-commit-trailers.ts';

export type MessageViolation =
  | { readonly kind: 'missing-assisted-by' }
  | { readonly kind: 'malformed-assisted-by'; readonly value: string };

// Quem decide o que é bloco de trailers é o PRÓPRIO git (`interpret-trailers --parse`), nunca um
// regex nosso. Essa escolha é o coração do gate: um trailer escrito logo abaixo de uma linha comum
// — `Refs #708` seguido de `Assisted-by:` sem linha em branco — não forma bloco válido, e o git o
// ignora. Um validador caseiro que só procurasse a substring `Assisted-by:` aprovaria essa
// mensagem, e o CI a reprovaria depois: exatamente a divergência que este arquivo existe para não
// criar.
export const parseTrailers = (message: string, key: string): readonly string[] => {
  const parsed = execFileSync('git', ['interpret-trailers', '--parse'], {
    input: message,
    encoding: 'utf8',
  });
  const prefix = `${key}:`;
  return parsed
    .split('\n')
    .filter((line) => line.toLowerCase().startsWith(prefix.toLowerCase()))
    .map((line) => line.slice(prefix.length).trim());
};

export const checkCommitMessage = (
  trailers: readonly string[],
  opts: { readonly requirePresence: boolean },
): readonly MessageViolation[] => {
  if (trailers.length === 0) {
    return opts.requirePresence ? [{ kind: 'missing-assisted-by' }] : [];
  }
  return trailers
    .filter((value) => !ASSISTED_BY_FORMAT.test(value))
    .map((value) => ({ kind: 'malformed-assisted-by', value }) as const);
};

const explain = (violations: readonly MessageViolation[]): string => {
  const lines = violations.map((v) =>
    v.kind === 'missing-assisted-by'
      ? '  • trailer `Assisted-by` ausente (ou fora de um bloco de trailers válido)'
      : `  • trailer mal formado: "${v.value}"`,
  );
  return [
    '❌ commit-msg: o trailer Assisted-by não passou (ADR-0054 §1).',
    '',
    ...lines,
    '',
    'Formato: Assisted-by: AGENT_NAME:MODEL_VERSION [ferramenta]',
    'Exemplo: Assisted-by: Claude-Code:claude-opus-5',
    '',
    '⚠️ O trailer precisa estar no ÚLTIMO parágrafo, separado do corpo por uma linha',
    '   em branco. Uma linha comum logo acima dele — como "Refs #123" — quebra o bloco,',
    '   e o git deixa de reconhecê-lo. Verifique com:',
    '',
    '     git interpret-trailers --parse < .git/COMMIT_EDITMSG',
    '',
    'A IA NUNCA assina Signed-off-by — só um humano certifica o DCO (ADR-0054 §2).',
    '',
    'Escape deliberado: git commit --no-verify',
  ].join('\n');
};

const main = (): void => {
  const [, , messagePath] = process.argv;
  if (messagePath === undefined) {
    process.stderr.write('uso: check-commit-message.ts <caminho-da-mensagem>\n');
    process.exit(2);
  }

  const message = readFileSync(messagePath, 'utf8');

  // Merge commit integra história, não produz conteúdo — mesma isenção do gate de CI, e o que
  // impede o botão "Update branch" do GitHub de quebrar o próprio PR.
  if (/^Merge /m.test(message.split('\n')[0] ?? '')) process.exit(0);

  // A presença só é exigida quando quem commita é o agente. `CLAUDECODE` é posto no ambiente pela
  // sessão do Claude Code e chega ao hook porque o `git commit` roda dentro dela. Commit humano
  // legitimamente não tem o trailer — exigi-lo de todos transformaria um gate de IA em obstáculo
  // para o time. O FORMATO, esse, é validado dos dois lados.
  const requirePresence = (process.env['CLAUDECODE'] ?? '') !== '';

  const violations = checkCommitMessage(parseTrailers(message, 'Assisted-by'), { requirePresence });
  if (violations.length === 0) process.exit(0);

  process.stderr.write(`${explain(violations)}\n`);
  process.exit(1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
