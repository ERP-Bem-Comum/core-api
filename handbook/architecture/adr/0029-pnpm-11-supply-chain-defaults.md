[← Voltar para ADRs](./README.md)

# ADR-0029: pnpm 11.x com defaults de supply-chain (supersedes ADR-0012)

- **Status:** Accepted
- **Date:** 2026-05-30
- **Deciders:** Arquiteto técnico + Gabriel Aderaldo
- **Supersedes:** [ADR-0012](./0012-pnpm-package-manager.md)
- **Relacionado:** [ADR-0011](./0011-supply-chain-hardening.md) (premissa de hardening), [ADR-0001](./0001-strangler-fig-over-rewrite.md) (coexistência com legado)

---

## Contexto

O [ADR-0012](./0012-pnpm-package-manager.md) estabeleceu **`pnpm 10.x` como package manager único**, e essa escolha de _ferramenta_ **permanece válida** — pnpm continua vencendo Bun e npm nos critérios de [ADR-0011](./0011-supply-chain-hardening.md) (audit nativo, SBOM, lockfile YAML auditável, verificação de assinatura). Este ADR **não reabre** a decisão pnpm-vs-Bun-vs-npm; altera apenas a **major fixada**.

Desde a versão 10, o pnpm passou a entregar uma bateria de proteções de supply-chain que respondem diretamente ao incidente que motivou o ADR-0011 (comprometimento do `axios` em março/2026, RAT via `postinstall`/versão maliciosa). Na **major 11**, essas proteções deixam de ser opt-in manual e passam a ser **default seguro**. Como o projeto é um ERP financeiro com auditoria fiscal de 5 anos, "default seguro" reduz o risco de uma proteção ser esquecida na configuração.

As features são configuradas via `pnpm-workspace.yaml` — **YAML auditável em diff de PR**, alinhado ao princípio de governança do ADR-0011.

### Evidência (citações literais de `handbook/reference/pnpm/`)

- **`minimumReleaseAge`** — `settings.md:219`: *"Default: **1440** (since v11), **0** (before v11)"*. Atrasa a instalação de versões recém-publicadas; `supply-chain-security.md:18`: *"In pnpm v11, this defaults to `1440` (1 day), meaning newly published packages will not be resolved until they are at least 1 day old."* Hoje o projeto seta isso **à mão**; no v11 vira default.
- **`minimumReleaseAgeStrict`** — `settings.md:286,290`: *"Added in: v11.0.0 · Default: **true** if `minimumReleaseAge` is explicitly configured"*. Faz a resolução **falhar** (em vez de silenciosamente cair para uma versão mais nova) quando nada satisfaz a janela de maturidade.
- **`trustPolicy: no-downgrade`** — `settings.md:301,308`: *"pnpm will fail if a package's trust level has decreased compared to previous releases … This helps prevent installing potentially compromised versions."* Defesa direta contra o vetor "mantenedor comprometido publica versão sem a evidência de confiança anterior" — exatamente o caso axios.
- **`blockExoticSubdeps`** — `settings.md:338,342`: *"Added in: v10.26.0 · Default: **true** … only direct dependencies may use exotic sources (git repositories or direct tarball URLs). All transitive dependencies must be resolved from a trusted source."*

---

## Decisão

**`pnpm 11.x` como package manager único**, fixado e com defaults de supply-chain explicitados.

1. **Versão pinada** (alinhado ao pin de versões críticas do [ADR-0011](./0011-supply-chain-hardening.md) §3):
   ```json
   {
     "packageManager": "pnpm@11.5.0",
     "engines": { "node": ">=24.0.0", "pnpm": ">=11.0.0 <12" }
   }
   ```
2. **Corepack** ativa a versão pinada: `corepack enable && corepack prepare pnpm@11.5.0 --activate`. O `Dockerfile` usa `ENV PNPM_VERSION=11.5.0`.
3. **Settings de supply-chain explícitas** em `pnpm-workspace.yaml` (mesmo quando coincidem com o default do v11 — explícito é auditável):
   ```yaml
   minimumReleaseAge: 1440          # 1 dia de quarentena (default no v11; mantido explícito)
   minimumReleaseAgeStrict: true    # falha a resolução em vez de cair para versão não-madura
   trustPolicy: no-downgrade        # bloqueia queda de trust evidence (vetor axios)
   blockExoticSubdeps: true         # transitivas só de fontes confiáveis (default v11)
   ```
4. **Tudo o que o ADR-0012 decidiu e continua valendo**: pnpm como PM único em legado e novo; lockfile `pnpm-lock.yaml` committed; `--frozen-lockfile` em CI; `only-allow=pnpm`; `approve-builds`/`allowBuilds` para postinstall.

---

## Consequências

### Positivas

- **Proteções de supply-chain por default** — `minimumReleaseAge` e `blockExoticSubdeps` deixam de depender de configuração manual lembrada.
- **`trustPolicy: no-downgrade`** adiciona uma camada que o v10 do projeto não tinha ativa — defesa específica contra o padrão do incidente axios (ADR-0011).
- **Config YAML auditável** — toda decisão de segurança vive em `pnpm-workspace.yaml`, versionada e revisável em PR.
- **Major mantida** — fixes de segurança do pnpm chegam na linha 11 ativa.

### Negativas

- **`minimumReleaseAgeStrict: true`** pode **falhar** uma adição de dependência muito recente (< 24h). Mitigação: `minimumReleaseAgeExclude` por pacote/versão quando justificado (`settings.md:232`).
- **Re-geração do lockfile** com pnpm 11 — exige `--frozen-lockfile` verde em CI após o bump (lockfileVersion permanece `9.0`).
- **Quebra explícita do `engines` `<11` anterior** — daí este ADR; ambientes precisam de corepack atualizado.

### Neutras

- `node-linker`, hoisting e workspaces inalterados. O portal de docs (`website/`, workspace isolado) acompanha a mesma major por uniformidade.

---

## Quando Re-avaliar

- npm 12+ ou Bun fecharem o gap de supply-chain (gatilho herdado do ADR-0012).
- pnpm 12 alterar defaults de segurança de forma relevante.
- Novo incidente de supply-chain que exija política adicional.

---

## Referências

- [ADR-0011](./0011-supply-chain-hardening.md) — política de supply-chain (premissa).
- [ADR-0012](./0012-pnpm-package-manager.md) — escolha do pnpm (superseded por este na parte da versão).
- `handbook/reference/pnpm/supply-chain-security.md` — guia oficial de mitigação.
- `handbook/reference/pnpm/settings.md` — referência normativa das settings citadas.
