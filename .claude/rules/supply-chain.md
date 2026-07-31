---
paths:
  - "package.json"
  - "pnpm-workspace.yaml"
  - "Dockerfile*"
  - ".npmrc"
---

# Regras invariantes — Supply chain e manifesto

Estes arquivos carregam **decisão de segurança**, não configuração incidental. A política nasceu de um incidente real: o comprometimento do `axios` em março/2026 ([ADR-0011](../../handbook/architecture/adr/0011-supply-chain-hardening.md)).

> ⚠️ **Cite [ADR-0029](../../handbook/architecture/adr/0029-pnpm-11-supply-chain-defaults.md), não o ADR-0012.** O ADR-0012 está **Superseded** desde 2026-05-30 — a escolha do pnpm continua válida, mas a norma vigente (major 11 + defaults) é o 0029.

## As 4 settings de supply-chain são intocáveis ([ADR-0029](../../handbook/architecture/adr/0029-pnpm-11-supply-chain-defaults.md))

Em `pnpm-workspace.yaml` — mantidas **explícitas** mesmo quando coincidem com o default do pnpm 11, porque explícito é auditável em diff de PR:

| Setting                        | Valor           | Por que existe                                                       |
| ------------------------------ | --------------- | -------------------------------------------------------------------- |
| `minimumReleaseAge`            | `1440`          | 1 dia de quarentena para versão recém-publicada                      |
| `minimumReleaseAgeStrict`      | `true`          | **falha** a resolução em vez de cair silenciosamente para versão nova |
| `trustPolicy`                  | `no-downgrade`  | bloqueia queda de trust evidence — **o vetor exato do caso `axios`**  |
| `blockExoticSubdeps`           | `true`          | transitivas só de fonte confiável (nada de git/tarball URL)          |

**Remover qualquer uma reabre o vetor do incidente.** Se uma dependência muito recente (< 24h) travar o install, a saída é `minimumReleaseAgeExclude` por pacote — nunca desligar a setting.

## Versão e runtime

- `packageManager` **pinado** em `pnpm@11.x` com hash; `engines.pnpm` em `">=11.0.0 <12"`.
- Corepack ativa a versão pinada; o `Dockerfile` acompanha via `ENV PNPM_VERSION`. Os três precisam concordar.
- **Nunca `npm`** ([ADR-0029](../../handbook/architecture/adr/0029-pnpm-11-supply-chain-defaults.md) §4; hook `block-npm.sh` barra o comando, mas não impede doc/script escrito com `npm`).
- `pnpm-lock.yaml` committed; CI sempre com `--frozen-lockfile`. Lockfile binário é proibido.

## Adicionar dependência exige justificar ([ADR-0011](../../handbook/architecture/adr/0011-supply-chain-hardening.md) §5)

Toda dep nova responde no PR, antes do merge:

- Por que **esta** lib? Que alternativas foram avaliadas — inclusive "implementar interno"?
- Mantenedor tem 2FA? Atividade recente? Qual o bus factor?
- Última publicação dentro de 6 meses?
- Versão **pinada**, sem `^`/`~`, se for dep crítica (ADR-0011 §3).

## Ferramenta de teste nunca vira dependência de produção ([ADR-0034](../../handbook/architecture/adr/0034-adopt-bruno-api-client-cli.md))

`@usebruno/cli` entra como **`devDependency` pinada — nunca `dependencies`**. Bruno é ferramenta de teste/doc da borda HTTP; o `src/` não o conhece. A exceção de supply-chain que ele exige é **cirúrgica, por versão**, no `pnpm-workspace.yaml` — no espírito do `undici-types@6.21.0`. **Não afrouxe a política globalmente para acomodar uma ferramenta.**

## Ambiente PBE não recebe dado real ([ADR-0021](../../handbook/architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md))

Ao editar config de deploy, compose ou connection string do **MagaluCloud (PBE/homologação)**: **sem** dump do banco legado, **sem** dados reais ou pessoais, **sem** integração Bradesco real (só sandbox/fake). Dataset sintético apenas. Produção real e dado pessoal vivem na AWS (`sa-east-1`, residência BR).

## Preferir o nativo do Node 24

Se o runtime já oferece, não adicione dep — cada dep removida é uma superfície de ataque a menos: `fetch` global (não `axios`/`node-fetch`), `crypto.randomUUID()` (não `uuid`), `crypto.subtle` (não `crypto-js`), `node --env-file` (não `dotenv`), `structuredClone` (não `lodash.clonedeep`), `node --watch` (não `nodemon`), `node:test` (não Jest).

> A **lista de libs proibidas** do ADR-0011 §4 não é repetida aqui: já é enforced por `@typescript-eslint/no-restricted-imports` (`eslint.config.js:77`), com a mensagem do ADR no próprio erro. Regra mecânica não vira texto.

## Especialista

[`pnpm-workspace-expert`](../agents/pnpm-workspace-expert.md) para lockfile, settings e corepack · [`security-backend-expert`](../agents/security-backend-expert.md) para avaliação de risco de dependência.
