[← Voltar para ADRs](./README.md)

# ADR-0076: pnpm 12.x, sem corepack — supersedes ADR-0029

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** Gabriel Aderaldo (Tech Lead)
- **Supersedes:** [ADR-0029](./0029-pnpm-11-supply-chain-defaults.md) — só a **versão maior** fixada e o mecanismo de ativação (corepack). As quatro settings de supply-chain e tudo o que o 0029 herdou do [ADR-0012](./0012-pnpm-package-manager.md) seguem vigentes e inalterados.
- **Relacionado:** [ADR-0011](./0011-supply-chain-hardening.md) (premissa de hardening) · [ADR-0058](./0058-runtime-tracks-recommended-lts.md) §1 (o runtime acompanha o LTS recomendado) · [ADR-0073](./0073-nvmrc-single-source-supersedes-0058-partial.md) (`.nvmrc` como fonte da versão do runtime)

---

## Contexto

O 0029 fixou a major **11** do pnpm e a ativava por **corepack** — no `Dockerfile` (`corepack enable && corepack prepare`) e em quatro workflows (`corepack enable`). Duas coisas mudaram desde então:

1. **O pnpm 12 é a linha `latest`** do registry desde a série 12.x. A major 11 recebe correções, mas novas proteções e a recomendação oficial já miram a 12.
2. **O corepack saiu do Node a partir do 25.** A subida do runtime para a linha 26 (LTS recomendado desde 28/10/2026, exigida pelo ADR-0058 §1) tira o `corepack` do PATH: o binário não existe em `node:26-bookworm-slim` nem no Node 26 instalado por `setup-node`. Medido localmente em 2026-11-23: `~/.local/opt/node/bin` (Node 26.13.1) contém `node`, `npm` e `npx` — e nada mais.

Ou seja, ficar no corepack deixou de ser opção no momento em que o runtime acompanha o LTS. A doc oficial do pnpm diz o mesmo pelo outro lado: a página de CI (<https://pnpm.io/continuous-integration>) instrui *"Do not use Corepack"*, e a de Docker (<https://pnpm.io/docker>) manda copiar `/opt/pnpm` da imagem oficial `ghcr.io/pnpm/pnpm`.

As mudanças da 12.0.0 que tocam este repositório, conferidas nas release notes (<https://github.com/pnpm/pnpm/releases/tag/v12.0.0>):

- chave desconhecida em `pnpm-workspace.yaml` passa a ser **erro** (`ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS`) quando o projeto pina uma versão que o pnpm corrente satisfaz — as nossas quatro settings, `allowBuilds` e `overrides` são todas reconhecidas (install verde);
- quando nenhum diretório acima do projeto aceita hardlink, o store padrão cai em `<projeto>/node_modules/.pnpm-store` — no `Dockerfile` o cache mount do BuildKit é outro filesystem, daí o `--store-dir` explícito;
- `--frozen-lockfile false` deixa de existir (não usamos);
- o lockfile continua em `lockfileVersion: '9.0'` e passa a registrar o próprio pnpm em `packageManagerDependencies`.

## Decisão

**`pnpm 12.x` como package manager único, ativado sem corepack.**

1. **A versão exata vive no `package.json`, não neste ADR** — mesma lição do ADR-0058 §2: número de patch escrito em ADR envelhece sozinho. `packageManager` carrega a versão com hash `+sha512`; `engines.pnpm` cobre a major (`>=12.0.0 <13`); `ENV PNPM_VERSION` no `Dockerfile` repete o número. A concordância entre os três segue cobrada por `tests/cleanup/supply-chain-settings.test.ts`.
2. **CI:** `pnpm/action-setup`, pinado por SHA (ADR-0011), **sem** `version:` — a action lê `packageManager`, de modo que o número não ganha uma quarta cópia nos workflows (o mesmo raciocínio do ADR-0073 para `node-version-file`).
3. **Docker:** stage `FROM ghcr.io/pnpm/pnpm:<versão>@sha256:<digest>` e `COPY --from` de `/opt/pnpm` para a base, com links em `/usr/local/bin` e verificação `pnpm --version` contra `PNPM_VERSION` no próprio build. Imagem do pnpm pinada por digest, como a base Node.
4. **As quatro settings de supply-chain do 0029 continuam explícitas** em `pnpm-workspace.yaml`, com os mesmos valores. Nenhuma foi afrouxada para destravar a migração.

## Consequências

### Positivas

- O runtime pode acompanhar o LTS (ADR-0058 §1) sem que o package manager quebre — a dependência oculta do corepack no Node deixa de existir.
- Correções de supply-chain da linha corrente chegam sem esperar backport (ex.: o bypass de `minimumReleaseAge`/`trustPolicy` por troca de registry, corrigido em 12.22.0/11.28.13).
- O CI deixa de depender de um binário que vinha "de brinde" com o Node.

### Negativas, declaradas

1. **A integridade do `+sha512` no Docker não é mais verificada pelo corepack.** Passa a valer o digest da imagem `ghcr.io/pnpm/pnpm` — uma âncora diferente (imagem publicada pela org do pnpm em vez do tarball do registry). A conferência `pnpm --version` no build pega tag e `PNPM_VERSION` divergentes, não uma imagem adulterada; essa defesa é o digest.
2. **O build da imagem não pôde ser exercitado localmente** no dia da decisão (a máquina não tem Docker). O primeiro build real é o do workflow de imagem — vermelho ali é regressão desta mudança, não ruído.
3. **Pnpm 12.23+ remove "platform variants"** do lockfile; subir para ela exige regenerar o lock (frozen install de lock antigo falha com `ERR_PNPM_BROKEN_LOCKFILE`). Fica para a próxima subida deliberada.

### Neutras

- `.npmrc` (`dedupe-peer-dependents=true`), `nodeLinker`, hoisting e `allowBuilds` inalterados.
- A escolha pnpm-vs-Bun-vs-npm **não** é reaberta.

## Quando reavaliar

- pnpm 13 alterar defaults de segurança ou o formato do lockfile.
- A imagem `ghcr.io/pnpm/pnpm` deixar de ser publicada com a cadência das releases, ou o pnpm passar a recomendar outro caminho para Docker.
- Novo incidente de supply-chain que exija política adicional (gatilho herdado do 0029).
