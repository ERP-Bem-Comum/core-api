# BRUNO-CLI-ADOPT — Adotar `@usebruno/cli` como devDependency do core-api

> **Size:** S · **Habilitado por:** [ADR-0034](../../../handbook/architecture/adr/0034-adopt-bruno-api-client-cli.md)

## Escopo

Oficializar o **Bruno** como ferramenta de teste da borda HTTP, instalando `@usebruno/cli` como
**devDependency** versionada no projeto (hoje só roda via workaround fora da árvore). Vencer a fricção
do `trustPolicy: no-downgrade` (ADR-0029) com uma exceção cirúrgica por-versão, no mesmo espírito do
precedente `undici-types@6.21.0`. Migrar o wrapper de smoke para usar o `bru` local.

## Contexto / problema

`pnpm add @usebruno/cli` dentro do repo falha com `ERR_PNPM_TRUST_DOWNGRADE` — a cadeia
`@usebruno/cli → @usebruno/converters → jscodeshift → @babel/* → semver@6.3.1` (e `@babel/register →
make-dir → semver@5.7.2`) arrasta `semver` 5.x/6.x **sem attestation de provenance**. Investigação no
registry: `semver` 6.3.1/5.7.2 são mantidas por `npm-cli-ops` (bot oficial do npm CLI) e são as
**últimas de suas linhas major** (`dist-tags`: `latest-6`, `legacy`). É perda de evidência de
provenance em versão antiga, **não takeover** — caso idêntico ao `undici-types@6.21.0` já excepcionado.

## Solução (validada empiricamente em sandbox replicando o trustPolicy do projeto)

- **Pegadinha descoberta:** duas entradas separadas do mesmo pacote no `trustPolicyExclude` **não
  casam**; é preciso **um único selector com range `||`** (a doc mostra `'webpack@4.47.0 || 5.102.1'`).
- `protobufjs` build ignorado (`ERR_PNPM_IGNORED_BUILDS`) é warning benigno — protobuf serve a gRPC; as
  coleções são REST. Não entra em `allowBuilds` (declarado `false` para auditar a intenção).
- `minimumReleaseAge: 1440` não barra nada (bru e deps são maduros).

## Arquivos

- `pnpm-workspace.yaml` — `trustPolicyExclude += 'semver@5.7.2 || 6.3.1'`; `allowBuilds.protobufjs: false`
- `package.json` — `devDependencies["@usebruno/cli"]` pinado
- `pnpm-lock.yaml` — re-gerado
- `scripts/e2e-bruno-partners.sh` — usar `pnpm exec bru` (local) em vez do PATH externo; atualizar cabeçalho
- `handbook/architecture/adr/0034-adopt-bruno-api-client-cli.md` — ADR de adoção (novo)
- `handbook/architecture/adr/README.md` + `handbook/CHANGELOG.md` — índice + changelog

## Critérios de aceite

- [ ] `pnpm install --frozen-lockfile` verde (lockfile re-gerado com o bru)
- [ ] `pnpm exec bru --version` = 3.4.2 (CLI resolvido do projeto, sem workaround)
- [ ] `trustPolicyExclude` contém o selector `'semver@5.7.2 || 6.3.1'` com justificativa
- [ ] `@usebruno/cli` em **devDependencies** (nunca `dependencies` — Bruno não é dep de `src/`)
- [ ] `scripts/e2e-bruno-partners.sh` usa o `bru` local; smoke `test:e2e:bruno:partners` verde (20/20)
- [ ] `pnpm run typecheck` · `pnpm run lint` · `pnpm run format:check` verdes (nada de produção tocado)
- [ ] ADR-0034 escrito + índice/changelog atualizados

## Fora de escopo

- Tornar `bru run` um gate **obrigatório** de CI (o ADR-0034 deixa como opt-in; CI fica para follow-up).
- Coleções novas além de `api-collections/partners/`.
- Conversores OpenAPI/Postman→Bruno (não usados; só `bru run` REST).
