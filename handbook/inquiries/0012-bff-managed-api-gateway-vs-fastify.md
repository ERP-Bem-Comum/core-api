[← Voltar ao README de Inquiries](./README.md)

# Inquiry-0012 — BFF: AWS API Gateway managed vs. Fastify burro próprio

- **Status:** `Open` (revisitada em 2026-05-22 após ADR-0021)
- **Aberta em:** 2026-05-07
- **Última atualização:** 2026-05-22 — ver [§9](#9-atualização-2026-05-22--impacto-do-adr-0021)
- **Aguardando:** Banca interna (squad) + alinhamento com DevOps (Codebit) + dono do legado.
- **Bloqueia:** Skeleton do `bff-gateway` no `core-api`. Definição da fronteira de entrada. Possível supersede do **ADR-0005**.
- **Tema:** Estratégia & Arquitetura.

> ℹ️ **Atualização em 2026-05-22:** A premissa cross-cloud (AWS+GCP) que motivou parte desta inquiry **não se confirmou**. O [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) (supersedes [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md)) estabeleceu **AWS-único produção + MagaluCloud PBE interno**. Seções afetadas: §4.2 (marcada superseded), §6 pergunta 4 (resolvida), §7 último bullet (N/A). Decisão central da inquiry (Hipótese A/B/C) e Gap 1 (legado sem `setGlobalPrefix('api/v1')`) **continuam pendentes** da banca — esses pontos não dependiam da premissa multi-cloud original. Ver [§9](#9-atualização-2026-05-22--impacto-do-adr-0021) para o quadro completo.

---

## 1. Contexto

A topologia operacional fechada pelo DevOps em 2026-05-07 (registrada em `architecture/02-system-topology.md`) coloca um **AWS API Gateway** como ponto de entrada do tráfego, em substituição à expectativa anterior do handbook de um BFF Fastify "burro" rodando como serviço próprio (ADR-0005).

```
Domain → APIGW (AWS) → /api/v1/* → legacy-api (GCP)
                     → /api/v2/* → core-api (AWS, EC2 private subnet)
                     → STCPCLT (AWS, EC2 Windows public subnet)
```

A pergunta desta inquiry: **API Gateway managed substitui o BFF Fastify (caminho A), ou fica em frente a ele (caminho B)?** O autor da inquiry inclina para **A**, mas a decisão precisa ser fundamentada — e precisa olhar para o **estado real do legado**, que **não está preparado** para nenhuma das hipóteses do jeito que estão hoje.

---

## 2. Hipóteses

### Hipótese A — API Gateway managed substitui o BFF Fastify

API Gateway concentra: roteamento por prefixo (`/api/v1/*` → GCP, `/api/v2/*` → AWS), autenticação JWT (custom authorizer ou Cognito), rate limit, throttling, CORS, mTLS para upstream Bradesco se aplicável. Sem código próprio. ADR-0005 é `Superseded` por ADR novo.

### Hipótese B — API Gateway na frente, BFF Fastify atrás

API Gateway só faz TLS termination, WAF e rate limit. Um BFF Fastify (no `core-api` ou serviço dedicado) faz roteamento + autenticação. Mantém ADR-0005 como vigente.

### Hipótese C — API Gateway managed + ALB direto (sem BFF de qualquer tipo)

Variante de A em que `/api/v2/*` vai para um ALB que distribui no `core-api`, sem nenhuma camada de BFF — cada serviço se autentica sozinho. O `core-api` (Modular Monolith por ADR-0006) já é o destino final, então um BFF burro vira pura dupla.

---

## 3. Fundamentação canônica

### 3.1 — API Gateway managed para concerns genéricos: chancelado

> "There are a whole host of concerns that may need to be addressed on the server side when it comes to handling API calls. Aside from the call aggregation and filtering, we can think of more generic concerns like API key management, user authentication, or call routing. Often these generic concerns can be handled by API gateway products, which are available in many sizes and for many different price points (some of which are eye-wateringly high!). Depending on the sophistication you require, it can make a lot of sense to purchase a product (or license a service) to handle some of these concerns for you. Do you really want to manage API key issuing, tracking, rate limiting, and so on yourself? By all means, look at products in this space to solve these generic concerns, but be wary about also trying to use these products to do your call aggregation and filtering, even if they claim they can."
>
> — *(Linha 7660, p. 588, Sam Newman, _Building Microservices_)*

**Leitura:** roteamento, autenticação, rate limit, API key management são exatamente o que AWS API Gateway faz nativamente. A chancela canônica é **direta** para usar o produto — Newman explicita "make a lot of sense to purchase a product (or license a service)". Hipótese A passa nesse teste.

### 3.2 — O QUE EVITAR no API Gateway: protocol rewriting e call aggregation

> "Partly due to the apparent desperation of some API gateway vendors, all sorts of claims have been made for what these products can do. This has led to a lot of misuse of these products, and in turn to an unfortunate distrust of what is fundamentally quite a simple concept. Two key examples I've seen of misuse of API gateways is for call aggregation and protocol rewriting, but I've also seen a wider push to use API gateways for in-perimeter (east-west) calls too.
>
> In this chapter we've already briefly looked at the usefulness of a protocol like GraphQL to help us in a situation in which we need to make a number of calls and then aggregate and filter the results, but people are often tempted to solve this problem in API gateway layers too. It starts off innocently enough: you combine a couple of calls and return a single payload. Then you start making another downstream call as part of the same aggregated flow. Then you start wanting to add conditional logic, and before long you realize that you've baked core business processes into a third-party tool that is ill suited to the task.
>
> If you find yourself needing to do call aggregation and filtering, then look at the potential of GraphQL or the BFF pattern, which we'll cover in Chapter 14. If the call aggregation you are performing is fundamentally a business process, then this is better done through an explicitly modeled saga, which we'll cover in Chapter 6.
>
> Aside from the aggregation angle, protocol rewriting is also often pushed as something API gateways should be used for. I remember one unnamed vendor very aggressively promoting the idea that its product could 'change any SOAP API into a REST API.' Firstly, REST is an entire architectural mindset that cannot simply be implemented in a proxy layer. Secondly, protocol rewriting, which is fundamentally what this is trying to do, shouldn't be done in intermediate layers, as it's pushing too much behavior to the wrong place."
>
> — *(Linha 2779, p. 208, Sam Newman, _Building Microservices_)*

**Leitura crítica:** este trecho é o que **bloqueia hoje a Hipótese A**, porque a topologia do DevOps assume `/api/v1/*` → legacy, mas o legado **não tem prefixo `/api/v1/*`** — suas rotas saem na raiz (`/payables`, `/contracts`, `/suppliers`, ...; ver §4 desta inquiry). Para A funcionar, ou (a.i) o legado adiciona prefixo global no NestJS, ou (a.ii) o API Gateway faz **path mapping** — e Newman afirma diretamente: "*protocol rewriting (...) shouldn't be done in intermediate layers*". A.ii é exatamente o anti-pattern. Restará A.i, que **exige mudança no legado**.

### 3.3 — Custo escondido de "configurar regras em DSL do produto"

> "When customizing a product built by someone else, you often have to work in their world. Your toolchain is restricted because you may not be able to use your programming language and your development practices. Rather than writing Java code, you're configuring routing rules in some odd product-specific DSL (probably using JSON). It can be a frustrating experience, and you are baking some of the smarts of your system into a third-party product. This can reduce your ability to move this behavior later. It's common to realize that a pattern of call aggregation actually relates to some domain functionality that could justify a microservice in its own right (something we'll explore more shortly when we talk about BFFs ). If this behavior is in a vendor-specific configuration, moving this functionality can be more problematic, as you'd likely have to reinvent it.
>
> The situation can become even worse if the aggregating gateway becomes complex enough to require a dedicated team to own and manage it. At worst, adopting more horizontal team ownership can lead to a situation in which to roll out some new functionality you have to get a frontend team to make changes, the aggregating gateway team to make changes, and the team(s) that owns the microservice to also make its changes. Suddenly everything starts going much more slowly."
>
> — *(Linha 7660, p. 588, Sam Newman, _Building Microservices_)*

**Leitura:** Newman alerta para o "lock-in operacional" do API Gateway managed — a configuração vai para JSON/YAML específico (CloudFormation/CDK/Terraform/SAM), e tirar comportamento de lá depois é mais caro. Para o nosso caso, o risco é **baixo** desde que respeitemos a regra do §2.2 (sem aggregation, sem rewriting, sem business logic), mantendo o API Gateway estritamente como roteador + autenticador + rate limit.

---

## 4. O legado **não está preparado** para a decisão

Esta inquiry diferencia-se de inquiries anteriores porque a decisão depende fortemente do estado do `sistemas_legado_referencia/` — e a checagem revelou três gaps duros.

### 4.1 — Gap 1: Ausência de versionamento de API no legado

`sistemas_legado_referencia/ERP-BACKEND/src/main.ts` (NestJS 10) **não usa `app.setGlobalPrefix('api/v1')`** nem `app.enableVersioning(...)`. As rotas dos módulos saem direto da raiz:

```
/payables
/contracts
/suppliers
/cost-centers
/budget-plans
/users
/auth/login
/apiBradesco/...
```

E a documentação Swagger é montada em `/api/swagger`.

**Implicação para Hipótese A:** o roteamento `/api/v1/*` → legado **não funciona** na topologia atual. Para casar com o esquema do DevOps, escolhemos entre:

| Opção | Mecanismo | Custo | Conforme Newman §3.2? |
| :--- | :--- | :--- | :--- |
| **a.i** | Adicionar `app.setGlobalPrefix('api/v1')` no `main.ts` do legado, atualizar todos os clientes | Mudança coordenada legado + frontend + redeploy | ✅ sim — o rewriting é feito no próprio sistema, não no gateway |
| **a.ii** | Configurar API Gateway com path mapping (strip `/api/v1` antes de proxy) | Configuração one-time no API Gateway | ❌ **não** — Newman: "protocol rewriting shouldn't be done in intermediate layers" |
| **a.iii** | Mudar topologia: `/legacy/*` (sem versão) → legado, `/api/v2/*` → core-api | Renegociar com DevOps | Depende de quanto se aceita reescrever o esquema |

A opção **a.i é a única canônicamente limpa** — mas exige tocar no legado, que nominalmente é "referência, não editar" segundo `CLAUDE.md` da pasta `bem_comum/`. Precisa de **alinhamento explícito** com quem opera o legado hoje (Codebit? time interno?) sobre a janela para esse prefixo entrar.

### 4.2 — Gap 2: ~~Postura de segurança do legado é incompatível com exposição cross-cloud~~ (Superseded em 2026-05-22)

> ⚠️ **Esta sub-seção foi superseded pelo [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md)** (2026-05-22). A premissa "legado no GCP, exposto cross-cloud" deixou de valer — todo o stack produtivo (legado + `core-api` + `bff-gateway`) vive **dentro do mesmo VPC AWS**. Comunicação intra-VPC via security groups; sem VPN AWS↔GCP, sem mTLS server cert no legado, sem WAF entre eles. O conteúdo abaixo é preservado para auditoria de raciocínio (ratio legis), **não usar como referência atual**. Ver [§9](#9-atualização-2026-05-22--impacto-do-adr-0021) para detalhes.

`main.ts` do legado:

```typescript
app.enableCors({ allowedHeaders: "*", origin: "*" });
```

CORS totalmente aberto. Sem mTLS na borda. Sem WAF. Hoje só funciona porque está atrás de um perímetro privado (presumivelmente VPC interna com acesso pelo frontend Next.js).

Na topologia nova, o legado fica **no GCP** e é alvo de chamadas vindas da AWS via API Gateway. Duas opções:

- **VPN/Interconnect AWS↔GCP** (Cloud Interconnect ou Direct Connect com peering) — legado fica em rede privada do lado GCP.
- **Internet com mTLS + WAF + IP allowlist** — legado precisa endurecer a borda.

Qualquer das duas exige **trabalho no legado** (TLS server cert, IP allowlist, ou rede dedicada). Esta inquiry não decide qual — abre **inquiry candidata Inquiry-0013** ("Conectividade cross-cloud AWS↔GCP").

### 4.3 — Gap 3: Frontend acopla URL do backend no build do Next.js

`sistemas_legado_referencia/ERP-FRONTEND` (Next.js 13 App Router) usa `NEXT_PUBLIC_API_URL=http://localhost:3003` injetado em build-time (`--build-arg NEXT_PUBLIC_API_URL=...`). Para apontar ao API Gateway, **precisa rebuild + redeploy** do frontend.

Não é bloqueador, mas significa que a virada para a topologia nova não é "mude o DNS"; é **release coordenado** legado + frontend.

---

## 5. Decisão recomendada (a confirmar pela banca)

**Adotar Hipótese A** (API Gateway managed substitui o BFF Fastify) **com as seguintes restrições explícitas, todas ancoradas em Newman §3.2 e §3.3:**

1. **API Gateway só faz: roteamento por prefixo, autenticação JWT, rate limit, throttling, TLS termination.**
2. **Proibido no API Gateway:** call aggregation, protocol rewriting (incluindo path mapping `/api/v1/*` → `/*`), tradução de versões, qualquer regra condicional de negócio. (Newman, p. 208.)
3. **Configuração do API Gateway via IaC** (Terraform ou CDK), não console — para preservar reversibilidade e revisão de PR.
4. **Pré-requisito de execução:** o legado precisa adicionar `app.setGlobalPrefix('api/v1')` antes do API Gateway entrar em produção. **Sem essa mudança, a Hipótese A não é viável e cai-se em `a.ii` (anti-pattern Newman) ou `a.iii` (renegociar topologia).**
5. **ADR-0005** ("BFF Gateway burro") fica `Superseded by` ADR-novo (candidato a **ADR-0018**) que documenta a decisão.

Hipótese B (API Gateway + Fastify atrás) é rejeitada como **dupla camada de roteamento sem ganho** — Fastify burro repetiria o que API Gateway já faz, adicionando hop, custo, latência e código pra manter.

Hipótese C (sem BFF de qualquer tipo) é equivalente operacional de A — A já não tem código próprio. A diferença é puramente de nomenclatura no handbook.

---

## 6. Perguntas em aberto (para a banca)

1. **Quem aceita a mudança no legado?** Adicionar `setGlobalPrefix('api/v1')` no `main.ts` do legado é **uma linha**, mas contradiz o "não editar" do `sistemas_legado_referencia/`. Precisa de OK explícito do dono do legado e janela de release coordenada com o frontend (`NEXT_PUBLIC_API_URL` rebuild).
2. **Qual mecanismo de autenticação no API Gateway?** Custom Lambda authorizer validando JWT do Zitadel (se for Zitadel) / NextAuth atual? Cognito? mTLS interno? Esta decisão pode caber em ADR próprio ou na ADR-0018.
3. **O API Gateway termina em IP público do `core-api` (Private Link / VPC Link) ou via internet?** Boa prática AWS é VPC Link de API Gateway → NLB privado → EC2 em Private Subnet, sem IP público no `core-api`. Confirmar com DevOps.
4. ~~**Qual o modo de conectividade cross-cloud até o legado no GCP?** VPN/Interconnect ou internet com mTLS? **Abrir Inquiry-0013** se a decisão demorar.~~ **(RESOLVIDA em 2026-05-22)** — Não aplicável. [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) estabeleceu produção single-cloud AWS; legado fica no mesmo VPC que `core-api`. Comunicação intra-VPC via security groups. PBE MagaluCloud não acessa AWS produção. Ver [§9](#9-atualização-2026-05-22--impacto-do-adr-0021).
5. **Custo:** API Gateway tem custo por requisição (≈ US$ 3,50 / milhão REST requests + transferência). Para volumes ERP típicos é desprezível, mas vale validar com Codebit em estimativa de tráfego.

---

## 7. Impactos no handbook (depois da banca decidir)

Se Hipótese A for confirmada:

- **Novo ADR (candidato a ADR-0018):** "BFF Gateway managed via AWS API Gateway, supersede ADR-0005". Status `Proposed` até banca, `Accepted` após.
- **ADR-0005** atualizado no índice como `Superseded by ADR-0018`. Conteúdo permanece imutável (regra de ADRs).
- **`architecture/02-system-topology.md`** §3 e §5 reescritos para refletir API Gateway no lugar de Fastify; diagrama oficial do DevOps embutido.
- **`infrastructure/01-infra-handoff.md`** ganha seção sobre API Gateway (IaC, custom authorizer, rotas, mapeamentos).
- **`architecture/04-integration-events.md`** §6 nota sobre outbox cross-cloud (worker no `core-api` → consumidor no `legacy-api` GCP).
- ~~**Inquiry-0013** ("Conectividade cross-cloud AWS↔GCP") aberta como follow-up.~~ **(N/A em 2026-05-22)** — produção single-cloud AWS por [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md). Inquiry-0013 ainda existe, mas com escopo diferente (simulador local Devbox + Tilt + Docker Compose, sem relação com conectividade cross-cloud).
- **Nova entrada no CHANGELOG.md** com data 2026-05-07.

---

## 8. Apêndice — Histórico de chamadas MCP `acdg-skills`

| Tool | Query / Args | Resultado |
| :--- | :--- | :--- |
| `skills_buscar` | `"API Gateway BFF backend for frontends thin dumb routing managed"` (dominio=architecture, top=8) | 4 matches relevantes em Newman (linhas 7660, 7671, 7681, 2779) |
| `skills_buscar` | `"anti-corruption layer legacy system without control protocol rewriting gateway"` (dominio=architecture, top=5) | Top match reconfirmou Newman 2779 (What to avoid) |
| `skills_citar` | Newman, linha 7660, contexto=8 | Multiple Concerns + custo escondido de DSL próprio |
| `skills_citar` | Newman, linha 2779, contexto=10 | What to avoid: aggregation + protocol rewriting |

Citações ≥4 linhas conforme regra do `CLAUDE.md`. Nenhuma paráfrase.

---

> **Próximo passo:** levar esta inquiry à banca interna em conjunto com o esquema oficial do DevOps. Após decisão, abrir ADR-0018 e atualizar CHANGELOG.

---

## 9. Atualização 2026-05-22 — Impacto do ADR-0021

O [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) estabeleceu topologia **AWS-único produção (Codebit) + MagaluCloud PBE interno (equipe)**, supersedendo o ADR-0007 que motivara parte original desta inquiry. Esta §9 documenta o impacto cirurgicamente — **a decisão central da inquiry (Hipótese A vs B vs C) NÃO é afetada por essa mudança** e continua aguardando banca.

### 9.1 — Topologia revisada

O diagrama do DevOps usado na §1 desta inquiry assumia cross-cloud. Não vale mais. A topologia atual fica:

```
Domain → APIGW (AWS) → /api/v1/* → legacy-api (AWS, mesmo VPC)
                     → /api/v2/* → core-api  (AWS, mesmo VPC, EC2 private subnet)
                     → STCPCLT  (AWS, EC2 Windows public subnet, mesmo VPC)
```

Single-cloud. Tudo dentro do mesmo VPC AWS. As três rotas atravessam security groups internos, não internet pública.

### 9.2 — O que evapora desta inquiry

| Item original | Status pós-ADR-0021 |
| :--- | :--- |
| §4.2 — postura segurança incompatível cross-cloud | Superseded (marcado na própria §4.2) |
| §6 pergunta 4 — conectividade cross-cloud | Resolvida (marcada na própria §6) |
| §7 — abrir Inquiry-0013 cross-cloud | N/A (marcado na própria §7) |
| Linha "Custo de egress AWS↔GCP" implícita em §6.5 | N/A — sem egress cross-cloud em produção |

### 9.3 — O que **NÃO** muda nesta inquiry

A decisão central permanece intacta:

- **Hipótese A vs B vs C** continua aberta. A escolha entre "API Gateway substitui BFF (A)", "API Gateway na frente do BFF Fastify (B)" e "API Gateway + ALB direto sem BFF (C)" é independente de quantas clouds estão em jogo.
- **Gap 1 (§4.1 — legado sem `setGlobalPrefix('api/v1')`)** continua existindo. Single-cloud não conserta as rotas do legado saírem na raiz. Sem o prefix, Hipótese A só funciona via path mapping no API Gateway, que é o anti-pattern Newman §3.2 que esta inquiry rejeita.
- **§3 (fundamentação Newman)** segue válida — independente de cloud.
- **§5 (decisão recomendada Hipótese A + restrições)** segue válida — o argumento canônico de Newman não depende da topologia de rede.
- **§6 perguntas 1, 2, 3, 5** (mudança no legado, mecanismo de auth, VPC Link, custo API Gateway) seguem pendentes.

### 9.4 — Novo eixo introduzido pelo ADR-0021: fidelidade do PBE MagaluCloud

O PBE MagaluCloud (custeado pela equipe, sem dados reais, ponte de early-access para Bem Comum — analogia "PBE Riot Games" no ADR-0021) precisa **reproduzir fielmente** o stack AWS. Para essa inquiry, isso introduz uma pergunta nova:

> **Como o PBE MagaluCloud reproduz o ponto de entrada (API Gateway) sendo que MagaluCloud NÃO tem managed API Gateway equivalente ao AWS API Gateway?**

Inspecionando `handbook/reference/magalu-cloud/network/` (overview.md, lbaas/, how-to/) e `handbook/reference/magalu-cloud/security/`, a MGC oferece:

- **VPC + Security Groups** — equivalentes a AWS VPC/SG. ✅ Reprodução fiel.
- **LBaaS (Load Balancer as a Service)** — L4/L7 com TLS termination e routing por path. ✅ Cobre parte do API Gateway (roteamento + TLS).
- **Sem managed API Gateway equivalente** — não há produto MGC com JWT custom authorizer, rate limit avançado, throttling, mTLS upstream, Lambda authorizer. ❌ Gap real.

**Três opções para o PBE preencher o gap:**

| Opção | Mecanismo | Fidelidade vs AWS prod | Custo |
| :--- | :--- | :--- | :--- |
| **MGC-i** | MGC LBaaS faz routing + TLS; autenticação JWT delegada ao próprio `bff-gateway` ou `core-api` (interceptor/plugin) | 🟡 Roteamento fiel; auth migra de "borda" para "aplicação" | Baixo (sem container extra) |
| **MGC-ii** | Container `gateway-emulator` (Kong, Tyk, AWS API Gateway Emulator, ou Fastify burro) dentro do PBE simulando API Gateway | ✅ Comportamento próximo ao AWS API Gateway | Médio (1 container + manutenção config) |
| **MGC-iii** | PBE acessado direto via DNS de cada serviço (sem ponto de entrada unificado) | ❌ Não reproduz topologia produtiva — só serve para testes unitários isolados | Zero |

**Recomendação (a confirmar pela banca quando a inquiry resolver):** **MGC-ii** se Hipótese A vencer (PBE precisa ter "borda" para validar fluxos de auth/rate-limit antes de prod), ou **MGC-i** se Hipótese B vencer (auth já fica no Fastify do `bff-gateway`, replicar a configuração do Fastify burro em PBE é trivial).

### 9.5 — VAN bancária Bradesco — exclusiva AWS produção

A VAN do Bradesco (Windows VM com STCPCLT, ver [ADR-0008](../architecture/adr/0008-bradesco-integration-architecture.md)) **só existe em AWS produção** por restrição operacional:

1. **Binário STCPCLT é proprietário Bradesco**, sob licença restrita ([ADR-0008](../architecture/adr/0008-bradesco-integration-architecture.md):92 — "STCPCLT é caixa-preta"). Não pode ser portado para MGC.
2. **VAN endpoint é regulado** — banco não aceita conexão de IPs aleatórios; allow-list por contrato com Bradesco.
3. **Reverse engineering do protocolo** foi explicitamente rejeitado em [ADR-0008](../architecture/adr/0008-bradesco-integration-architecture.md):118 — "Reverso engineering de protocolo bancário proprietário sem documentação aberta. Tempo + risco enormes; STCPCLT já funciona".

**Pergunta da P.O. em 2026-05-22:** "existe alguma maneira de DENTRO do sistema da MAGALU simularmos uma VAN?"

**Resposta:** sim — **já está desenhado em [Inquiry-0013](./0013-local-dev-simulator-and-ci.md):62** para dev local Docker Compose:

> "Substitui a EC2 Windows por um container Linux `fake-stcpclt` que aceita SSH na mesma porta, parseia os argumentos do `stcpclt.exe` (`-p 00055BRADESCO -r 5 -t 30`) e devolve protocolo fictício; um segundo container `fake-bradesco` simula OFTP/STCP só o suficiente pra ACK/NACK e grava o CNAB recebido; (...) Justificado pelo próprio YAML: o `gateway_van` é uma ACL (Anti-Corruption Layer) — o core-api não deveria notar diferença."

**O padrão arquitetural roda em qualquer container runtime**, incluindo MagaluCloud Kubernetes ou VMs. O `gateway_van` no `core-api` é um **port** abstrato; o adapter aponta para:

- `fake-stcpclt` + `fake-bradesco` em **dev local** (Docker Compose).
- `fake-stcpclt` + `fake-bradesco` em **PBE MagaluCloud** (containers ou pods K8s da MGC).
- VM Windows EC2 + STCPCLT + VAN real em **AWS produção**.

**O que o PBE MagaluCloud valida (com fakes):**

- ✅ Geração de CNAB 240 a partir de aggregates do `core-api` (semântica do payload).
- ✅ Parsing de retorno CNAB (segmentos T, U, ocorrências).
- ✅ Fluxo de assinatura digital (se aplicável).
- ✅ Idempotência e outbox cross-módulo.
- ✅ Handshake SSH + invocação do "stcpclt" (sintaxe de comando).

**O que o PBE MagaluCloud NÃO valida:**

- ❌ Protocolo OFTP/STCP real (handshake real, certificados Odette reais).
- ❌ Latência real da VAN (timeouts, retries em produção).
- ❌ Erros reais do Bradesco (mensagens de rejeição, códigos específicos).
- ❌ Licenciamento do STCPCLT (binário real).

Para validação E2E completa do fluxo Bradesco, só existem duas vias canônicas:

1. **AWS produção** com tráfego real (arriscado para testes — alteração no real).
2. **Sandbox Bradesco** (se existir — pergunta B10 da [Inquiry-0003](./0003-multi-cloud-strategy.md), sem resposta formal até 2026-05-22). Caso confirmado, sandbox vive **na AWS produção também**, não no PBE.

**Conclusão da §9.5:** PBE MagaluCloud é fiel até o **gateway_van**. A partir daí, é fake. Aceita-se que **uma camada do fluxo Bradesco é exclusivamente AWS** — exatamente o que a P.O. delineou em 2026-05-22.

### 9.6 — Impacto residual na decisão Hipótese A/B/C

Nenhum. A escolha de "API Gateway managed substitui BFF" (A) vs "API Gateway na frente do BFF Fastify" (B) vs "API Gateway + ALB direto" (C) **continua canônica conforme a fundamentação Newman em §3** — single-cloud só simplifica a operação (sem gap cross-cloud), não muda o argumento de design.

O que muda é o **trabalho operacional pós-decisão**: implementar Hipótese A vencedora agora é menos custoso (sem VPN AWS↔GCP, sem mTLS no legado, sem WAF cross-cloud). Mas o caminho permanece o mesmo.

### 9.7 — Próximos passos atualizados

1. Banca interna decide Hipótese A/B/C (sem mudança em relação a 2026-05-07).
2. Resolver Gap 1 (§4.1) — coordenar com dono do legado a adição de `setGlobalPrefix('api/v1')`. Sem mudança.
3. Abrir ADR-0018 candidato (BFF managed) — sem mudança.
4. **Novo:** decidir MGC-i vs MGC-ii vs MGC-iii (§9.4) para o ponto de entrada do PBE. Pode ficar em Inquiry separada ou virar apêndice do ADR-0018 candidato.
5. **Novo:** ratificar reaproveitamento de `fake-stcpclt` + `fake-bradesco` (Inquiry-0013 originais para Docker Compose) no PBE MagaluCloud — provavelmente nova Inquiry-0017 ou apêndice de Inquiry-0013.

### 9.8 — Referências adicionais (apenas para esta §9)

- [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) — topologia AWS-primary + MGC-PBE.
- [ADR-0008](../architecture/adr/0008-bradesco-integration-architecture.md) — STCPCLT, VAN, Windows VM.
- [Inquiry-0013](./0013-local-dev-simulator-and-ci.md):62 — design original dos fakes.
- `handbook/reference/magalu-cloud/network/overview.md` — VPC, Security Groups, LBaaS.
- `handbook/reference/magalu-cloud/security/` — bestpractices + deploy.
