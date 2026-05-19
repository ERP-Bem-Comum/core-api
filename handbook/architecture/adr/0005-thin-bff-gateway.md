[← Voltar para ADRs](./README.md)

# ADR-0005: BFF Gateway Burro (Apenas Roteamento)

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Arquiteto

---

## Contexto

Durante a coexistência legado + novo, o front-end precisa direcionar chamadas para o serviço correto. Existem três opções clássicas:

1. **Front escolhe URL diretamente** (legacy.example.com vs api.example.com).
2. **BFF burro** entre front e serviços (só roteia).
3. **BFF inteligente** que compõe respostas e tem regra de negócio.

---

## Decisão

Implementar um **BFF Gateway burro** entre o front-end e os dois serviços de backend:

- Roteamento por prefixo: `/api/v1/*` → `legacy-api`, `/api/v2/*` → `core-api`.
- Cross-cutting: autenticação, rate limit, request-id, log estruturado.
- **Zero regra de negócio. Zero composição de respostas. Zero cache de domínio.**

Tamanho-alvo inicial: **200-300 linhas**. Stack: Node 20 + framework leve (Hono ou Fastify).

---

## Consequências

### Positivas

- Front consome um único host, simplificando CORS, cookies e observabilidade.
- Roteamento controlado por configuração — fácil de evoluir sem mudar front.
- Ponto de entrada único para auth e rate limit.
- Tamanho pequeno → fácil de manter.
- **Não vira o terceiro lugar onde regras de negócio se escondem.**

### Negativas

- Ponto único de falha — mitigado por réplicas.
- Latência adicional — mitigada por rede interna e simplicidade do gateway.
- **Tentação contínua** de "só colocar essa coisinha aqui no BFF" — combatida por revisão de PR rigorosa e por este ADR como referência.

### Neutras

- Stack interna (Hono, Fastify, http-proxy) é decisão menor — escolher pelo que o time domina.

---

## Restrições Explícitas (Para Resistir à Tentação)

| ❌ O BFF NÃO faz |
| :--- |
| Conhecer schema de domínio |
| Acessar banco de dados |
| Cachear respostas de domínio (cache HTTP padrão é OK) |
| Compor respostas de múltiplos backends |
| Traduzir formatos entre v1 e v2 |
| Implementar regras de negócio |
| Validar payload além de "é JSON válido" |

> Se uma feature pede algo da lista acima, **a implementação vai no `core-api` ou `legacy-api`**, não no BFF.

---

## Alternativas Consideradas

### A. Front Escolhe URL Diretamente

**Rejeitada porque:**
- Acoplamento forte do front à topologia de backend.
- CORS multiplica complexidade.
- Auth/sessão mais complicada com múltiplos hosts.
- Impossível mudar topologia sem deploy do front.

### B. BFF Inteligente (Composição + Regra de Negócio)

**Rejeitada porque:**
- Regras de negócio devem viver nos BCs (no `core-api` ou `legacy-api`), não no gateway.
- Composição prematura adiciona complexidade sem demanda real comprovada.
- BFF inteligente vira "monolito do meio" — pior dos dois mundos.

### C. Service Mesh (Istio, Linkerd)

**Rejeitada porque:**
- Overkill para 2 serviços.
- Complexidade operacional desproporcional.
- Pode ser introduzido depois se topologia crescer.

---

## Quando Re-avaliar

- Se aparecer demanda real e recorrente de composição de respostas.
- Se a quantidade de backends crescer significativamente (>5 serviços).
- Se aparecer requisito de orquestração que não se resolve via eventos.

> Mesmo nesses casos, prefira **introduzir um serviço novo** (orquestrador, gateway de domínio) em vez de inflar o BFF.

---

## Referências

- [ADR-0001](./0001-strangler-fig-over-rewrite.md) — Strangler Fig (motivação para coexistência).
- [`../02-system-topology.md`](../02-system-topology.md) — papel do BFF no diagrama.
