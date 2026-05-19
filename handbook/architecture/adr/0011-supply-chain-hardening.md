[← Voltar para ADRs](./README.md)

# ADR-0011: Supply Chain Hardening — Política de Dependências

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Arquiteto técnico

---

## Contexto

Em **31/março/2026**, a conta npm do mantenedor `jasonsaayman` (axios) foi comprometida por threat actor norte-coreano (Sapphire Sleet). Versões 1.14.1 e 0.30.4 foram publicadas com dependência maliciosa `plain-crypto-js` que baixa Remote Access Trojan em runtime. **70M+ downloads/semana de exposição.** CISA emitiu alerta oficial em 20/abril/2026.

Outros incidentes 2026: CanisterWorm (worm auto-propagante em pacotes Namastex Labs), TeamPCP (Trivy, KICS, LiteLLM, Telnyx).

ERP financeiro com auditoria fiscal de 5 anos não pode tratar supply chain como detalhe operacional. Precisa de **política formal e enforced**.

Análise completa: [Inquiry-0005](../../inquiries/0005-supply-chain-axios-and-dependency-hardening.md).

---

## Decisão

Adotar **política formal de Supply Chain Hardening** com 6 pilares:

### 1. Lockfile estrito e auditável

- **`pnpm-lock.yaml`** committed e versionado.
- **`pnpm install --frozen-lockfile`** em CI sempre.
- Lockfile binário (ex: `bun.lockb`) **proibido** — ver [ADR-0012](./0012-pnpm-package-manager.md).

### 2. Audit em CI bloqueante

```yaml
# pipeline CI:
- pnpm audit --audit-level=high   # falha o build se High/Critical
```

Ferramentas adicionais a adotar (a confirmar com Codebit):
- **Snyk** ou **Socket.dev** para alerta proativo sobre packages comprometidos.
- **GitHub Dependabot** para PRs automáticos de patches de segurança.

### 3. Pin de versões em deps críticas

```json
// package.json — sem ^/~ em deps críticas:
{
  "dependencies": {
    "fastify": "5.2.1",   // pinada
    "pg": "8.13.0",       // pinada
    "drizzle-orm": "0.x.y", // pinada
    "ssh2": "1.16.0"      // pinada (crítica para VAN)
  }
}
```

### 4. Lista de libs PROIBIDAS

Enforced via ESLint `no-restricted-imports`:

| Lib | Razão |
| :--- | :--- |
| `axios` | Supply chain compromise em março/2026 |
| `request` | Deprecated desde 2020 |
| `moment` | Manutenção mínima; `Intl` ou `date-fns` cobrem |
| `crypto-js` | Inativo; Web Crypto nativo cobre |
| `lodash` (completo) | Surface area enorme; nativo cobre |

### 5. Política de adoção de nova dep

Toda nova dependência adicionada exige no PR:

- [ ] Justificativa: por que essa lib específica?
- [ ] Alternativas avaliadas (incluindo "implementar interno").
- [ ] Verificação de mantenedor: 2FA habilitado? Atividade recente? Bus factor?
- [ ] Última publicação dentro de 6 meses.
- [ ] Versão pinada (sem `^`/`~`).

### 6. Permission model do Node em produção

Avaliar habilitar `--permission` em produção:

```bash
node --permission \
     --allow-fs-read=/app \
     --allow-fs-write=/tmp \
     --allow-net=api.bradesco.com.br,...
     ./dist/server.js
```

Limita o que dependências maliciosas podem fazer mesmo se carregadas. **Experimental no Node 24**, avaliar maturidade antes de prod crítica.

---

## Substituições nativas (Node 24 LTS) versus libs

| Lib popular | Substituto nativo | Status |
| :--- | :--- | :--- |
| `axios` / `node-fetch` | `fetch` global | ✅ Adotar |
| `uuid` | `crypto.randomUUID()` | ✅ Adotar |
| `crypto-js` | `crypto.subtle` (Web Crypto) | ✅ Adotar |
| `dotenv` | `node --env-file=.env` | ✅ Adotar |
| `lodash.clonedeep` | `structuredClone` | ✅ Adotar |
| `nodemon` | `node --watch` | ✅ Adotar (dev) |
| `jest` (parte) | `node:test` | ✅ Adotar (ou Vitest se ergonomia) |

Princípio: **se Node 24 oferece nativamente, adotar**. Cada dep removida é uma surface de ataque a menos.

---

## Consequências

### Positivas

- **Risco operacional reduzido** — incidentes como Axios não pegam de surpresa.
- **Auditoria clara** — lockfile e audit log são evidências.
- **CI bloqueia regressões** — alertas de vulnerabilidade param o pipeline.
- **Onboarding com cultura clara** — política escrita orienta novos devs.
- **Reduz surface area** — menos deps + nativo first.

### Negativas

- **Pin de versões** exige atualização proativa periódica (não automática).
- **CI mais lento** — audit + extra checks adicionam segundos.
- **Friction na adoção de nova lib** — checklist de PR pode ser visto como burocracia.
- **`--permission` ainda é experimental** — pode ter falsos negativos / problemas de compatibilidade.

### Neutras

- Cultura de "questionar cada dep antes de adicionar" — percebida como saudável por times maduros.

---

## Aplicação ao legado

A higienização imediata do legado (relacionada mas em runbook separado) inclui:

- [ ] Pinar `axios` em `1.7.7` (sem `^`).
- [ ] Pinar `cnab240-nodejs` em commit hash específico.
- [ ] Remover libs declaradas mas não usadas: `lodash`, `moment`, `dayjs`, `expect.js`, `body-parser`.
- [ ] Adicionar `yarn audit` em CI bloqueante.
- [ ] Migrar yarn classic → pnpm (ver [ADR-0012](./0012-pnpm-package-manager.md)).

Runbook futuro: `operations/runbooks/legacy-supply-chain-hardening.md`.

---

## Quando Re-avaliar

- Surgimento de novo incidente de supply chain relevante.
- Disponibilidade de ferramentas mais robustas (ex: Permission Model estabilizado, sigstore para npm).
- Mudança no perfil de risco da organização.

---

## Referências

- [Inquiry-0005](../../inquiries/0005-supply-chain-axios-and-dependency-hardening.md) — análise do legado e proposta.
- [Inquiry-0006](../../inquiries/0006-package-manager-pnpm-vs-bun.md) — escolha pnpm como suporte ao hardening.
- [ADR-0012](./0012-pnpm-package-manager.md) — package manager.
- [Mitigating the Axios npm supply chain compromise — Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/)
- [CISA Alert — Axios Supply Chain](https://www.cisa.gov/news-events/alerts/2026/04/20/supply-chain-compromise-impacts-axios-node-package-manager)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
