# SPEC — DevOps Foundation: CI hardened + CD multi-ambiente (`EPIC-DEVOPS-FOUNDATION`)

> **Tipo:** épico (1º sub-projeto do Programa v1) · **Size:** L (fatiado em §11) · **Status da spec:** em-revisão
> **Data:** 2026-06-02
> **Origem:** pedido do dono (Gabriel) — "revisar todo o código, lançar o que o front precisa pra v1, e estrear o agente de GitHub Actions pra CI/CD".
> **Agente estreante:** [`github-actions-expert`](../agents/github-actions-expert.md) (ancorado em `handbook/reference/github-actions/` + ADR-0011).
> **ADRs tocados:** `ADR-0011`/`ADR-0029` (supply-chain; pnpm), `ADR-0009` (Node 24), `ADR-0013`/`ADR-0020` (MySQL 8.4), `ADR-0019` (storage S3/MinIO), `ADR-0021` (AWS primary, Magalu PBE), `ADR-0026` (RW split), `ADR-0033` (imagem Debian glibc). **ADRs novos que este épico cria:** `ADR-0034` (infra de runtime AWS prod / Magalu QA) e `ADR-0035` (adoção do Caddy como edge).

---

## 0. Contexto do Programa v1 (o quadro maior)

O pedido do dono se decompõe em **3 workstreams independentes**. Esta spec detalha **apenas o WS-C (DevOps Foundation)** — o primeiro a executar. Os demais ganham épicos próprios quando chegar a vez.

| WS | Escopo | Forma de execução |
| :-- | :-- | :-- |
| **A — Review/qualidade** | Legibilidade ("código bonito e legível"), performance ("escovar bits"), segurança — sobre TODO o código existente | (1) Uma **auditoria multi-agente read-only** inicial → backlog priorizado em `.claude/.planning/`; (2) correções **dobradas em cada módulo** que o WS-B tocar (decisão do dono) |
| **B — Port v1 do front** | Portar **tudo que não é Financeiro nem Contratos**: Parceiros, Usuários, Programas, Orçamento, Relatórios, Estatísticas, Arquivos (escopo do `handbook/legacy_docs/openapi.yaml` — 114 rotas, 30 tabelas). Contratos fecha só os gaps abertos (F2/F3/contractor). | Cada módulo = épico próprio (spec→tickets→W0→W3), no DDD/hexagonal do core-api (ADR-0006) — **não** port 1:1 do NestJS/TypeORM. Ordem por proximidade: **Contratos(gaps) → Parceiros(borda HTTP) → Usuários → Programas → Orçamento → Relatórios/Estatísticas/Arquivos** |
| **C — DevOps Foundation** | CI hardened + integração no CI + imagem multi-arch + **3 ambientes paritários** (dev/QA/prod) + CD keyless + edge Caddy | **Esta spec.** Roda primeiro pra que todo módulo seguinte nasça protegido e deployável |

**Por que DevOps primeiro:** confirmado pelo dono. Todo módulo portado depois herda CI verde + deploy automático. É a fundação que paga juros compostos.

---

## 1. Problema & contexto (o PORQUÊ)

O CI hoje (`.github/workflows/test-and-quality.yml`, entregue em `CTR-DEVOPS-HARDENING`) roda `typecheck → format:check → lint → audit → test`, mas tem buracos:

- **Sem bloco `permissions:`** — viola least-privilege (anti-padrão #3 do `github-actions-expert`); o `GITHUB_TOKEN` herda escopo amplo por default.
- **Actions pinadas só por major tag** (`@v4`), não por **SHA** — hardening pleno do ADR-0011 pede SHA.
- **Nenhum job de integração** — existe suíte gated (`MYSQL_INTEGRATION=1`, `COMPOSE_INTEGRATION=1`) que o CI **não executa** → risco documentado de **falso-verde** (memória `project_test_integration_auth_gap` / `project_mysql_compose_skipguard_gap`).
- **Sem `concurrency`** — PRs empilham runs e queimam minutos.
- **Nenhum build/validação da imagem Docker** no CI, apesar de o `Dockerfile` (multi-stage, multi-arch, glibc — ADR-0033) e o `compose.yaml` existirem.
- **Nenhum CD** — não há caminho automatizado de deploy; não há ambiente de QA pro front testar; não há prod.

O front v2 (TanStack Start, repo `bem_comum/frontend`) precisa, pra lançar, de um **ambiente de QA estável** onde validar contra o core-api real, e de um **prod**. Ambos devem ser **o mais parecidos possível** (paridade via container) para "funciona no QA = funciona no prod".

---

## 2. User stories

- Como **dono/operador de CI**, quero que todo PR rode os gates de qualidade **e** os testes de integração reais (MySQL/MinIO), pra que "verde no CI" signifique de verdade verde — sem falso-verde.
- Como **engenheiro**, quero que o CI seja **seguro por default** (permissões mínimas, actions pinadas por SHA), pra reduzir superfície de supply-chain (ADR-0011).
- Como **QA**, quero um **ambiente de homologação na Magalu Cloud** rodando a mesma imagem de container do prod, pra testar o sistema de boas antes de cada release.
- Como **dono**, quero um **prod na AWS econômico mas sério** (backups, TLS), com **deploy automatizado e seguro** (sem chave longa em secret), pra lançar a v1 sem operar deploy na mão.
- Como **time**, quero **paridade dev↔QA↔prod** via a mesma imagem + Caddy como edge único, pra eliminar a classe de bug "só quebra em produção".

---

## 3. Critérios de aceitação (alto nível — cada fatia detalha)

- **CA1 — CI hardened:** `test-and-quality.yml` declara `permissions: contents: read` no topo; todas as actions pinadas por **SHA** (comentário com a versão legível ao lado); `concurrency` com `cancel-in-progress: true` em PR; `actionlint` valida os YAML no próprio CI. Ordem dos gates preservada (`typecheck → format:check → lint → audit → test`).
- **CA2 — Integração no CI:** um job sobe **MySQL 8.4 + MinIO** (service containers ou compose CI) e roda as suítes gated **verdes** (`pnpm run test:integration` família, com `MYSQL_INTEGRATION=1`/`COMPOSE_INTEGRATION=1` e `MYSQL_PORT` configurável — ver `CTR-TEST-MYSQL-PORT-CONFIGURABLE`). Falha de integração **reprova** o PR.
- **CA3 — Imagem multi-arch:** job builda a imagem (multi-stage, `Dockerfile` atual) para **linux/arm64** (e amd64 se barato), publica no **ECR** com tag por `git sha` + `branch`, e faz **smoke** (container sobe, healthcheck passa). Pin/digest preservados (ADR-0011).
- **CA4 — Edge Caddy:** Caddy roda como container de borda nos ambientes QA e prod, com **TLS automático** (ACME/Let's Encrypt) e reverse-proxy `api.<dominio> → core-api`, `app.<dominio> → frontend`. `trusted_proxies` e security headers conforme `web-security-backend`. **Coberto por ADR-0035.**
- **CA5 — Ambiente QA (Magalu):** uma VM Magalu roda `compose` (mesma imagem do ECR) + Caddy + MySQL (container) + object-storage Magalu (S3-compat) como storage de documentos. `main` verde → deploy automático em QA.
- **CA6 — Ambiente prod (AWS):** EC2 `t4g.small` (ARM/Graviton) roda `compose` (mesma imagem) + Caddy + **RDS MySQL `db.t4g.micro`** (managed, backups + PITR) + **S3** pra documentos. Deploy de prod exige **aprovação manual** (`environment` protection rule). **Coberto por ADR-0034.**
- **CA7 — CD keyless (OIDC):** deploy não usa chave AWS de longa duração nem senha SSH em secret — usa **GitHub OIDC** (`id-token: write`) → role AWS de curta duração; o passo de deploy é `compose pull && up -d` via **SSM Run Command** (AWS) e mecanismo equivalente na Magalu. Secrets de runtime (senha DB, creds S3) vêm do Secrets Manager / mecanismo Magalu, nunca do repo.
- **CA8 — Paridade:** dev (`compose.yaml`), QA e prod usam a **mesma imagem de container** e a **mesma topologia** (app + edge + mysql-compat + s3-compat); só os *endpoints* de DB/storage mudam (managed em prod). Diferenças documentadas num único lugar.
- **CA9 — IaC reprodutível:** AWS prod e Magalu QA são provisionados por **Terraform/OpenTofu** (`infra/`), de forma que recriar/clonar um ambiente seja determinístico. *(Lever de escopo — ver §4/§Clarificações; se adiado, vira runbook manual + ticket de IaC futuro.)*

---

## 4. Não-objetivos / fora de escopo

- **Portar módulos (WS-B)** — épicos próprios; esta spec só entrega a fundação DevOps.
- **Review global do código (WS-A)** — a auditoria multi-agente inicial é lançada em paralelo como atividade própria; correções entram por módulo.
- **CI/CD do repo `frontend`** — o frontend tem seu próprio pipeline (espelha este). Aqui só garantimos que a infra/edge **hospeda** o frontend; o workflow do front é trabalho do repo dele.
- **Auto-scaling / HA multi-AZ** — v1 é single-instance econômica; o caminho de escala (EC2→ECS Fargate+ALB) fica desenhado no ADR-0034, não implementado.
- **Aurora / read-replica** — começa single-node (writer=reader, fallback do ADR-0026); replica é evolução futura.
- **Observabilidade avançada** (APM, tracing distribuído, dashboards) — fora; logs estruturados + healthcheck bastam pra v1.
- **Migração de DNS/registrar** — assume-se domínio já disponível; só apontamos os subdomínios.

---

## 5. Clarificações (Q&A resolvidas no brainstorming, 2026-06-02)

- **Q:** Escopo da v1 do front? · **R:** Portar tudo que **não** é Financeiro nem Contratos (escopo do `legacy_docs`); Contratos fecha gaps; Financeiro é fase própria.
- **Q:** Por onde começar? · **R:** **CI/CD primeiro**; review dobrado em cada módulo; depois portar na ordem de proximidade.
- **Q:** O que entra na 1ª leva de CI/CD? · **R:** **Tudo** — hardening + integração + build/push de imagem + CD real ("tudo que tiver direito").
- **Q:** Alvo de prod? · **R:** **AWS**, "a melhor infra segundo o código" + "o mais econômico possível".
- **Q:** Arquitetura AWS? · **R:** Recusado ECS/ALB por custo fixo; escolhido **EC2 `t4g.small` ARM + Compose + Caddy + RDS + S3**; escala pra ECS depois sem refactor.
- **Q:** Banco em prod? · **R:** **Opção 1 — RDS `db.t4g.micro`** (managed, backups/PITR). Anotado como definitivo pra prod.
- **Q:** QA? · **R:** **Magalu Cloud**, ambiente que o QA testa de boas, **o mais parecido possível com o prod via containers**.
- **Q:** Caddy? · **R:** Adotado como edge único (destrava o `caddy-server-expert` reservado) — gera ADR-0035.
- **Q:** Provisionamento? · **R:** Recomendado **IaC (Terraform/OpenTofu)** pra paridade AWS↔Magalu; é lever de escopo (pode degradar pra runbook manual + ticket de IaC se o dono preferir economia de esforço agora). *Default desta spec: IaC.*

---

## 6. Plano técnico de alto nível (o COMO — sem código)

### 6.1. Topologia paritária (dev → QA → prod)

```
              IMAGEM ÚNICA multi-arch (arm64) — buildada 1x no CI, publicada no ECR
                                     │
   ┌─────────────────────┬──────────┴───────────────┬──────────────────────────┐
   ▼                     ▼                            ▼
 DEV (local)          Q.A — Magalu Cloud           PROD — AWS
 compose.yaml         VM (computing) + Compose      EC2 t4g.small ARM + Compose
 MinIO + MySQL        Caddy (edge, TLS)             Caddy (edge, TLS)
 (já existe)          MySQL container + EBS-like    RDS MySQL db.t4g.micro (managed)
                      Object Storage Magalu (S3)    S3 (documentos)
                      deploy: push main → auto      deploy: manual approval (env)
```

Edge **Caddy** idêntico nos 3 (em dev, opcional). App e mysql-compat e s3-compat idênticos; só os endpoints managed mudam em prod (S3 real, RDS real) — exatamente o que o cabeçalho do `compose.yaml` já antecipa.

### 6.2. Workflows GitHub Actions (estreia do `github-actions-expert`)

- **`test-and-quality.yml`** (endurecido): `permissions: contents: read`; actions por SHA; `concurrency`; `actionlint`; gates na ordem do W3.
- **`integration.yml`** (novo): service containers MySQL 8.4 + MinIO; roda `test:integration` família verde; `MYSQL_PORT`/flags de gate setadas.
- **`image.yml`** (novo, `workflow_call` reusável): `docker/build-push-action` multi-arch (arm64) → ECR via OIDC; tag `sha`/`branch`; smoke (sobe container + healthcheck).
- **`deploy-qa.yml`** (novo): em `push` na `main`, após image verde → SSM/agente Magalu `compose pull && up -d`. `environment: qa`.
- **`deploy-prod.yml`** (novo): `workflow_dispatch` ou tag de release; `environment: production` com **protection rule** (aprovação manual) → SSM `compose pull && up -d` na EC2.
- Reuso via `workflow_call` (`_quality.yml`, `image.yml`) pra não duplicar setup.

### 6.3. Infra como código (`infra/`, Terraform/OpenTofu)

- **AWS:** VPC mínima, EC2 `t4g.small` (ARM), Security Groups, RDS `db.t4g.micro` (single-AZ, backup on), bucket S3, ECR repo, **OIDC provider + IAM role** (trust no repo GitHub, least-privilege: ECR push + SSM + deploy), Secrets Manager (senha RDS, creds S3).
- **Magalu:** VM (computing), block-storage (volume), object-storage bucket (S3-compat), regras de rede/LBaaS se necessário, credenciais via mecanismo Magalu.
- **Caddyfile** versionado (security headers, `trusted_proxies`, `encode zstd gzip`, automatic HTTPS) — mesmo arquivo nos dois ambientes, subdomínios por ambiente.

### 6.4. Segurança (WS-A no próprio DevOps)

- OIDC keyless (sem chave longa); `permissions` mínimas; secrets só em Secrets Manager / Magalu, nunca no repo (alinha `.dockerignore`/`secrets/*.txt` já existentes).
- Caddy com security headers + HSTS + `trusted_proxies` (evita spoof de `X-Forwarded-For`) — `web-security-backend` / `caddy-server-expert`.
- Imagem non-root, `tini` PID 1, `no-new-privileges` (já no Dockerfile/compose).
- `actionlint` + pin por SHA + `pnpm audit` no CI.

---

## 7. Constitution check (aderência aos ADRs/regras)

| Fonte | Exigência | Como a spec adere |
| :-- | :-- | :-- |
| `ADR-0011`/`ADR-0029` | supply-chain: corepack, frozen-lockfile, pin, approve-builds | CI usa corepack + `--frozen-lockfile`; actions por SHA; imagem com digest pin; `pnpm audit` no gate |
| `ADR-0009` | Node 24 LTS | `setup-node@... node-version: '24'` em todos os jobs; imagem `node:24.16` |
| `ADR-0013`/`ADR-0020` | MySQL 8.4 único | service container `mysql:8.4`; RDS MySQL 8.4; QA MySQL container 8.4 |
| `ADR-0019` | storage S3/MinIO; `@aws-sdk/client-s3` único | dev MinIO; QA object-storage Magalu (S3-compat); prod S3 — mesmo cliente |
| `ADR-0021` | AWS primary, Magalu PBE | prod AWS; QA Magalu — exatamente a divisão do ADR |
| `ADR-0026` | RW split; `readerUrl` ausente reusa writer | RDS single-node agora (writer=reader); replica futura sem mexer no app |
| `ADR-0033` | imagem Debian glibc, multi-arch | build arm64 a partir do `node:24.16-bookworm-slim` glibc atual |
| `CLAUDE.md` / regras | nunca npm; pipeline W0→W3; docs PT | tudo pnpm; cada fatia roda W0→W3; spec/ADRs em PT |
| **novo** `ADR-0034` | onde a app roda em prod/QA | esta spec o cria (alvo do CD) |
| **novo** `ADR-0035` | edge/reverse-proxy | adoção do Caddy; destrava `caddy-server-expert` |

---

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| Integração no CI ficar **flaky** (MySQL não-pronto) | média | reusar o healthcheck robusto do `compose.yaml` (login TCP real, não `mysqladmin ping`); `compose up --wait`; `MYSQL_PORT` configurável (ticket já entregue) |
| `@typescript/native-preview` (tsgo) em **arm64** | média | é glibc-only mas publica arm64; validar no job de build arm64 antes de confiar; fallback amd64 se necessário |
| Custo AWS estourar o "econômico" | média | `t4g.small` + `db.t4g.micro` single-AZ + S3; sem ALB/NAT caros; budget alarm no Terraform; Fargate Spot só se migrar |
| EC2 single-instance = SPOF | baixa (v1) | aceito pra v1; RDS managed protege o dado; caminho ECS+ALB desenhado no ADR-0034 |
| OIDC/IAM mal configurado vazar permissão | alta | role least-privilege (só ECR+SSM+deploy do recurso específico); revisão `security-backend-expert`; sem `write-all` |
| Caddy ACME falhar (rate limit / DNS) | média | staging ACME primeiro; DNS dos subdomínios pronto antes; volume persistente pros certs |
| Paridade AWS↔Magalu divergir | média | mesma imagem + mesmo Caddyfile + Terraform pros dois; diferenças só nos endpoints managed, documentadas |
| Secret em log/repo | alta | OIDC keyless; Secrets Manager/Magalu; `.dockerignore`+`secrets/` já cobrem; masking no Actions |

---

## 9. Definition of Done (épico)

- [ ] CA1–CA9 cobertos por teste/validação em cada fatia e verdes.
- [ ] `test-and-quality.yml` hardened (permissions, SHA, concurrency, actionlint).
- [ ] Job de integração rodando suítes gated **verdes** no CI (fim do falso-verde).
- [ ] Imagem multi-arch publicada no ECR com smoke.
- [ ] QA na Magalu no ar, deploy automático na `main`, front consegue testar.
- [ ] Prod na AWS no ar (EC2+Caddy+RDS+S3), deploy com aprovação manual via OIDC.
- [ ] Caddy como edge nos dois, TLS automático verde.
- [ ] `ADR-0034` e `ADR-0035` escritos, `Accepted`, registrados no `handbook/CHANGELOG.md`.
- [ ] IaC (`infra/`) aplica AWS+Magalu de forma reprodutível (ou runbook manual + ticket de IaC, se adiado).
- [ ] Paridade dev↔QA↔prod documentada num só lugar.

---

## 10. Decisões fixadas (definitivas, do dono)

1. **PROD = AWS**, banco **RDS `db.t4g.micro`** (managed) — **definitivo**.
2. **QA = Magalu Cloud**, espelho do prod via container.
3. **DevOps primeiro**, depois portar por módulo (review dobrado em cada um).
4. **Caddy** é o edge único (vira ADR).
5. **v1 do front** = portar tudo exceto Financeiro e Contratos.

---

## 11. Fatiamento em tickets (ordem por dependência)

| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| D0 | `ADR-0034-infra-runtime` + `ADR-0035-edge-caddy` | S | Os 2 ADRs escritos e Accepted (decisões já fixadas em §10) | — |
| D1 | `CTR-CI-HARDENING` | S | `permissions`, pin SHA, `concurrency`, `actionlint` no `test-and-quality.yml` | — |
| D2 | `CTR-CI-INTEGRATION-JOB` | M | job de integração (MySQL+MinIO service) rodando suítes gated verdes | D1 |
| D3 | `CTR-CD-IMAGE-ECR` | M | workflow reusável build multi-arch → ECR (OIDC) + smoke | D0, D1 |
| D4 | `CTR-EDGE-CADDY` | M | Caddyfile versionado (TLS auto, reverse-proxy, security headers, trusted_proxies) | D0 |
| D5 | `CTR-INFRA-AWS-PROD` | L | Terraform AWS: VPC/EC2/RDS/S3/ECR/OIDC-role/SecretsManager | D0 |
| D6 | `CTR-INFRA-MAGALU-QA` | L | Terraform/IaC Magalu: VM/volume/object-storage/rede (mirror) | D0 |
| D7 | `CTR-CD-DEPLOY-OIDC` | M | `deploy-qa.yml` (auto na main) + `deploy-prod.yml` (approval) via SSM/agente | D3, D4, D5, D6 |

**Caminho crítico:** D0 → (D1→D2, D3, D4, D5, D6 em paralelo onde possível) → D7. Cada fatia abre `001-spec/SPEC.md` derivada desta e roda W0→W3.

---

## Recursos por fatia (agentes · skills)

- **Transversais:** `contratos-orchestrator` + `pipeline-maestro`; waves `tdd-strategist` (W0) · `code-reviewer` (W2) · `ts-quality-checker` (W3).
- **D0:** dono + redação de ADR (formato `handbook/architecture/adr/`).
- **D1/D2/D3/D7:** **`github-actions-expert`** (estreia) — workflows, OIDC, cache, matrix, reusable.
- **D2:** `docker-compose-expert` (service containers / compose CI) · `mysql2-driver-expert` (conexão de integração).
- **D3:** `docker-compose-expert` (build multi-arch, BuildKit) · `pnpm-workspace-expert` (frozen-lockfile/corepack no build).
- **D4:** **`caddy-server-expert`** (destravado pelo ADR-0035) · `security-backend-expert` (headers/trusted_proxies).
- **D5/D6:** IaC (Terraform/OpenTofu) · `security-backend-expert` (IAM least-privilege, secrets) · `docker-compose-expert` (topologia de runtime).

---

*Spec derivada do brainstorming de 2026-06-02. Próximo passo: `writing-plans` para o plano de implementação (começando por D0 + D1).*
