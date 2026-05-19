[← Voltar para ADRs](./README.md)

# ADR-0012: pnpm como Package Manager (em ambos os projetos: legado e novo)

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Arquiteto técnico

---

## Contexto

A migração Strangler Fig coexistirá por 12-24 meses ([ADR-0001](./0001-strangler-fig-over-rewrite.md)). Manter dois package managers (yarn no legado + pnpm no novo) gera fricção operacional contínua.

Em janeiro/2026, artigo público (dev.to) recomendou Bun para projetos novos genéricos. Necessidade de validar essa recomendação contra requisitos do projeto (segurança, governance, ambiente financeiro).

Análise completa: [Inquiry-0006](../../inquiries/0006-package-manager-pnpm-vs-bun.md).

---

## Decisão

**`pnpm 10.x` como package manager único** em ambos os projetos:

1. **`erp-financeiro-v2/`** (novo, monorepo) — pnpm desde o dia 1.
2. **`legacy_project/`** — migrar yarn 1 classic → pnpm em janela controlada após handoff de infra.

---

## Consequências

### Positivas

- **Audit nativo** (`pnpm audit`) — exigido por [ADR-0011](./0011-supply-chain-hardening.md).
- **Lockfile YAML auditável** — diff legível em PR.
- **Compatibilidade 100% com npm** — sem armadilhas dos 2% do Bun.
- **Workspaces maduros** — adequado para monorepo (`erp-financeiro-v2/`).
- **75% menos disco que npm** (124 MB vs 487 MB para 200 deps típicas).
- **3.7× mais rápido que npm** em cold install.
- **Hoisting estrito** — impede phantom dependencies (encontradas no legado).
- **Uniformidade operacional** entre legado e novo durante a fase Strangler.

### Negativas

- **Hoisting estrito quebra phantom deps do legado** — esforço de migração estimado em meio dia (ver [Inquiry-0006](../../inquiries/0006-package-manager-pnpm-vs-bun.md)).
- **Time precisa instalar pnpm** — mitigado por `corepack enable`.
- **Não é a tendência mais "moderna"** — Bun é 22× mais rápido em CI; trade-off aceito por motivos de segurança.

### Neutras

- Ferramentas como `tsx`, `ts-node` funcionam normalmente com pnpm.
- Native modules (bcrypt, ssh2) funcionam normalmente; rebuild automático.

---

## Por que NÃO Bun (rejeitado)

| Critério | Bun | pnpm | Vence |
| :--- | :---: | :---: | :--- |
| Audit nativo | ❌ | ✅ | pnpm |
| SBOM | ❌ | ✅ | pnpm |
| Lockfile auditável | ❌ binário | ✅ YAML | pnpm |
| Verificação assinatura | ❌ | ✅ | pnpm |
| Compatibilidade npm | ⚠️ ~98% | ✅ 100% | pnpm |
| Velocidade | ✅ 22× npm | 3.7× npm | Bun (mas irrelevante no nosso volume) |
| Maturidade prod financeira | 🟡 emergente | ✅ estabelecido | pnpm |
| Proibida por [ADR-0011](./0011-supply-chain-hardening.md) | ❌ falha em ≥3 critérios | ✅ alinha-se | — |

Bun pode ser revisitado em **Q1/2027** se gaps de segurança forem fechados.

---

## Migração do legado (yarn → pnpm)

Roteiro detalhado em runbook futuro: `operations/runbooks/legacy-yarn-to-pnpm-migration.md`.

Resumo:

```bash
cd legacy_project
git checkout -b chore/migrate-yarn-to-pnpm
corepack enable && corepack prepare pnpm@10 --activate

rm -rf node_modules yarn.lock
pnpm install                       # gera pnpm-lock.yaml

# Validar:
pnpm run build
pnpm run test
pnpm run start:dev

# Atualizar package.json — scripts mg:* trocam "yarn typeorm" por "pnpm exec typeorm"
# Atualizar Dockerfile (yarn install → pnpm install --frozen-lockfile)
# Atualizar CI

git commit -m "chore(legacy): migra yarn classic para pnpm"
```

**Custo estimado:** meio dia (incluindo resolução de phantom dependencies que vão aparecer).

**Quando executar:** após receber respostas da Codebit ([Inquiry-0003](../../inquiries/0003-multi-cloud-strategy.md)).

---

## Configurações padrão

Ambos os projetos devem ter no `package.json`:

```json
{
  "packageManager": "pnpm@10.0.0",
  "engines": {
    "node": ">=24",
    "pnpm": ">=10"
  }
}
```

---

## Quando Re-avaliar

- Bun ganhar audit nativo + verificação de assinatura + lockfile auditável.
- npm 12+ trazer features que mudem o trade-off.
- Surgir requisito específico que pnpm não atenda.

---

## Referências

- [Inquiry-0006](../../inquiries/0006-package-manager-pnpm-vs-bun.md) — análise.
- [ADR-0011](./0011-supply-chain-hardening.md) — exigências de supply chain (premissa).
- [pnpm vs npm vs yarn vs bun: 2026 Showdown — DEV Community](https://dev.to/pockit_tools/pnpm-vs-npm-vs-yarn-vs-bun-the-2026-package-manager-showdown-51dc)
- pnpm documentation: https://pnpm.io/
