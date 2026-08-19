// Ambiente para rodar `git` contra um repositório de FIXTURE.
//
// POR QUE EXISTE: o git exporta `GIT_DIR`, `GIT_INDEX_FILE` e companhia no ambiente dos hooks. O
// `.githooks/pre-commit` roda a suíte inteira, então todo teste que invoca `git` durante um
// `git commit` herda essas variáveis — e elas VENCEM o `cwd`. O fixture recém-criado no `tmpdir`
// vira decorativo: o git obedece `GIT_DIR` e opera no repositório de verdade.
//
// O estrago medido em 19/08/2026, numa única tentativa de commit:
//
//   · `git init` com `GIT_DIR` apontando para fora da work tree marca o repositório real como
//     **bare** — `git status` para de funcionar no checkout principal e TODA worktree linkada
//     quebra com "this operation must be run in a work tree";
//   · os `git config user.name/user.email` seguintes gravam a identidade do fixture no
//     `.git/config` real, e os commits de quem trabalha ali passam a sair assinados por ela.
//
// Nada disso aparece rodando `pnpm test` avulso, porque aí não há `GIT_DIR` no ambiente: o defeito
// só se manifesta dentro do `git commit`, que é justamente onde ninguém está olhando a suíte.
//
// A limpeza é por PREFIXO, e não por lista de variáveis conhecidas: `GIT_DIR`, `GIT_INDEX_FILE`,
// `GIT_WORK_TREE`, `GIT_OBJECT_DIRECTORY`, `GIT_PREFIX`, `GIT_AUTHOR_*`, `GIT_COMMITTER_*` e as
// internas mudam de versão para versão do git. Uma lista fica desatualizada em silêncio, e o modo
// de falha é o de cima.
import process from 'node:process';

// Mutável de propósito: é o que `spawnSync`/`execFileSync` aceitam em `env`, e cada chamada devolve
// um objeto novo — não há estado compartilhado a proteger.
export type GitFixtureEnv = Record<string, string | undefined>;

export const gitFixtureEnv = (): GitFixtureEnv =>
  Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));

/**
 * Roda `fn` com as variáveis `GIT_*` FORA do ambiente do processo, restaurando-as depois.
 *
 * `gitFixtureEnv()` resolve quem constrói o `env` do subprocesso. Não resolve o outro caso: código
 * de PRODUÇÃO que invoca `git` herdando o ambiente do processo — `scripts/handbook/tombstone.ts` é
 * um, e está certo em fazê-lo, porque no uso real ele roda dentro do pre-commit e o `GIT_DIR` do
 * hook é exatamente o repositório que ele deve inspecionar.
 *
 * Quem precisa mudar é o teste, que aponta essa função para um fixture: sem limpar o ambiente do
 * processo, `git diff --cached` lê o index do repositório real e devolve o que houver ali — nada,
 * no caso, o que faz o teste falhar dizendo que o gate não vê o arquivo removido.
 */
export const withoutGitEnv = <T>(fn: () => T): T => {
  const saved: GitFixtureEnv = {};
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('GIT_')) {
      saved[key] = process.env[key];
      // `Reflect.deleteProperty` e não `delete`: a chave é computada, e o `delete` de chave
      // computada é barrado por `@typescript-eslint/no-dynamic-delete`. Atribuir `undefined` NÃO
      // serve — `process.env` converte tudo em string, e a variável passaria a valer "undefined".
      Reflect.deleteProperty(process.env, key);
    }
  }
  try {
    return fn();
  } finally {
    Object.assign(process.env, saved);
  }
};
