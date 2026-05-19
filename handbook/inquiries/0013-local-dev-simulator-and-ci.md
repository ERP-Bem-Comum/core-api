# Inquiry-0013: Simulador local da cloud (offline) + integração CI/CD

- **Status:** Decided (implementação pendente)
- **Opened:** 2026-05-13
- **Closed/Decided:** 2026-05-13
- **Opened by:** Gabriel Aderaldo
- **Asked to:** IA externa (Claude Code)
- **Impact:** decisão operacional (DevEx) + base para futuro ADR de pipeline CI/CD

---

## 1. Contexto

A topologia descrita em [`cloud_representation.yaml`](../../cloud_representation.yaml) (ver também [Inquiry-0002](./0002-bradesco-van-architecture.md)) envolve:

- `ecs.core_api` (Linux, monolito modular Deno/Hono) na AWS `sa-east-1`
- `rds_mysql` (RDS MySQL)
- `ec2_stcpclt` — **EC2 Windows Server** rodando `stcpclt.exe` (binário proprietário Bradesco, protocolo OFTP via STCP), alcançado por **SSH intra-VPC** vindo do `ecs_core_api`
- `bff-gateway` (BFF público), rotas `/api/v1/*` → GCP legacy-api, `/api/v2/*` → core-api
- `gcp.legacy_api` (API legada, multi-cloud)
- Integração externa real com Bradesco (VAN STCP + API REST + portal manual)

Desenvolver contra essa stack tem três problemas:

1. **Custo e latência** — subir EC2 Windows + RDS + ECS para cada dev sai caro e lento.
2. **Acesso à VAN real** — o `stcpclt.exe` é binário sob licença Bradesco e a VAN é endpoint regulado; ninguém quer apontar dev local pra produção Bradesco.
3. **Reprodutibilidade da máquina** — múltiplos devs, versões divergentes de Deno/MySQL/ferramentas, "na minha máquina funciona".

O próprio YAML já antecipa isso (`orquestrador_de_transmissao.testes.homologacao: "mock devolve protocolo fictício, sem chamar VM real"`), mas faltava decidir **qual stack** simula tudo, e **como o CI/CD reaproveita** a mesma simulação.

---

## 2. Pergunta(s) feita(s)

```
1. "Como poderíamos criar um clone offline ou simulador da minha cloud,
    porém no meu Mac, pra poder desenvolver local? Existe como?"

2. "Teria algo melhor que o docker-compose para simular?"

3. "Pode ser sim: (Devbox + Tilt + docker-compose), porém seria bom
    ele ter alguma integração com CI/CD."
```

Restrições/preferências reveladas durante a conversa:

- Mac do dev (provavelmente Apple Silicon).
- Não querer instalar Windows real local se possível.
- Querer **hot reload + dashboard de dev** (eixo 3 de simulação).
- Querer **ambiente declarativo reproduzível** (eixo 4 de simulação).
- Indecisos sobre migrar para Kubernetes em prod (manter a porta aberta).
- CI/CD: GitHub Actions, **só CI** (lint, test, build) por enquanto, deploy ECS ainda greenfield.

---

## 3. Respostas / Investigação

### 2026-05-13 — Rodada 1: opções de simulação

Avaliadas três famílias:

- **Docker Compose com fakes Linux** — Substitui a EC2 Windows por um container Linux `fake-stcpclt` que aceita SSH na mesma porta, parseia os argumentos do `stcpclt.exe` (`-p 00055BRADESCO -r 5 -t 30`) e devolve protocolo fictício; um segundo container `fake-bradesco` simula OFTP/STCP só o suficiente pra ACK/NACK e grava o CNAB recebido; `fake-legacy-api` (WireMock/json-server) cobre `/api/v1/*`; MySQL e core-api como containers. **Justificado pelo próprio YAML**: o `gateway_van` é uma ACL (Anti-Corruption Layer) — o core-api não deveria notar diferença.
- **Híbrido com VM Windows (UTM / Parallels / VMware Fusion)** — Mais fiel, mas drena recursos do Mac, exige o binário Bradesco (licença), e provavelmente não pega bug nenhum que o fake não pegaria (porque a ACL isola). Bugs específicos do binário só aparecem em homologação real Bradesco mesmo.
- **LocalStack (free / Pro)** — Simularia ECS, RDS, Secrets Manager, IAM. Descartado: alto custo de configuração, baixo valor — o objetivo é testar **fluxo CNAB**, não API AWS.

### 2026-05-13 — Rodada 2: "tem algo melhor que docker-compose?"

Perguntado em quatro eixos:

1. Fidelidade AWS real → LocalStack / kind+Helm.
2. Velocidade no Mac → **OrbStack** (drop-in pro Docker Desktop, ~10× mais leve, nativo Apple Silicon).
3. Hot reload + dashboard dev → **Tilt** ou Skaffold.
4. Ambiente declarativo → **Nix flakes** ou **Devbox** (wrapper sobre Nix).

Usuário escolheu **mistura de 3 + 4**. K8s futuro **indeciso**.

Saída: stack recomendada **Devbox + Tilt + docker-compose**, com Tilt como camada de orquestração (suporta `docker_compose(...)` hoje e `k8s_yaml(...)` se um dia mudar pra EKS — investimento não descartado). Alternativa minimalista: Devbox + Process Compose (TUI, sem UI web).

### 2026-05-13 — Rodada 3: CI/CD

Plataforma: **GitHub Actions**.
Escopo: **só CI** (lint, test, build) por enquanto.
Estado do deploy: **greenfield** (nada implantado ainda).

Insight central: **devbox e docker-compose rodam idênticos local e em CI**. Tilt **não** entra no CI — é UI de desenvolvimento; em runner sem display não agrega. Mas o `docker-compose.yml` que o Tilt orquestra local é reaproveitado integralmente pelos workflows.

Pipeline desenhada (jobs paralelos):

```
┌─ lint-and-typecheck   (devbox + deno lint/fmt/check)
├─ unit-tests            (devbox + deno test src/domain src/application)
├─ integration-tests     (compose up fakes + devbox + deno test tests/integration)
└─ build                 (docker buildx, --platform linux/amd64, sem push)
```

Caches: Nix store (`/nix`) + buildx layer cache. Esperado: 2ª execução cai de ~3min para ~30s.

---

## 4. Análise interna

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **Docker Compose puro** | Simples, todo dev já conhece, roda em CI sem mais nada | Sem hot reload elegante, sem dashboard, sem reprodutibilidade de toolchain (cada dev com seu Deno) | ❌ Insuficiente sozinho — falta os eixos 3 e 4 |
| **Docker Compose + Windows VM (UTM/Parallels)** | Mais fiel à topologia real (`stcpclt.exe` real) | Drena RAM/bateria, exige binário Bradesco (licença), zero ganho prático além do fake (a ACL isola) | ❌ Rejeitada — custo alto, valor marginal |
| **LocalStack (AWS API local)** | Simula ECS/RDS/Secrets/IAM | Foco errado — projeto testa fluxo CNAB, não API AWS; setup pesado | ❌ Rejeitada |
| **kind / k3d (k8s local)** | Paridade total se um dia migrar pra EKS | Overhead pra quem **talvez** vá pra k8s | ❌ Prematuro — Tilt cobre a migração futura sem custo agora |
| **OrbStack (drop-in Docker Desktop)** | ~10× mais leve no Mac, free, nativo Apple Silicon | Não resolve eixo 3 nem 4 sozinho | ⚪ Complementar — recomendado usar **junto** com a stack escolhida |
| **Devbox + Tilt + docker-compose** | Cobre os 4 eixos solicitados; Tilt suporta `docker_compose()` hoje e `k8s_yaml()` amanhã; CI reutiliza o mesmo `docker-compose.yml`; devbox garante paridade local↔CI | Curva de aprendizado de Tilt (~1 dia); Nix store ocupa disco | ✅ **Escolhida** |
| Devbox + Process Compose | Mais leve, sem UI web, TUI no terminal | Perde dashboard; perde investimento em migração k8s futura | ⚪ Alternativa minimalista — descartada para esse caso |

### Por que Tilt fica fora do CI

Tilt é uma **UI de desenvolvimento** (dashboard `localhost:10350`, hot reload, restart de serviço com clique). Em CI sem display, agrega zero. Adicionar Tilt no CI custa ~30s de install + complexidade. A regra que ficou: **mesmo `docker-compose.yml` local e CI; Tilt só local**.

### Por que GitHub Actions e não CodePipeline

Usuário disse "GitHub Actions". Confirmação por critérios objetivos: melhor ecossistema pra Deno/Tilt/devbox (`jetify-com/devbox-install-action` oficial), OIDC nativo pra AWS sem secrets estáticos, integração natural com PR review. CodePipeline faria sentido se o time fosse 100% AWS-tooling, não é o caso.

---

## 5. Decisão final

### Stack local de desenvolvimento

| Camada | Ferramenta | Função |
| :--- | :--- | :--- |
| Toolchain reproduzível | **Devbox** (sobre Nix) | Pin de Deno, mysql-client, openssh, mkcert, etc. — todo dev tem ambiente idêntico via `devbox shell` |
| Orquestração dev + dashboard | **Tilt** | UI web em `localhost:10350`, hot reload, agrega logs, restart com clique. Tiltfile em Python versionado. |
| Serviços simulados | **docker-compose** | Containers para `core-api`, `rds-mysql`, `bff-gateway`, `fake-stcpclt`, `fake-bradesco`, `fake-legacy-api`. Mesmo arquivo reusado em CI. |
| Otimização Mac (opcional) | **OrbStack** | Substitui Docker Desktop, ~10× mais leve em Apple Silicon. Drop-in. |

### Topologia simulada (mapeamento YAML → containers)

| YAML | Local |
| :--- | :--- |
| `aws.vpc.private_subnet.ecs_core_api` | container `core-api` (Deno/Hono) — opcionalmente nativo via Tilt `local_resource` pra hot reload instantâneo |
| `aws.vpc.private_subnet.rds_mysql` | container `mysql:8` |
| `aws.vpc.public_subnet.api_gateway_bff` | container `bff-gateway` |
| `aws.vpc.public_subnet.ec2_stcpclt` (Windows) | container Linux **`fake-stcpclt`** — aceita SSH, parseia `stcpclt.exe -p ... -r ... -t ...`, devolve protocolo fictício |
| `bradesco.van_bradesco` | container **`fake-bradesco`** — escuta OFTP/STCP, ACK/NACK, grava CNAB recebido em volume pra inspeção |
| `gcp.legacy_api` | container **`fake-legacy-api`** (WireMock / json-server) respondendo `/api/v1/*` |
| `seguranca.credenciais_ssh` (AWS Secrets Manager) | arquivo `.env` local OU container LocalStack só pra Secrets Manager (opcional) |
| Separação public/private subnet | redes do docker-compose (`network: public`, `network: private`) |

### CI (GitHub Actions)

**Estrutura de arquivos:**

```
.github/workflows/
  ci.yml                  # PR: lint + typecheck + test + build (sem push)
.github/actions/
  setup-devbox/           # composite action reutilizável
devbox.json               # mesmo arquivo, local e CI
docker-compose.yml        # mesmo arquivo, local e CI
docker-compose.ci.yml     # overrides para CI (sem volumes de dev, healthcheck curto)
Tiltfile                  # SÓ local
```

**Jobs (paralelos em PR):**

1. `lint-and-typecheck` — `devbox run -- deno lint && deno fmt --check && deno check src/`
2. `unit-tests` — `devbox run -- deno test src/domain src/application`
3. `integration-tests` — `docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d --wait` + `devbox run -- deno test tests/integration`
4. `build` — `docker buildx build --platform linux/amd64 .` (sem push por padrão)

**Concorrência:** cancelar runs antigos do mesmo PR.
**Cache:** Nix store (`/nix`), buildx layers, deno cache (`~/.cache/deno`).

### Princípio guarda-chuva

> **A mesma stack de simulação roda local (com Tilt como UI) e em CI (sem Tilt). Se passa local, passa no CI.**

---

## 6. Saídas (outputs concretos)

### Decisões pendentes (dependem do dono do produto / DevOps)

- [ ] **Push da imagem mesmo sem deploy?** Recomendação: sim, só em `main`, pra ECR `sa-east-1` via OIDC. Custo quase zero, ganha versionamento, e quando o CD chegar a imagem já está lá.
- [ ] **Plataforma da imagem.** ECS Fargate default = `linux/amd64`. Se cogitarem **Graviton** (mais barato), trocar para `linux/arm64` ou buildx multi-platform (custa ~40s a mais no build).
- [ ] **OIDC pra AWS já agora.** Mesmo sem deploy, configurar IAM role com trust policy pro `token.actions.githubusercontent.com` antecipa o CD futuro sem segredo estático no GitHub.

### Artefatos a criar (sequência sugerida)

- [ ] `devbox.json` — pin Deno version + mysql-client + openssh + mkcert
- [ ] `docker-compose.yml` + `docker-compose.ci.yml` — esqueleto com placeholders para os fakes
- [ ] **Fakes** (implementação separada — provavelmente nova inquiry):
  - [ ] `fake-stcpclt` (servidor SSH Linux que imita `stcpclt.exe`)
  - [ ] `fake-bradesco` (listener OFTP/STCP minimalista, ACK/NACK + dump CNAB)
  - [ ] `fake-legacy-api` (WireMock ou json-server com fixtures `/api/v1/*`)
- [ ] `Tiltfile` — `docker_compose(...)` + `local_resource` opcional para core-api hot reload
- [ ] `.github/workflows/ci.yml` — 4 jobs paralelos + matrix
- [ ] `.github/actions/setup-devbox/action.yml` — composite action
- [ ] Documento em `infrastructure/05-local-dev-environment.md` (a criar)
- [ ] Possível ADR futura: **ADR-XXXX — Pipeline CI/CD baseada em GitHub Actions + Devbox**

### Próximos passos imediatos

- [ ] Rascunhar os três arquivos base (`devbox.json` + `Tiltfile` + `docker-compose.yml`) para revisão antes de mexer no repositório
- [ ] Discutir o modelo dos fakes (`fake-stcpclt` e `fake-bradesco`) — provavelmente nova Inquiry-0014

---

## 7. Referências

- [`cloud_representation.yaml`](../../cloud_representation.yaml) — topologia da nuvem real
- [Inquiry-0002 — Arquitetura Bradesco VAN + REST](./0002-bradesco-van-architecture.md)
- [Inquiry-0003 — Estratégia multi-cloud AWS + GCP](./0003-multi-cloud-strategy.md) (pendente)
- [Inquiry-0012 — BFF managed vs Fastify](./0012-bff-managed-api-gateway-vs-fastify.md)
- ADR-0006 — Modular Monolith core-api
- ADR-0008 — Bradesco integration architecture
- Devbox: https://www.jetify.com/devbox
- Tilt: https://docs.tilt.dev
- `jetify-com/devbox-install-action` (GitHub Marketplace)
- OrbStack: https://orbstack.dev
- Process Compose: https://f1bonacc1.github.io/process-compose
