[← Voltar para ADRs](./README.md)

# ADR-0034: Adoção do Bruno (`@usebruno/cli`) como ferramenta de teste da borda HTTP

- **Status:** Accepted
- **Date:** 2026-06-04
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Relacionado:** [ADR-0011](./0011-supply-chain-hardening.md) (política de supply-chain), [ADR-0029](./0029-pnpm-11-supply-chain-defaults.md) (`trustPolicy: no-downgrade`), [ADR-0025](./0025-http-server-fastify-core-api.md) (a borda HTTP que as coleções exercitam), [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) (schemas que as coleções refletem)

---

## Contexto

A borda HTTP do core-api (`/api/v1`, `/api/v2`) precisa de **smoke E2E reproduzível e revisável em
PR**. Hoje convivem duas formas: smoke em TypeScript (`tests/e2e/*.e2e.ts` + `scripts/e2e-*.sh`) e a
coleção **Bruno** `api-collections/partners/` (requests `.bru` Git-friendly, texto puro, diffável).
O Bruno estava em estado de **suporte sem ADR**: o `bru` CLI só rodava via **workaround fora da árvore
do projeto** (`/tmp` + PATH), porque instalá-lo no repo esbarra no guard de supply-chain.

`pnpm add @usebruno/cli` dentro do repo **falha** com `ERR_PNPM_TRUST_DOWNGRADE` (`trustPolicy:
no-downgrade`, ADR-0029). A cadeia `@usebruno/cli@3.4.2 → @usebruno/converters → jscodeshift →
@babel/core → semver@6.3.1` (e `@babel/register → make-dir → semver@5.7.2`) arrasta `semver` 5.x/6.x
**sem attestation de provenance**.

### Evidência (registry + sandbox)

- `pnpm view semver@6.3.1 / @5.7.2`: `dist.attestations` **vazio**, maintainers `npm-cli-ops`
  (`npm-cli+bot@github.com`); `dist-tags` mostram `latest-6 = 6.3.1`, `legacy = 5.7.2` — são as
  **últimas de suas linhas major**, mantidas pelo time oficial do npm CLI. O downgrade é **perda de
  evidência de provenance em versão antiga** (provenance é mecanismo recente, ~2023+), **não takeover** —
  caso idêntico ao já-excepcionado `undici-types@6.21.0`.
- **`handbook/reference/pnpm/settings.md:317`** — *"A list of package selectors that should be excluded
  from the trust policy check."* O exemplo `settings.md:325`: *"`'webpack@4.47.0 || 5.102.1'`"* mostra
  **range `||` num único selector**. Validado em sandbox: duas entradas separadas do mesmo pacote **não
  casam**; o selector combinado `'semver@5.7.2 || 6.3.1'` faz o `pnpm add -D @usebruno/cli` instalar.
- **`handbook/reference/bruno/bru-cli/overview.mdx:13`** — desde a v3.0.0 o runtime padrão é **Safe
  Mode**; as coleções não usam npm externo/FS, então rodam seguras sem `--sandbox=developer`.

---

## Decisão

Adotar o **Bruno como ferramenta oficial de teste da borda HTTP** do core-api, com as seguintes regras:

1. **`@usebruno/cli` é instalado como `devDependency` pinada** — **nunca** `dependencies`. Bruno é
   ferramenta de teste/doc; **jamais** dependência de produção em `src/` (o domínio não conhece Bruno).
2. **Exceção cirúrgica por-versão** em `pnpm-workspace.yaml`, no espírito do `undici-types@6.21.0` —
   fixada na versão, sem afrouxar a política globalmente:
   ```yaml
   trustPolicyExclude:
     - 'undici-types@6.21.0'
     - 'semver@5.7.2 || 6.3.1'   # transitivas de @babel/* via @usebruno/cli (devDep de teste);
                                  # downgrade de provenance, não takeover (npm-cli-ops; latest-6/legacy)
   ```
   `trustPolicyIgnoreAfter` (isentar tudo publicado há > N min) foi **rejeitado** por afrouxar a
   política globalmente — contraria a filosofia de exceção cirúrgica do ADR-0011/0029.
3. **`protobufjs` permanece com build ignorado** (`allowBuilds.protobufjs: false`, explícito/auditável)
   — protobuf serve a gRPC; as coleções são REST e o `bru run` roda sem ele.
4. **Coleções `.bru` versionadas** em `api-collections/<área>/`, refletindo os schemas Zod da borda
   (ADR-0027) — nunca inventam shape. Secrets fora do repo (`{{process.env.*}}`/environment).
5. **`bru run` em CI é opt-in e gateado** — como os demais `test:e2e:*` (exigem Docker, fora de `pnpm
   test`). Tornar o `bru run` um **gate obrigatório** de CI fica para um ADR/ticket futuro.

---

## Consequências

### Positivas

- **Sem workaround** — `pnpm exec bru` resolve o CLI do projeto; qualquer dev/CI roda o smoke sem
  instalar nada fora da árvore.
- **Coleções como código** — `.bru` diffável e revisável em PR, complementando o smoke TS.
- **Postura de supply-chain preservada** — a exceção é **por-versão** e justificada; o guard
  `no-downgrade` segue ativo para todo o resto.

### Negativas

- **+1 devDependency pesada** (~383 pacotes transitivos via `@usebruno/converters`/jscodeshift/babel,
  dos quais só o runtime de `bru run` é usado). Aceitável para tooling de teste; isolado em
  `devDependencies`, ausente do bundle de produção.
- **Exceção de trust** amplia (minimamente) a superfície auditável do `trustPolicyExclude` — mitigado
  por estar fixada nas versões exatas e documentada aqui.

### Neutras

- Convive com o smoke E2E em TypeScript; nenhuma decisão de runtime/produção muda.

---

## Quando Re-avaliar

- Bruno publicar um pacote de runtime enxuto (sem `@usebruno/converters`/babel) — revisar o peso.
- `semver` 6.3.1/5.7.2 deixarem a árvore do `@usebruno/cli` — remover a exceção.
- Decisão de tornar `bru run` gate **obrigatório** de CI — abrir ADR/ticket dedicado.
- Novo incidente de supply-chain envolvendo a árvore do Bruno.

---

## Referências

- [ADR-0011](./0011-supply-chain-hardening.md) · [ADR-0029](./0029-pnpm-11-supply-chain-defaults.md) — política e defaults de supply-chain (premissas).
- `handbook/reference/pnpm/settings.md` — `trustPolicyExclude` (selector com `||`).
- `handbook/reference/bruno/bru-cli/` — `installation.mdx`, `overview.mdx`, `commandOptions.mdx`.
- `.claude/agents/bruno-api-client-expert.md` — agente de suporte (§Status atualizado: SUPORTE → ADOTADO).
- Ticket: `.claude/.pipeline/BRUNO-CLI-ADOPT/`.
