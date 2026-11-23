import process from 'node:process';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatFinding, scanPaths } from '#tests/support/comment-scan.ts';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

const toProjectPath = (arg: string): string =>
  relative(PROJECT_ROOT, resolve(process.cwd(), arg)).split(sep).join('/');

const args = process.argv.slice(2);
if (args.length === 0) {
  process.stderr.write(
    'uso: node --enable-source-maps scripts/ci/check-comments.ts <arquivo.ts...>\n',
  );
  process.exit(2);
}

const { findings, unparsed } = scanPaths(PROJECT_ROOT, args.map(toProjectPath));
for (const file of unparsed) {
  process.stdout.write(`${file}:0: [unparsed] o compilador não entregou este arquivo\n`);
}
for (const finding of findings) process.stdout.write(`${formatFinding(finding)}\n`);
process.exit(findings.length > 0 || unparsed.length > 0 ? 1 : 0);
