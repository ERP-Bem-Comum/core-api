# DevOps Foundation — D0 (ADRs 0034/0035) + D1 (CI Hardening) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Escrever os dois ADRs que destravam a infra (AWS prod / Magalu QA) e o edge Caddy, e endurecer o workflow de CI (`test-and-quality.yml`) com permissões mínimas, pin de actions por SHA, `concurrency` e `actionlint`.

**Architecture:** Dois tickets de pipeline W0→W3. **D0** é puro doc (ADR-0034 infra-runtime + ADR-0035 edge-Caddy + destravar o agente `caddy-server-expert`), mas mesmo assim ganha um teste RED estrutural (os arquivos não existem) que vira GREEN após a escrita — mantém a disciplina fail-first. **D1** edita um único arquivo YAML de workflow, guiado por um teste `node:test` que parseia o arquivo e afirma as invariantes de hardening.

**Tech Stack:** Markdown (ADRs), `node:test` + `--experimental-strip-types` (testes estruturais lendo o FS), GitHub Actions YAML, `gh` CLI (resolver SHAs de actions), `pnpm run pipeline:state` (gestão de ticket).

**Convenções herdadas (não negociáveis):**
- **Sempre `pnpm`, nunca `npm`** (ADR-0012/0029; há hook que bloqueia).
- Testes rodam via `pnpm test` (glob `tests/**/*.test.ts`). Testes novos puramente de FS (sem rede/docker) entram nesse glob normal.
- Idioma: doc em PT-BR; identificadores de código em EN.
- Todo trabalho passa por ticket de pipeline (memória `feedback_always_use_pipeline_cli`).
- Commits em PT-BR com escopo (`docs(adr): ...`, `ci(hardening): ...`). **Só commitar — não `git push`.**

---

## File Structure

| Arquivo | Responsabilidade | Ticket |
| :-- | :-- | :-- |
| `handbook/architecture/adr/0034-runtime-infra-aws-prod-magalu-qa.md` | ADR da infra de runtime (criar) | D0 |
| `handbook/architecture/adr/0035-caddy-edge-reverse-proxy.md` | ADR de adoção do Caddy como edge (criar) | D0 |
| `handbook/architecture/adr/README.md` | Índice de ADRs — 2 linhas novas (modificar) | D0 |
| `handbook/CHANGELOG.md` | Entrada do dia para os 2 ADRs (modificar) | D0 |
| `.claude/agents/caddy-server-expert.md` | Destravar: frontmatter + seção de status (modificar) | D0 |
| `CLAUDE.md` | Tabela de agentes — linha do Caddy deixa de dizer "reservado" (modificar) | D0 |
| `tests/infra/devops-foundation-adrs.test.ts` | Teste estrutural RED→GREEN do D0 (criar) | D0 |
| `tests/infra/ci-workflow-hardening.test.ts` | Teste estrutural RED→GREEN do D1 (criar) | D1 |
| `.github/workflows/test-and-quality.yml` | Hardening: permissions, SHA pins, concurrency, actionlint (modificar) | D1 |

---

## TICKET D0 — `CTR-ADR-DEVOPS-FOUNDATION`

Cria ADR-0034 + ADR-0035 e destrava o agente Caddy. Size S.

### Task 0.1: Scaffold do ticket

**Files:**
- Create: `.claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/000-request.md`

- [ ] **Step 1: Inicializar o ticket via CLI de pipeline**

Run:
```bash
pnpm run pipeline:state init CTR-ADR-DEVOPS-FOUNDATION --size S
```
Expected: cria `.claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/STATE.json` + `STATE.md` com as 4 waves `pending`.

- [ ] **Step 2: Escrever o `000-request.md`**

Create `.claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/000-request.md`:
```markdown
# CTR-ADR-DEVOPS-FOUNDATION — ADRs de infra (0034) e edge Caddy (0035)

> **Size:** S · **Origem:** `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md` §11 (D0).
> Decisões já fixadas pelo dono em §10 da spec-mãe (brainstorming 2026-06-02).

## Escopo

1. **ADR-0034** — Infra de runtime: PROD=AWS (EC2 `t4g.small` ARM + Docker Compose + Caddy + RDS MySQL `db.t4g.micro` + S3, deploy keyless OIDC+SSM); QA=Magalu Cloud (VM + Compose + Caddy + MySQL container + object-storage S3-compat). Paridade via mesma imagem multi-arch. Escala futura EC2→ECS Fargate+ALB sem refactor.
2. **ADR-0035** — Adoção do Caddy 2.x como edge único (TLS automático ACME, HTTP→HTTPS, HSTS+security headers, trusted_proxies, reverse_proxy). Destrava o agente `caddy-server-expert` (anti-padrão #11 do CLAUDE.md).
3. Registrar ambos no índice (`adr/README.md`) e no `handbook/CHANGELOG.md`.
4. Destravar o agente `caddy-server-expert.md` (frontmatter + seção de status) e atualizar a linha do Caddy na tabela de agentes do `CLAUDE.md`.

## Critérios de Aceite

- [ ] CA1 — `adr/0034-*.md` e `adr/0035-*.md` existem, Status `Accepted`, seguindo o template do `adr/README.md` §4.
- [ ] CA2 — As 2 linhas no índice `adr/README.md` e a entrada no `CHANGELOG.md`.
- [ ] CA3 — `caddy-server-expert.md` não contém mais "RESERVED (Fase 2+)" nem "## Status: reservado"; referencia ADR-0035.
- [ ] CA4 — A linha do Caddy na tabela de agentes do `CLAUDE.md` não diz mais "reservado".
- [ ] CA5 — Teste estrutural `tests/infra/devops-foundation-adrs.test.ts` verde no `pnpm test`.

## Fora de escopo

- Implementação de qualquer workflow/IaC/Caddyfile (são D1–D7).
```

- [ ] **Step 3: Commit do scaffold**

```bash
git add .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/
git commit -m "chore(pipeline): abre CTR-ADR-DEVOPS-FOUNDATION (D0)"
```

---

### Task 0.2: W0 — teste estrutural RED

**Files:**
- Create: `tests/infra/devops-foundation-adrs.test.ts`

- [ ] **Step 1: Marcar início da wave W0**

```bash
pnpm run pipeline:state wave-start CTR-ADR-DEVOPS-FOUNDATION W0 --agent tdd-strategist
```

- [ ] **Step 2: Escrever o teste RED**

Create `tests/infra/devops-foundation-adrs.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repoRoot = new URL('../../', import.meta.url);
const read = (rel: string): Promise<string> => readFile(new URL(rel, repoRoot), 'utf8');

test('ADR-0034 existe, Accepted, e descreve AWS prod + Magalu QA', async () => {
  const adr = await read('handbook/architecture/adr/0034-runtime-infra-aws-prod-magalu-qa.md');
  assert.match(adr, /# ADR-0034:/);
  assert.match(adr, /\*\*Status:\*\* Accepted/);
  assert.match(adr, /EC2/);
  assert.match(adr, /RDS/);
  assert.match(adr, /Magalu/);
});

test('ADR-0035 existe, Accepted, e adota o Caddy como edge', async () => {
  const adr = await read('handbook/architecture/adr/0035-caddy-edge-reverse-proxy.md');
  assert.match(adr, /# ADR-0035:/);
  assert.match(adr, /\*\*Status:\*\* Accepted/);
  assert.match(adr, /Caddy/);
  assert.match(adr, /reverse.proxy|reverse_proxy/i);
});

test('Índice de ADRs lista 0034 e 0035', async () => {
  const readme = await read('handbook/architecture/adr/README.md');
  assert.match(readme, /\[0034\]\(\.\/0034-runtime-infra-aws-prod-magalu-qa\.md\)/);
  assert.match(readme, /\[0035\]\(\.\/0035-caddy-edge-reverse-proxy\.md\)/);
});

test('CHANGELOG menciona ADR-0034 e ADR-0035', async () => {
  const changelog = await read('handbook/CHANGELOG.md');
  assert.match(changelog, /ADR-0034/);
  assert.match(changelog, /ADR-0035/);
});

test('Agente Caddy destravado (sem RESERVED, referencia ADR-0035)', async () => {
  const agent = await read('.claude/agents/caddy-server-expert.md');
  assert.doesNotMatch(agent, /RESERVED \(Fase 2\+\)/);
  assert.doesNotMatch(agent, /## Status: reservado/);
  assert.match(agent, /ADR-0035/);
});

test('CLAUDE.md não marca mais o Caddy como reservado', async () => {
  const claude = await read('CLAUDE.md');
  const caddyLine = claude.split('\n').find((l) => l.includes('caddy-server-expert.md') && l.includes('|'));
  assert.ok(caddyLine, 'linha do Caddy na tabela de agentes deve existir');
  assert.doesNotMatch(caddyLine!, /reservado/i);
});
```

- [ ] **Step 3: Rodar e confirmar que falha (RED)**

Run:
```bash
pnpm test -- 'tests/infra/devops-foundation-adrs.test.ts'
```
Expected: FAIL — os arquivos de ADR não existem (`ENOENT`) e os asserts de README/CHANGELOG/agente falham.

> Nota: o runner do projeto usa o glob fixo do script `test`. Para rodar só este arquivo, use: `node --test --experimental-strip-types --enable-source-maps --no-warnings 'tests/infra/devops-foundation-adrs.test.ts'`.

- [ ] **Step 4: Registrar W0 RED + commit**

```bash
mkdir -p .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/002-tests
printf '# W0 — RED\n\nTeste estrutural `tests/infra/devops-foundation-adrs.test.ts` falha por inexistência dos ADRs 0034/0035 e por o agente Caddy ainda estar reservado.\n' > .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/002-tests/REPORT.md
pnpm run pipeline:state wave-finish CTR-ADR-DEVOPS-FOUNDATION W0 --outcome RED --report 002-tests/REPORT.md
git add tests/infra/devops-foundation-adrs.test.ts .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/
git commit -m "test(adr): W0 RED para CTR-ADR-DEVOPS-FOUNDATION"
```

---

### Task 0.3: W1 — escrever ADR-0034 (infra de runtime)

**Files:**
- Create: `handbook/architecture/adr/0034-runtime-infra-aws-prod-magalu-qa.md`

- [ ] **Step 1: Marcar início da W1**

```bash
pnpm run pipeline:state wave-start CTR-ADR-DEVOPS-FOUNDATION W1 --agent contratos-orchestrator
```

- [ ] **Step 2: Escrever o ADR-0034**

Create `handbook/architecture/adr/0034-runtime-infra-aws-prod-magalu-qa.md`:
```markdown
[← Voltar para ADRs](./README.md)

# ADR-0034: Infra de runtime — PROD na AWS (EC2 + Compose + RDS + S3), QA na Magalu Cloud (mirror)

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Gabriel Aderaldo + Product Owner
- **Relacionado:** [ADR-0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md) (AWS primary, Magalu PBE), [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) (storage S3/MinIO), [ADR-0026](./0026-mysql-read-write-split-connection.md) (RW split), [ADR-0033](./0033-container-base-image-debian-glibc.md) (imagem glibc multi-arch), [ADR-0013](./0013-mysql-database-engine.md)/[ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (MySQL 8.4), [ADR-0011](./0011-supply-chain-hardening.md) (supply-chain), [ADR-0035](./0035-caddy-edge-reverse-proxy.md) (edge Caddy). **Origem:** `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md`.

---

## Contexto

O frontend v2 (TanStack Start, repo `bem_comum/frontend`) precisa, para lançar a v1, de um **ambiente de QA estável** para validar contra o `core-api` real e de um **prod**. Até aqui não havia runtime provisionado nem caminho de deploy.

O código impõe restrições concretas ao runtime:

- Container **always-on** com um **outbox poller** contínuo (ADR-0015) — descarta serverless de função (cold start, pool, limite de execução).
- **MySQL 8.4 com RW split** (ADR-0026; `readerUrl` ausente reusa o writer single-node).
- **S3** para documentos (ADR-0019); o cliente `@aws-sdk/client-s3` já fala com qualquer endpoint S3-compatível.
- **Fastify** (ADR-0025) precisa de TLS/reverse-proxy na frente.
- Imagem **multi-arch glibc** (ADR-0033), já buildada para amd64 + arm64.

Restrição de negócio: organização sem fins lucrativos, **custo é critério de primeira ordem** (precedente: decisão Bradesco/Windows economizando ~US$ 3.840/ano). O `compose.yaml` já antecipa: *"em produção este compose NÃO sobe — endpoints viram managed services (AWS S3, RDS)"*.

---

## Decisão

Adotar **duas infras gêmeas por container**, diferindo apenas nos endpoints managed:

### PROD — AWS

- **Compute:** 1× EC2 `t4g.small` (ARM/Graviton) rodando **Docker Compose** (mesma topologia do dev) com **Caddy** como edge (ADR-0035).
- **Banco:** **RDS MySQL `db.t4g.micro`** single-AZ, com backups automáticos + PITR (managed). RW split começa single-node (writer=reader); read-replica é evolução sem mexer no app (ADR-0026).
- **Storage:** **S3** para documentos (ADR-0019).
- **Registry:** **ECR** (imagem multi-arch arm64).
- **Deploy keyless:** GitHub Actions via **OIDC** (`id-token: write`) assume uma IAM role de curta duração; o passo de deploy é `compose pull && up -d` via **SSM Run Command** (sem chave AWS nem SSH longa em secret). Secrets de runtime (senha RDS, credenciais S3) no **Secrets Manager**.

### QA — Magalu Cloud (PBE/LGPD)

- **Compute:** VM (computing) rodando **o mesmo Docker Compose** + Caddy.
- **Banco:** **MySQL 8.4 container** + volume (block-storage). QA não exige durabilidade gerenciada.
- **Storage:** **object-storage Magalu** (S3-compatível) — mesmo `@aws-sdk/client-s3`.
- **Deploy:** automático em `push` na `main` (após imagem verde).

### Paridade

Os três ambientes (dev/QA/prod) usam **a mesma imagem multi-arch** e a **mesma topologia** (app + edge + mysql + s3-compat). Só os endpoints de DB/storage mudam para managed em prod. O `Caddyfile` é o mesmo; subdomínios variam por ambiente.

### Caminho de escala (sem refactor do app)

Quando tráfego/HA exigir, trocar EC2 single-instance por **ECS Fargate + ALB** (ALB assume o TLS, Caddy sai ou recua). Os containers permanecem idênticos.

---

## Consequências

### Positivas

- **Front destravado** com QA real e prod econômico.
- **Paridade dev↔QA↔prod** elimina a classe "só quebra em produção".
- **Custo baixo** (~US$ 25–40/mês): `t4g.small` + `db.t4g.micro` single-AZ + S3, sem ALB/NAT caros.
- **Deploy seguro** (OIDC keyless, sem segredo longo).
- **RDS managed** protege o dado da ONG (backups/PITR).

### Negativas

- **EC2 single-instance = SPOF.** Aceito para a v1; o dado está no RDS managed; caminho ECS+ALB desenhado.
- **Operação manual da VM/EC2** (patch do SO). Mitigação: imagem mínima, IaC reprodutível, recriação fácil.
- **Dois provedores** (AWS + Magalu) aumentam a superfície de credenciais. Mitigação: paridade por container + IaC nos dois.

### Neutras

- A escolha não toca `domain`/`application`/`adapters` — é puramente de runtime/infra.
- O `compose.yaml` de dev continua o mesmo; prod/QA derivam dele com overrides de endpoint.

---

## Alternativas Consideradas

### A. ECS Fargate + ALB (AWS)

**Rejeitada (por ora):** o ALB tem custo fixo (~US$ 18/mês só ele) e, com dois deployables (core-api + frontend), o total contraria o critério "mais econômico possível". É o **estado-alvo de escala**, não o de partida.

### B. AWS App Runner

**Rejeitada:** custo de compute por instância maior que EC2 e menos controle (sem sidecar/edge custom); VPC connector para o RDS adiciona complexidade sem ganho na v1.

### C. Lightsail Containers

**Rejeitada:** mais barato, mas troca flexibilidade cloud-native por simplicidade; o caminho de saída para ECS exige re-trabalho de infra. EC2+Compose dá a mesma economia preservando o caminho de escala.

### D. Aurora Serverless v2 / on-box MySQL em prod

**Rejeitadas:** Aurora Serverless tem piso de ACU mais caro que `db.t4g.micro` e é overkill para o tráfego de v1; MySQL no próprio container em prod economiza ~US$ 15/mês mas sacrifica backups/PITR gerenciados — mau negócio para o dado de uma ONG. RDS gerenciado é a escolha (decisão fixada pelo dono).

---

## Quando Re-avaliar

- Tráfego/SLA exigir **HA multi-AZ** → migrar para ECS Fargate + ALB (alternativa A).
- Custo do RDS virar problema → reavaliar instância/replica.
- Magalu deixar de atender requisitos de PBE/LGPD para o QA → reconsiderar o provedor de homologação.

---

## Referências

- [ADR-0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md) — AWS primary, Magalu PBE.
- [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) — storage S3/MinIO (mesmo cliente em QA/prod).
- [ADR-0026](./0026-mysql-read-write-split-connection.md) — RW split (single-node agora).
- [ADR-0033](./0033-container-base-image-debian-glibc.md) — imagem multi-arch glibc.
- [ADR-0035](./0035-caddy-edge-reverse-proxy.md) — Caddy como edge.
- `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md` — épico que originou esta decisão.
```

- [ ] **Step 3: Rodar os testes do D0 (parcial GREEN para 0034)**

Run:
```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings 'tests/infra/devops-foundation-adrs.test.ts'
```
Expected: o teste de ADR-0034 passa; os de 0035/README/CHANGELOG/agente ainda falham.

---

### Task 0.4: W1 — escrever ADR-0035 (edge Caddy)

**Files:**
- Create: `handbook/architecture/adr/0035-caddy-edge-reverse-proxy.md`

- [ ] **Step 1: Escrever o ADR-0035**

Create `handbook/architecture/adr/0035-caddy-edge-reverse-proxy.md`:
```markdown
[← Voltar para ADRs](./README.md)

# ADR-0035: Caddy 2.x como edge / reverse-proxy com HTTPS automático

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Gabriel Aderaldo + Product Owner
- **Relacionado:** [ADR-0034](./0034-runtime-infra-aws-prod-magalu-qa.md) (infra de runtime), [ADR-0025](./0025-http-server-fastify-core-api.md) (HTTP é adapter Fastify), [ADR-0028](./0028-http-edge-shell-location.md) (HTTP de feature em `adapters/http/`), [ADR-0011](./0011-supply-chain-hardening.md) (supply-chain), skill [[web-security-backend]]. **Origem:** `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md`.

---

## Contexto

A infra de runtime (ADR-0034) hospeda **dois deployables Node** — o `core-api` (Fastify) e o `frontend` (TanStack Start, full-stack) — nos ambientes QA e prod. Ambos precisam de **terminação TLS**, **redirect HTTP→HTTPS** e **security headers na borda**, na frente das aplicações.

O agente `caddy-server-expert` estava **reservado** (anti-padrão #11 do `CLAUDE.md`: não ativar agente reservado sem ADR). Sua própria documentação exigia *"um ADR de adoção com justificativa contra alternativas (TLS direto no Fastify, nginx, Traefik, Cloudflare-only, ALB/CloudFront)"*. Este ADR é esse documento.

---

## Decisão

Adotar **Caddy 2.x como edge único** na frente das aplicações, nos ambientes QA e prod (e opcionalmente em dev):

- **HTTPS automático** via ACME (Let's Encrypt/ZeroSSL) — emissão e renovação de certificado sem operação manual.
- **HTTP→HTTPS redirect** (default do Caddy) + **HSTS**.
- **`reverse_proxy`** por host: `api.<dominio> → core-api`, `app.<dominio> → frontend`.
- **Security headers no edge** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) — alinhados à skill `web-security-backend`.
- **`trusted_proxies`** para parsing correto do client IP e proteção contra spoof de `X-Forwarded-For`.
- **`encode zstd gzip`** para compressão.
- **Caddy como serviço no Compose** (mesmo `Caddyfile` em QA/prod; subdomínios por ambiente; volume persistente para os certificados).

Esta decisão **destrava** o agente `caddy-server-expert` (sai de "reservado" para ativo).

---

## Consequências

### Positivas

- **TLS sem operação manual** (ACME) — renovação automática, sem cron de certbot.
- **Edge único e simples** para os dois apps; `Caddyfile` declarativo e curto.
- **Secure-by-default** — HTTPS, HSTS, headers e proteção de proxy na borda, fora do app.
- **Paridade** QA↔prod (mesmo edge), reforçando ADR-0034.

### Negativas

- **Mais um container** no runtime (o edge). Custo desprezível na topologia EC2/VM.
- **ACME depende de DNS público** dos subdomínios e de rate limits do Let's Encrypt. Mitigação: usar o endpoint de **staging** do ACME primeiro; DNS pronto antes do deploy; volume persistente para os certs.

### Neutras

- Quando a infra migrar para ECS Fargate + ALB (ADR-0034, alternativa A), o **ALB** assume a terminação TLS e o Caddy recua/sai — sem impacto no app.

---

## Alternativas Consideradas

### A. TLS direto no Fastify (`node:https`)

**Rejeitada:** joga gestão de certificado (emissão/renovação ACME) para dentro do app; sem o automatismo do Caddy; mistura responsabilidade de borda com a aplicação.

### B. nginx / Traefik

**Rejeitadas:** nginx não tem ACME nativo (precisa de certbot externo); Traefik é capaz mas mais complexo de configurar que o Caddy para este caso. O **Caddy** entrega HTTPS automático com o menor `Caddyfile`.

### C. AWS ALB / CloudFront

**Rejeitada (por ora):** custo fixo do ALB contraria o critério econômico do ADR-0034; é o caminho de escala, não o de partida.

### D. Cloudflare-only (proxy + TLS no provedor)

**Rejeitada:** coloca um terceiro obrigatório no caminho de todo request e acopla a borda a um provedor externo; mantemos a borda sob nosso controle no container.

---

## Quando Re-avaliar

- Migração para **ECS Fargate + ALB** (ADR-0034) → ALB assume o TLS; Caddy sai.
- Necessidade de **WAF/CDN** gerenciado (escala/ataque) → reavaliar CloudFront/Cloudflare na frente.

---

## Referências

- [ADR-0034](./0034-runtime-infra-aws-prod-magalu-qa.md) — infra de runtime que hospeda o edge.
- [ADR-0025](./0025-http-server-fastify-core-api.md) / [ADR-0028](./0028-http-edge-shell-location.md) — Fastify atrás do proxy.
- `.claude/agents/caddy-server-expert.md` — agente destravado por este ADR.
- `handbook/reference/caddy/` — documentação oficial do Caddy (base do agente).
```

- [ ] **Step 2: Rodar os testes (0034+0035 GREEN; restantes ainda RED)**

Run:
```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings 'tests/infra/devops-foundation-adrs.test.ts'
```
Expected: testes de 0034 e 0035 passam; README/CHANGELOG/agente/CLAUDE ainda falham.

---

### Task 0.5: W1 — índice, CHANGELOG e destravar o agente

**Files:**
- Modify: `handbook/architecture/adr/README.md` (após a linha do ADR-0033, ~L128)
- Modify: `handbook/CHANGELOG.md` (topo)
- Modify: `.claude/agents/caddy-server-expert.md` (frontmatter + seção status)
- Modify: `CLAUDE.md:120` (linha do Caddy)

- [ ] **Step 1: Adicionar as 2 linhas no índice de ADRs**

In `handbook/architecture/adr/README.md`, imediatamente após a linha que começa com `| [0033](./0033-container-base-image-debian-glibc.md)`, inserir:
```markdown
| [0034](./0034-runtime-infra-aws-prod-magalu-qa.md)            | Infra de runtime — PROD AWS (EC2+Compose+RDS+S3) / QA Magalu (mirror por container); deploy keyless OIDC                                  | Accepted                              | 2026-06-02 |
| [0035](./0035-caddy-edge-reverse-proxy.md)                    | Caddy 2.x como edge/reverse-proxy com HTTPS automático na frente do core-api e do frontend; destrava o agente reservado                  | Accepted                              | 2026-06-02 |
```

- [ ] **Step 2: Adicionar a entrada no CHANGELOG**

In `handbook/CHANGELOG.md`, logo após a linha `---` que segue o título `# 📜 Changelog do Handbook`, inserir um novo bloco no topo da lista cronológica:
```markdown
## 2026-06-02 — ☁️ ADR-0034 (infra runtime AWS/Magalu) + ADR-0035 (edge Caddy)

> Ticket `CTR-ADR-DEVOPS-FOUNDATION` (épico `EPIC-DEVOPS-FOUNDATION`).

### ADR-0034 — Infra de runtime: PROD AWS / QA Magalu (paridade por container)

PROD na **AWS**: EC2 `t4g.small` (ARM) + Docker Compose + Caddy + **RDS MySQL `db.t4g.micro`** (managed, backups/PITR) + **S3**; deploy **keyless via GitHub OIDC + SSM**. QA na **Magalu Cloud**: VM + Compose + Caddy + MySQL container + object-storage S3-compat. Paridade dev↔QA↔prod pela **mesma imagem multi-arch** (ADR-0033), diferindo só nos endpoints managed. Caminho de escala EC2→ECS Fargate+ALB sem refactor. Rejeitadas: ECS+ALB (custo fixo agora), App Runner, Lightsail, Aurora Serverless, MySQL on-box em prod.

### ADR-0035 — Caddy 2.x como edge / reverse-proxy

Adota o **Caddy** como edge único (TLS automático ACME, HTTP→HTTPS, HSTS, security headers, `trusted_proxies`, `reverse_proxy` `api.*`→core-api e `app.*`→frontend) nos ambientes QA/prod. **Destrava** o agente `caddy-server-expert` (sai de reservado — anti-padrão #11). Rejeitadas: TLS direto no Fastify, nginx/Traefik, ALB/CloudFront, Cloudflare-only.

---
```

- [ ] **Step 3: Destravar o frontmatter do agente Caddy**

In `.claude/agents/caddy-server-expert.md`, no campo `description:` do frontmatter, substituir o trecho inicial:
```
  RESERVED (Fase 2+) — Use proactively when an edge/reverse-proxy layer (Caddy) is
  activated por novo ADR. Until then, return immediately with "este agente é
  reservado, aguardando ADR de adoção do Caddy como edge/reverse-proxy no
  core-api". Trigger keywords (quando ativo):
```
por:
```
  Use proactively for edge/reverse-proxy (Caddy) work. ATIVO desde ADR-0035
  (Caddy como edge do core-api + frontend). Trigger keywords:
```

- [ ] **Step 4: Substituir a seção de status do agente Caddy**

In `.claude/agents/caddy-server-expert.md`, substituir o bloco que vai de `## Status: reservado (não ativo na Fase 1)` até o `---` que o encerra (antes de `## Quem você é`) por:
```markdown
## Status: ativo (desde ADR-0035)

[ADR-0035](../../handbook/architecture/adr/0035-caddy-edge-reverse-proxy.md) adotou o Caddy 2.x como edge/reverse-proxy com HTTPS automático na frente do `core-api` (Fastify) e do `frontend` (TanStack Start), nos ambientes QA (Magalu) e prod (AWS) — ver [ADR-0034](../../handbook/architecture/adr/0034-runtime-infra-aws-prod-magalu-qa.md). Este agente está **ativo** e pareia com [`fastify-server-expert`](./fastify-server-expert.md) (app atrás do proxy), [`docker-compose-expert`](./docker-compose-expert.md) (Caddy como serviço no compose) e a skill [[web-security-backend]] (headers/trusted_proxies).
```

- [ ] **Step 5: Atualizar a linha do Caddy no `CLAUDE.md`**

In `CLAUDE.md:120`, substituir:
```
| Caddy (edge/reverse-proxy — **reservado, Fase 2+, exige ADR**)             | [`caddy-server-expert`](./.claude/agents/caddy-server-expert.md)               |
```
por:
```
| Caddy (edge/reverse-proxy — **ativo** desde ADR-0035)                      | [`caddy-server-expert`](./.claude/agents/caddy-server-expert.md)               |
```

- [ ] **Step 6: Rodar o teste do D0 (tudo GREEN)**

Run:
```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings 'tests/infra/devops-foundation-adrs.test.ts'
```
Expected: PASS — todos os 6 testes verdes.

- [ ] **Step 7: Registrar W1 GREEN + commit**

```bash
mkdir -p .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/003-impl
printf '# W1 — GREEN\n\nADR-0034 e ADR-0035 escritos (Accepted); índice e CHANGELOG atualizados; agente caddy-server-expert e CLAUDE.md destravados. Teste estrutural verde.\n' > .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/003-impl/REPORT.md
pnpm run pipeline:state wave-finish CTR-ADR-DEVOPS-FOUNDATION W1 --outcome GREEN --report 003-impl/REPORT.md
git add handbook/ .claude/agents/caddy-server-expert.md CLAUDE.md .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/
git commit -m "docs(adr): adiciona ADR-0034 (infra runtime) e ADR-0035 (edge Caddy)"
```

---

### Task 0.6: W2 (review) e W3 (gate) do D0

- [ ] **Step 1: W2 — review read-only**

```bash
pnpm run pipeline:state wave-start CTR-ADR-DEVOPS-FOUNDATION W2 --agent code-reviewer
```
Checklist de review (escrever em `.claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/004-code-review/REVIEW.md`):
- ADR-0034/0035 seguem o template do `adr/README.md` §4 (Status, Date, Deciders, Contexto, Decisão, Consequências, Alternativas, Quando Re-avaliar, Referências).
- Nenhum ADR aceito foi editado (só criação) — ADRs são imutáveis.
- Links relativos entre ADRs resolvem.
- Decisões batem com a §10 da spec-mãe.
Veredito: APPROVED.

```bash
mkdir -p .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/004-code-review
# (escrever REVIEW.md com APPROVED conforme acima)
pnpm run pipeline:state wave-finish CTR-ADR-DEVOPS-FOUNDATION W2 --outcome APPROVED --report 004-code-review/REVIEW.md
```

- [ ] **Step 2: W3 — gate de qualidade**

```bash
pnpm run pipeline:state wave-start CTR-ADR-DEVOPS-FOUNDATION W3 --agent ts-quality-checker
pnpm run typecheck
pnpm run format:check
pnpm run lint
pnpm test
```
Expected: todos verdes (o teste novo `devops-foundation-adrs.test.ts` entra no `pnpm test`). Se `format:check` reclamar do novo `.ts`/`.md`, rodar `pnpm run format` e re-commitar.

```bash
mkdir -p .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/005-quality
printf '# W3 — GREEN\n\ntypecheck + format:check + lint + test todos verdes.\n' > .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/005-quality/REPORT.md
pnpm run pipeline:state wave-finish CTR-ADR-DEVOPS-FOUNDATION W3 --outcome GREEN --report 005-quality/REPORT.md
pnpm run pipeline:state close CTR-ADR-DEVOPS-FOUNDATION
git add .claude/.pipeline/CTR-ADR-DEVOPS-FOUNDATION/
git commit -m "chore(pipeline): fecha CTR-ADR-DEVOPS-FOUNDATION (D0 closed-green)"
```

---

## TICKET D1 — `CTR-CI-HARDENING`

Endurece `.github/workflows/test-and-quality.yml`. Size S. **Depende de:** nada (independente do D0).

### Task 1.1: Scaffold do ticket

- [ ] **Step 1: Inicializar o ticket**

```bash
pnpm run pipeline:state init CTR-CI-HARDENING --size S
```

- [ ] **Step 2: Escrever o `000-request.md`**

Create `.claude/.pipeline/CTR-CI-HARDENING/000-request.md`:
```markdown
# CTR-CI-HARDENING — endurecer o CI de qualidade

> **Size:** S · **Origem:** `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md` §11 (D1), CA1.

## Escopo

Endurecer `.github/workflows/test-and-quality.yml`:
1. Bloco `permissions: contents: read` no topo (least-privilege).
2. Pin de **todas** as actions por **SHA** de 40 chars (comentário `# vX.Y.Z` ao lado).
3. `concurrency` com `cancel-in-progress: true` (PRs não empilham).
4. Job/step de `actionlint` validando os workflows.
5. Preservar a ordem dos gates: `typecheck → format:check → lint → audit → test`.

## Critérios de Aceite

- [ ] CA1 — `permissions: contents: read` presente antes de `jobs:`.
- [ ] CA2 — todo `uses:` de action remota pinado por SHA de 40 hex + comentário de versão.
- [ ] CA3 — `concurrency` com `cancel-in-progress: true`.
- [ ] CA4 — `actionlint` roda no CI (action pinada por SHA).
- [ ] CA5 — teste `tests/infra/ci-workflow-hardening.test.ts` verde.
- [ ] CA6 — gates W3 verdes localmente.

## Fora de escopo

- Integração no CI (D2), imagem (D3), deploy (D7).
```

- [ ] **Step 3: Commit do scaffold**

```bash
git add .claude/.pipeline/CTR-CI-HARDENING/
git commit -m "chore(pipeline): abre CTR-CI-HARDENING (D1)"
```

---

### Task 1.2: W0 — teste de hardening RED

**Files:**
- Create: `tests/infra/ci-workflow-hardening.test.ts`

- [ ] **Step 1: Marcar início da W0**

```bash
pnpm run pipeline:state wave-start CTR-CI-HARDENING W0 --agent tdd-strategist
```

- [ ] **Step 2: Escrever o teste RED**

Create `tests/infra/ci-workflow-hardening.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const wfUrl = new URL('../../.github/workflows/test-and-quality.yml', import.meta.url);
const load = (): Promise<string> => readFile(wfUrl, 'utf8');

test('declara permissions mínimas (contents: read) antes de jobs', async () => {
  const wf = await load();
  const permIdx = wf.indexOf('\npermissions:');
  const jobsIdx = wf.indexOf('\njobs:');
  assert.ok(permIdx !== -1, 'falta bloco permissions:');
  assert.ok(jobsIdx !== -1, 'falta bloco jobs:');
  assert.ok(permIdx < jobsIdx, 'permissions deve vir antes de jobs');
  assert.match(wf.slice(permIdx, jobsIdx), /contents:\s*read/);
});

test('todas as actions remotas estão pinadas por SHA de 40 hex', async () => {
  const wf = await load();
  const usesLines = wf.split('\n').filter((l) => /^\s*-?\s*uses:\s*/.test(l));
  assert.ok(usesLines.length > 0, 'esperava ao menos um uses:');
  for (const line of usesLines) {
    const ref = line.replace(/^\s*-?\s*uses:\s*/, '').trim();
    if (ref.startsWith('./') || ref.startsWith('docker://')) continue; // local/docker
    assert.match(
      ref,
      /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}(\s+#.*)?$/,
      `action não pinada por SHA: ${ref}`,
    );
  }
});

test('tem concurrency com cancel-in-progress: true', async () => {
  const wf = await load();
  const cIdx = wf.indexOf('\nconcurrency:');
  assert.ok(cIdx !== -1, 'falta bloco concurrency:');
  assert.match(wf.slice(cIdx, cIdx + 200), /cancel-in-progress:\s*true/);
});

test('roda actionlint no CI', async () => {
  const wf = await load();
  assert.match(wf, /actionlint/i);
});

test('preserva a ordem dos gates de qualidade', async () => {
  const wf = await load();
  const order = ['typecheck', 'format:check', 'lint', 'audit', 'test'].map((g) =>
    wf.indexOf(`pnpm run ${g}`) === -1 ? wf.indexOf(`pnpm ${g}`) : wf.indexOf(`pnpm run ${g}`),
  );
  for (const idx of order) assert.ok(idx !== -1, 'gate ausente');
  const sorted = [...order].sort((a, b) => a - b);
  assert.deepEqual(order, sorted, 'gates fora de ordem');
});
```

- [ ] **Step 3: Rodar e confirmar RED**

Run:
```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings 'tests/infra/ci-workflow-hardening.test.ts'
```
Expected: FAIL — o workflow atual não tem `permissions`, usa `@v4` (não SHA), não tem `concurrency` nem `actionlint`.

- [ ] **Step 4: Registrar W0 RED + commit**

```bash
mkdir -p .claude/.pipeline/CTR-CI-HARDENING/002-tests
printf '# W0 — RED\n\n`tests/infra/ci-workflow-hardening.test.ts` falha: workflow sem permissions, sem SHA pins, sem concurrency, sem actionlint.\n' > .claude/.pipeline/CTR-CI-HARDENING/002-tests/REPORT.md
pnpm run pipeline:state wave-finish CTR-CI-HARDENING W0 --outcome RED --report 002-tests/REPORT.md
git add tests/infra/ci-workflow-hardening.test.ts .claude/.pipeline/CTR-CI-HARDENING/
git commit -m "test(ci): W0 RED para CTR-CI-HARDENING"
```

---

### Task 1.3: W1 — resolver SHAs e endurecer o workflow

**Files:**
- Modify: `.github/workflows/test-and-quality.yml`

- [ ] **Step 1: Marcar início da W1**

```bash
pnpm run pipeline:state wave-start CTR-CI-HARDENING W1 --agent github-actions-expert
```

- [ ] **Step 2: Resolver os SHAs das actions (não inventar)**

Run (requer `gh` autenticado — já está, gh 2.86):
```bash
gh api repos/actions/checkout/commits/v4.2.2 --jq .sha
gh api repos/actions/setup-node/commits/v4.1.0 --jq .sha
gh api repos/actions/cache/commits/v4.2.0 --jq .sha
gh api repos/reviewdog/action-actionlint/commits/v1.65.2 --jq .sha
```
Anotar cada SHA de 40 hex retornado. Se uma versão tiver sido aposentada, listar as tags disponíveis com `gh api repos/<owner>/<repo>/tags --jq '.[].name' | head` e escolher a release estável mais recente daquela major.

- [ ] **Step 3: Reescrever o workflow endurecido**

Replace the entire content of `.github/workflows/test-and-quality.yml` with (substituindo `<SHA_*>` pelos SHAs resolvidos no Step 2 — cada um com o comentário de versão ao lado):
```yaml
name: Test and Quality

# Disparado em push na main e pull requests contra main.
# Hardening (CTR-CI-HARDENING / ADR-0011): permissions mínimas, actions pinadas
# por SHA, concurrency cancel-in-progress, actionlint. Ver
# handbook/reference/pnpm/continuous-integration.md.
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Least-privilege: o GITHUB_TOKEN só lê o conteúdo do repo.
permissions:
  contents: read

# PRs não empilham runs: um novo push cancela o anterior do mesmo ref.
concurrency:
  group: test-and-quality-${{ github.ref }}
  cancel-in-progress: true

jobs:
  actionlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA_CHECKOUT> # v4.2.2
      - name: actionlint
        uses: reviewdog/action-actionlint@<SHA_ACTIONLINT> # v1.65.2
        with:
          reporter: github-check

  test-and-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA_CHECKOUT> # v4.2.2

      - name: Setup Node 24 e corepack
        uses: actions/setup-node@<SHA_SETUP_NODE> # v4.1.0
        with:
          node-version: '24'
      - run: corepack enable

      - name: Cache pnpm store
        uses: actions/cache@<SHA_CACHE> # v4.2.0
        with:
          path: |
            ~/.pnpm-store
            ${{ env.PNPM_HOME }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-

      - name: Instala dependências (frozen lockfile)
        run: pnpm install --frozen-lockfile

      - run: pnpm run typecheck
      - run: pnpm run format:check
      - run: pnpm run lint
      - run: pnpm run audit
      - run: pnpm test
```

> Hardening pleno do ADR-0011 pede SHA; o comentário `# vX.Y.Z` preserva a legibilidade. **Nunca** `@latest`/`@main`.

- [ ] **Step 4: Rodar o teste de hardening (GREEN)**

Run:
```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings 'tests/infra/ci-workflow-hardening.test.ts'
```
Expected: PASS — os 5 testes verdes.

- [ ] **Step 5: Registrar W1 GREEN + commit**

```bash
mkdir -p .claude/.pipeline/CTR-CI-HARDENING/003-impl
printf '# W1 — GREEN\n\nWorkflow endurecido: permissions contents:read, actions pinadas por SHA, concurrency cancel-in-progress, job actionlint. Teste verde.\n' > .claude/.pipeline/CTR-CI-HARDENING/003-impl/REPORT.md
pnpm run pipeline:state wave-finish CTR-CI-HARDENING W1 --outcome GREEN --report 003-impl/REPORT.md
git add .github/workflows/test-and-quality.yml .claude/.pipeline/CTR-CI-HARDENING/
git commit -m "ci(hardening): permissions, SHA pins, concurrency e actionlint no test-and-quality"
```

---

### Task 1.4: W2 (review) e W3 (gate) do D1

- [ ] **Step 1: W2 — review**

```bash
pnpm run pipeline:state wave-start CTR-CI-HARDENING W2 --agent code-reviewer
```
Checklist (escrever em `.claude/.pipeline/CTR-CI-HARDENING/004-code-review/REVIEW.md`):
- Nenhum `uses:` em `@latest`/`@main`/tag-só; todos por SHA de 40 hex com comentário de versão.
- `permissions` mínimas (`contents: read`) no topo; nenhum job eleva sem necessidade.
- `concurrency.group` usa `${{ github.ref }}`; `cancel-in-progress: true`.
- Ordem dos gates preservada; `pnpm`, nunca `npm`.
- `actionlint` com `reporter: github-check`.
Veredito: APPROVED.

```bash
mkdir -p .claude/.pipeline/CTR-CI-HARDENING/004-code-review
# (escrever REVIEW.md com APPROVED)
pnpm run pipeline:state wave-finish CTR-CI-HARDENING W2 --outcome APPROVED --report 004-code-review/REVIEW.md
```

- [ ] **Step 2: W3 — gate**

```bash
pnpm run pipeline:state wave-start CTR-CI-HARDENING W3 --agent ts-quality-checker
pnpm run typecheck
pnpm run format:check
pnpm run lint
pnpm test
```
Expected: verdes (inclui o novo teste de hardening). Se houver `actionlint` disponível localmente, rodar também; senão ele roda no CI.

```bash
mkdir -p .claude/.pipeline/CTR-CI-HARDENING/005-quality
printf '# W3 — GREEN\n\ntypecheck + format:check + lint + test verdes.\n' > .claude/.pipeline/CTR-CI-HARDENING/005-quality/REPORT.md
pnpm run pipeline:state wave-finish CTR-CI-HARDENING W3 --outcome GREEN --report 005-quality/REPORT.md
pnpm run pipeline:state close CTR-CI-HARDENING
git add .claude/.pipeline/CTR-CI-HARDENING/
git commit -m "chore(pipeline): fecha CTR-CI-HARDENING (D1 closed-green)"
```

---

## Self-Review (preenchido pelo autor do plano)

**Spec coverage (EPIC-DEVOPS-FOUNDATION §11):**
- D0 (ADR-0034 + ADR-0035) → Tasks 0.1–0.6 ✅
- D1 (CTR-CI-HARDENING: permissions, SHA, concurrency, actionlint) → Tasks 1.1–1.4 ✅ (CA1)
- D2–D7 → fora deste plano (próximos planos), conforme handoff combinado.

**Placeholder scan:** os `<SHA_*>` no Step 1.3.3 **não** são placeholders de plano — são valores resolvidos por comando determinístico no Step 1.3.2 (hardcodar um SHA inventado seria incorreto). Todo o resto tem conteúdo real.

**Type/consistency:** nomes de arquivo de teste (`devops-foundation-adrs.test.ts`, `ci-workflow-hardening.test.ts`), paths de ADR (`0034-runtime-infra-aws-prod-magalu-qa.md`, `0035-caddy-edge-reverse-proxy.md`) e tickets (`CTR-ADR-DEVOPS-FOUNDATION`, `CTR-CI-HARDENING`) usados de forma idêntica em todas as tasks. Comandos de pipeline conferidos contra os scripts reais do `package.json`.

**Nota de execução:** D0 e D1 são independentes — podem rodar em paralelo (subagentes distintos). O teste do D0 lê `.claude/`, `handbook/` e `CLAUDE.md`; o do D1 lê `.github/`. Sem sobreposição de arquivos.
```
