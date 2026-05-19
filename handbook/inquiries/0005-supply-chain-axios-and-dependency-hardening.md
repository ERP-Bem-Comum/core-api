# Inquiry-0005: Supply chain — incidente Axios e hardening de dependências

- **Status:** Decided
- **Opened:** 2026-04-28
- **Closed/Decided:** 2026-04-28
- **Opened by:** Gabriel Aderaldo
- **Asked to:** Pesquisa em fontes públicas (CISA, Microsoft Security, Elastic Security Labs)
- **Impact:** [ADR-0011](../architecture/adr/0011-supply-chain-hardening.md), runbook em `operations/runbooks/legacy-supply-chain-hardening.md`

---

## 1. Contexto

Em 31/março/2026, a conta npm do mantenedor `jasonsaayman` (axios) foi comprometida por threat actor norte-coreano (Sapphire Sleet). Versões 1.14.1 e 0.30.4 foram publicadas com dependência maliciosa `plain-crypto-js` que baixa RAT (Remote Access Trojan) em runtime.

**70M+ downloads/semana.** CISA emitiu alerta oficial em 20/abril/2026.

Necessidade: avaliar risco no projeto (legado e novo) e definir política de hardening.

---

## 2. Pergunta(s) feita(s)

> "Qual o risco real do incidente Axios no nosso projeto? E como blindar projeto novo contra incidentes futuros?"

---

## 3. Respostas / Investigação

### 2026-04-28 — Análise do legado

Verificação de `legacy_project/yarn.lock`:
```
axios@^1.7.7:
  version "1.7.7"
```

**Versão 1.7.7 NÃO é a comprometida.** Mas o range `^1.7.7` no `package.json` significa que qualquer `yarn install --no-frozen-lockfile` pode resolver para a maliciosa.

### 2026-04-28 — Análise de outras libs do legado

Auditoria com `grep -rl` no `legacy_project/src/`:

| Lib declarada | Imports no código | Veredito |
| :--- | :---: | :--- |
| `lodash` | **0** | Surface de ataque grátis |
| `moment` | **0** | Idem |
| `dayjs` | **0** | Idem |
| `expect.js` | **0** | Idem |
| `body-parser` | (Nest provê) | Redundante |
| `axios` | 3 arquivos (BC Bradesco) | Necessário, substituível |
| `cnab240-nodejs` | direto do GitHub (sem versão npm) | Risco supply chain alto |
| `joi 9.0.4` | (de 2017) | Versão de 9 anos atrás |

### 2026-04-28 — Outros incidentes 2026

- **CanisterWorm** (abril/2026) — worm auto-propagante atingindo pacotes Namastex Labs.
- **TeamPCP** (março/2026) — Trivy, KICS, LiteLLM, Telnyx comprometidos.

---

## 4. Análise interna

### Riscos imediatos no legado

| # | Risco | Severidade | Ação |
| :--- | :--- | :---: | :--- |
| 1 | `axios ^1.7.7` com range aberto | 🔴 Alta | Pinar `1.7.7` (sem `^`) |
| 2 | `cnab240-nodejs` direto do GitHub | 🔴 Alta | Pinar commit hash ou fork interno |
| 3 | Libs declaradas e mortas | 🟡 Média | Remover (`yarn remove`) |
| 4 | Joi 9.0.4 de 2017 | 🟡 Média | Migrar pra Zod (já no projeto) |
| 5 | Lockfile yarn 1 classic | 🟡 Média | Migrar pra pnpm/yarn 4 |

### Política de hardening pro novo projeto

| Categoria | Decisão |
| :--- | :--- |
| Libs proibidas | `axios`, `request`, `moment`, `crypto-js`, `lodash` completo |
| Substituições nativas | `fetch`, `crypto.subtle`, `crypto.randomUUID`, `node:test` |
| Lockfile | YAML auditável (`pnpm-lock.yaml`); nunca binário |
| CI bloqueante | `pnpm audit --audit-level=high` |
| Pin de versões | Sem `^`/`~` em deps críticas |
| Adoção de nova dep | Justificativa em PR + check de mantenedor + 2FA |
| Permission Model do Node | Avaliar `--permission` em prod |

---

## 5. Decisão final

1. ✅ **Adotar política formal de supply chain hardening** ([ADR-0011](../architecture/adr/0011-supply-chain-hardening.md)).
2. ✅ **Lista de libs proibidas** documentada e enforced via ESLint no `core-api`.
3. ✅ **Higienização imediata do legado** (runbook em `operations/runbooks/legacy-supply-chain-hardening.md`).
4. ✅ **`fetch` nativo substitui axios** no `core-api` (decisão integrada ao [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md)).

---

## 6. Saídas

- [x] [ADR-0011](../architecture/adr/0011-supply-chain-hardening.md) criado.
- [ ] Runbook `operations/runbooks/legacy-supply-chain-hardening.md` (a criar quando começar a higiene do legado).
- [ ] Configuração ESLint com `no-restricted-imports` para libs proibidas (no `core-api` quando criar skeleton).

---

## 7. Referências

- [Mitigating the Axios npm supply chain compromise — Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/)
- [CISA Alert — Axios Supply Chain Compromise](https://www.cisa.gov/news-events/alerts/2026/04/20/supply-chain-compromise-impacts-axios-node-package-manager)
- [Inside the Axios supply chain compromise — Elastic Security Labs](https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all)
- [Supply Chain Attacks Surge in March 2026 — Zscaler](https://www.zscaler.com/blogs/security-research/supply-chain-attacks-surge-march-2026)
