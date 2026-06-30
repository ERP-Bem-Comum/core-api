import process from 'node:process';

// Guard de package manager (ADR-0012 / ADR-0029). Roda como `preinstall`.
// Dois sinais, porque o pnpm mudou de comportamento entre majors:
//   - pnpm 10 exporta `npm_config_user_agent` ("pnpm/10.33.4 ...");
//   - pnpm 11 deixa esse env vazio em lifecycle scripts, mas `npm_execpath`
//     aponta para `.../pnpm/<ver>/bin/pnpm.mjs`.
// Aceitar se QUALQUER sinal indicar pnpm; npm/yarn falham em ambos
// (`npm-cli.js`, `yarn.js`), impedindo um lockfile divergente.
//
// Implementação nativa — não usa o pacote `only-allow` nem `npx`: evita uma
// dependência fetchada e o toolchain npm (ADR-0011 §substitutos nativos).

const userAgent = process.env['npm_config_user_agent'] ?? '';
const execBase = (process.env['npm_execpath'] ?? '').split(/[\\/]/).pop() ?? '';

// UA presente decide sozinho (pnpm 10, npm, yarn). Só caímos no `npm_execpath`
// como desempate quando o UA está vazio — o caso do pnpm 11. Assim um `npm
// install` (UA "npm/...") nunca é aceito por ter sido disparado a partir de um
// shell cujo `npm_execpath` herdado apontava para pnpm.
const isPnpm = userAgent.startsWith('pnpm/') || (userAgent === '' && execBase.startsWith('pnpm'));

if (!isPnpm) {
  process.stderr.write(
    'Este repositório exige pnpm (ADR-0012). Rode `pnpm install` — o corepack ativa\n' +
      'a versão fixada em package.json#packageManager. npm/yarn divergem o lockfile.\n',
  );
  process.exit(1);
}
