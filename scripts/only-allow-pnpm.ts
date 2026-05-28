import process from 'node:process';

// Guard de package manager (ADR-0012). Roda como `preinstall`: o package
// manager em uso exporta `npm_config_user_agent` (ex.: "pnpm/10.33.4 ...",
// "npm/10.0.0 ...", "yarn/4.0.0 ..."). Abortar se não for pnpm impede que um
// `npm install`/`yarn` acidental gere um lockfile divergente.
//
// Implementação nativa — não usa o pacote `only-allow` nem `npx`: evita uma
// dependência fetchada e o toolchain npm (ADR-0011 §substitutos nativos).

const userAgent = process.env['npm_config_user_agent'] ?? '';

if (!userAgent.startsWith('pnpm/')) {
  process.stderr.write(
    'Este repositório exige pnpm (ADR-0012). Rode `pnpm install` — o corepack ativa\n' +
      'a versão fixada em package.json#packageManager. npm/yarn divergem o lockfile.\n',
  );
  process.exit(1);
}
