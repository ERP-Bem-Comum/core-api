# Inquiry-0006: Package manager — pnpm vs Bun (e a migração yarn → pnpm no legado)

- **Status:** Decided
- **Opened:** 2026-04-28
- **Closed/Decided:** 2026-04-28
- **Opened by:** Gabriel Aderaldo
- **Asked to:** Pesquisa em fontes públicas + análise crítica (PkgPulse, dev.to)
- **Impact:** [ADR-0012](../architecture/adr/0012-pnpm-package-manager.md), runbook futuro `operations/runbooks/legacy-yarn-to-pnpm-migration.md`

---

## 1. Contexto

Decisão prévia (conversa interna inicial): pnpm como package manager para o monorepo do `core-api`. Mas:

- Apareceu artigo de 2026-01 do dev.to ("PNPM vs NPM vs Yarn vs Bun: 2026 Showdown") recomendando **Bun para projetos novos**.
- Bun é 22× mais rápido que npm em cold install.
- O legado usa **yarn 1 classic** — manter dois package managers (yarn no legado, pnpm no novo) por 12-24 meses durante Strangler Fig é fricção.

Necessidade: validar pnpm contra Bun considerando ambiente financeiro + decidir migração do legado.

---

## 2. Pergunta(s) feita(s)

1. "pnpm continua sendo a escolha certa em 2026, frente ao Bun?"
2. "Quão custoso seria substituir yarn por pnpm no legado?"

---

## 3. Respostas / Investigação

### 2026-04-28 — Análise do artigo de jan/2026 (dev.to)

| Métrica | Bun 1.3 | pnpm 10 | yarn 4 | npm 11 |
| :--- | :---: | :---: | :---: | :---: |
| Cold install (200 deps) | 2.1s | 12.4s | ~16s | 46.1s |
| Disco (200 deps) | ~485 MB | **124 MB** | ~430 MB | 487 MB |
| Lockfile | binário (`bun.lockb`) | YAML | texto | JSON |
| Audit nativo | ❌ | ✅ | ✅ | ✅ |
| Verificação assinatura | ❌ | ✅ | ✅ | ✅ |
| Compatibilidade npm | ~98% | 100% | 100% | 100% |

Recomendação **do próprio autor por contexto:**
- Novos projetos genéricos → Bun
- **Monorepos empresariais → pnpm** ← nosso caso

### 2026-04-28 — Críticas ao Bun para o nosso contexto

1. **Sem audit nativo** — exigido para sistema financeiro (ADR-0011).
2. **Sem verificação de assinatura** — exatamente o vetor do ataque Axios.
3. **Lockfile binário** — opaco para revisão de PR (`bun.lockb`).
4. **2% de incompatibilidade** — em ~200 deps = 4 deps com risco de bug sutil.
5. **Sem isolamento de rede no install** — vetor de exfiltração em CI.
6. **Artigo é de janeiro/2026, antes do incidente Axios em março** — autor não viveu a urgência atual.

### 2026-04-28 — Análise da migração yarn → pnpm no legado

Riscos identificados:
- **Phantom dependencies** (yarn classic permite imports de libs não declaradas; pnpm não).
- **Native modules** (bcrypt, ssh2 — precisam rebuild).
- **Scripts com path explícito a `./node_modules/typeorm/cli.js`** — pnpm cria symlinks, normalmente funciona, mas vale validar.
- **Dockerfile** se usar `yarn install` precisa ajuste.

**Custo estimado:**
- Cenário tranquilo: ~30 min.
- Cenário com surpresas: 2-4 horas.
- Cenário com problemas: 1 dia.

---

## 4. Análise interna

### Para o `core-api` novo

Decisão direta: **pnpm 10.x**. Razões:

| Critério | pnpm | Bun |
| :--- | :---: | :---: |
| Audit nativo | ✅ | ❌ |
| SBOM | ✅ | ❌ |
| Lockfile auditável | ✅ YAML | ❌ binário |
| Compatibilidade npm | ✅ 100% | ⚠️ 98% |
| Workspaces maduros | ✅ | 🟡 |
| Velocidade | 3.7× npm | 22× npm (mas irrelevante no nosso volume) |
| Maturidade prod financeira | ✅ Estabelecido | 🟡 Emergente |

### Para o legado

Considerando que o legado vive 12-24 meses durante Strangler Fig:
- **ROI da migração yarn→pnpm no legado:** positivo (uniformidade > custo).
- **Quando fazer:** após receber respostas da Codebit ([Inquiry-0003](./0003-multi-cloud-strategy.md)) e antes de iniciar implementação do `core-api`.
- **Como:** branch dedicada, validação completa, PR isolado.

**Decisão:** migrar legado para pnpm também, em momento controlado.

---

## 5. Decisão final

1. ✅ **`core-api` novo: pnpm 10.x.**
2. ✅ **Bun explicitamente NÃO adotado** nesta fase. Re-avaliar em Q1/2027 se gaps de segurança forem fechados.
3. ✅ **Legado: migrar yarn → pnpm** em janela controlada após handoff de infra.

---

## 6. Saídas

- [x] [ADR-0012](../architecture/adr/0012-pnpm-package-manager.md) criado.
- [ ] Runbook `operations/runbooks/legacy-yarn-to-pnpm-migration.md` (a criar quando agendar a migração do legado).

---

## 7. Referências

- [pnpm vs npm vs yarn vs bun: The 2026 Package Manager Showdown — DEV Community](https://dev.to/pockit_tools/pnpm-vs-npm-vs-yarn-vs-bun-the-2026-package-manager-showdown-51dc)
- [Inquiry-0005: Supply chain hardening](./0005-supply-chain-axios-and-dependency-hardening.md) — premissa.
- [ADR-0011: Supply Chain Hardening](../architecture/adr/0011-supply-chain-hardening.md).
