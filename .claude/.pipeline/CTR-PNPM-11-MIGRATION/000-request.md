# CTR-PNPM-11-MIGRATION — Migração pnpm 10.x → 11.x

> **Size:** M · **Habilitado por:** [ADR-0029](../../../handbook/architecture/adr/0029-pnpm-11-supply-chain-defaults.md)

## Escopo

Migrar o core-api (e o portal `website/`) de `pnpm@10.33.4` para `pnpm@11.5.0`, conforme ADR-0029, explicitando as settings de supply-chain que o v11 traz como default.

## Fora de escopo

- Reabrir escolha pnpm-vs-Bun-vs-npm (ADR-0012/0029 mantêm pnpm).
- Migração do legado (`legacy_project/`) — runbook separado.

## Arquivos

- `package.json` — `packageManager` + `engines.pnpm`
- `Dockerfile` — `ENV PNPM_VERSION`
- `pnpm-workspace.yaml` — settings de supply-chain (`minimumReleaseAge`, `minimumReleaseAgeStrict`, `trustPolicy`, `blockExoticSubdeps`)
- `pnpm-lock.yaml` — re-gerado com pnpm 11
- `website/package.json` + `website/pnpm-workspace.yaml` — unificar na major 11

## Critérios de aceite

- [ ] `corepack prepare pnpm@11.5.0 --activate` e `pnpm --version` = 11.5.0
- [ ] `pnpm install --frozen-lockfile` verde (lockfile re-gerado, lockfileVersion 9.0)
- [ ] `pnpm run typecheck` · `pnpm run lint` · `pnpm test` · build verdes
- [ ] `website/` builda em pnpm 11
- [ ] Settings de supply-chain presentes e explícitas no `pnpm-workspace.yaml`
