# W1 — Implementação (GREEN)

## Habilitado por

[ADR-0029](../../../../handbook/architecture/adr/0029-pnpm-11-supply-chain-defaults.md) (supersedes ADR-0012).

## Mudanças

| Arquivo | Mudança |
| :--- | :--- |
| `package.json` | `packageManager` → `pnpm@11.5.0`; `engines.pnpm` → `>=11.0.0 <12` |
| `Dockerfile` | `ENV PNPM_VERSION=11.5.0` (comentário → ADR-0029) |
| `pnpm-workspace.yaml` | settings de supply-chain explícitas: `minimumReleaseAge: 1440`, `minimumReleaseAgeStrict: true`, `trustPolicy: no-downgrade`, `trustPolicyExclude: [undici-types@6.21.0]`, `blockExoticSubdeps: true` |
| `scripts/only-allow-pnpm.ts` | guard robusto: UA decide; `npm_execpath` é fallback só quando UA vazio (pnpm 11) |
| `tests/scripts/only-allow-pnpm.test.ts` | controla `npm_execpath`; +2 casos (regressão pnpm 11 + cenário v11) |
| `website/package.json` | `packageManager` → `pnpm@11.5.0` (unificação) |
| `eslint.config.js` / `.prettierignore` | ignoram `website/` (projeto isolado) |

## Decisão de policy registrada

`trustPolicy: no-downgrade` disparou em `undici-types@6.21.0` (transitiva de `@types/node@22`,
pacote de tipos do undici mantido pelo time do Node.js). Downgrade é de evidência de provenance,
não takeover. Exceção **fixada na versão** via `trustPolicyExclude` — política segue ativa para
os outros 366 entries do lockfile.

## Lockfile

`pnpm install` sob pnpm 11.5.0: GREEN. `lockfileVersion: '9.0'` mantido.
