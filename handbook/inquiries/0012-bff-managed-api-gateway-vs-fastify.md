[← Voltar ao README de Inquiries](./README.md)

# Inquiry-0012 — BFF: AWS API Gateway managed vs. Fastify burro próprio

- **Status:** `Open`
- **Aberta em:** 2026-05-07
- **Aguardando:** Banca interna (squad) + alinhamento com DevOps (Codebit) + dono do legado.
- **Bloqueia:** Skeleton do `bff-gateway` no `core-api`. Definição da fronteira de entrada cross-cloud. Possível supersede do **ADR-0005**.
- **Tema:** Estratégia & Arquitetura.

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

### 4.2 — Gap 2: Postura de segurança do legado é incompatível com exposição cross-cloud

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
4. **Qual o modo de conectividade cross-cloud até o legado no GCP?** VPN/Interconnect ou internet com mTLS? **Abrir Inquiry-0013** se a decisão demorar.
5. **Custo:** API Gateway tem custo por requisição (≈ US$ 3,50 / milhão REST requests + transferência). Para volumes ERP típicos é desprezível, mas vale validar com Codebit em estimativa de tráfego.

---

## 7. Impactos no handbook (depois da banca decidir)

Se Hipótese A for confirmada:

- **Novo ADR (candidato a ADR-0018):** "BFF Gateway managed via AWS API Gateway, supersede ADR-0005". Status `Proposed` até banca, `Accepted` após.
- **ADR-0005** atualizado no índice como `Superseded by ADR-0018`. Conteúdo permanece imutável (regra de ADRs).
- **`architecture/02-system-topology.md`** §3 e §5 reescritos para refletir API Gateway no lugar de Fastify; diagrama oficial do DevOps embutido.
- **`infrastructure/01-infra-handoff.md`** ganha seção sobre API Gateway (IaC, custom authorizer, rotas, mapeamentos).
- **`architecture/04-integration-events.md`** §6 nota sobre outbox cross-cloud (worker no `core-api` → consumidor no `legacy-api` GCP).
- **Inquiry-0013** ("Conectividade cross-cloud AWS↔GCP") aberta como follow-up.
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
