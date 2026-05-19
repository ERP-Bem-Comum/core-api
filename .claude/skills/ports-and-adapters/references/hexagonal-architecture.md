# Hexagonal Architecture (Ports & Adapters)

> 📖 **Fontes:**
> - Alistair Cockburn — "Hexagonal Architecture" (2005). Texto original disponível em `https://alistair.cockburn.us/hexagonal-architecture/`.
> - Vaughn Vernon — _Implementing Domain-Driven Design_ (IDDD), Capítulo 4 (Architecture), pp. 113-152.
> - Para detalhes de TypeScript moderno aplicados, sempre [`handbook/reference/typescript/`](../../../../../handbook/reference/typescript/).

---

## 1. A ideia central

> "The hexagonal architecture is **a structural pattern that lets an application equally be driven by users, programs, automated test or batch scripts, and be developed and tested in isolation** from its eventual run-time devices and databases." — Cockburn

Em código TS:

- **Domínio** no centro (pure TS, sem framework).
- **Ports** = type contracts no anel imediato em volta (definidos pela application).
- **Adapters** no anel externo, implementando ports.
- Dependência aponta **sempre para dentro**.

```
   ┌──────────────────────────────────────────┐
   │              ADAPTERS                    │
   │  (Drizzle, NestJS HTTP, S3 SDK, etc.)    │
   │   ┌──────────────────────────────────┐   │
   │   │          APPLICATION             │   │
   │   │     (Use Cases + Ports)          │   │
   │   │    ┌──────────────────────┐      │   │
   │   │    │       DOMAIN         │      │   │
   │   │    │   (Pure types +      │      │   │
   │   │    │    business rules)   │      │   │
   │   │    └──────────────────────┘      │   │
   │   └──────────────────────────────────┘   │
   └──────────────────────────────────────────┘
       ▲ Dependency direction (always inward)
```

---

## 2. Driving vs. Driven (left vs. right)

Cockburn fala em "left side" e "right side" do hexágono:

- **Left (driving):** quem **chama** o domínio. HTTP, CLI, message handler, cron, teste.
- **Right (driven):** quem **é chamado pelo** domínio. DB, file system, time, external API.

Para nós:

- **Driving:** não tem type explícito; é o "ator" (CLI ou HTTP handler). Cada use case **é, ele próprio,** a driving port.
- **Driven:** tem type explícito (`Repository`, `Clock`, `EventBus`, `Storage`, ...). Use case **recebe** essas deps via factory.

---

## 3. Por que isso bate com o nosso CLAUDE.md

Nosso CLAUDE.md raiz diz:

> Cada serviço tem domínio puro. Adapter na borda. Sem framework dentro do domínio.

Isso **é** Hexagonal — só renomeando:

| Cockburn | Nosso projeto |
| :--- | :--- |
| Application core | `src/modules/<modulo>/domain/` + `application/` |
| Port (driven) | `application/ports/*.ts` (type) |
| Adapter | `src/modules/<modulo>/adapters/*.ts` |
| Adapter para teste | `adapters/*.in-memory.ts` |

---

## 4. Vernon IDDD §4 — Hexagonal aplicado a DDD

Vernon enfatiza que Hexagonal é o **suporte mecânico** para Bounded Contexts:

> "**The Ports and Adapters Architecture**... advances the idea of a Layered Architecture, and goes deeper to address ... the fundamental problems of separation of concerns." — IDDD §4 p. 119

E sobre o anti-pattern de "vazar infra para dentro":

> "We must be careful not to allow technical concerns to leak from outer hexagons toward the inner core." — IDDD §4 p. 121

Tradução para nosso código: **`domain/` nunca pode importar de `application/` ou `adapters/`**.

---

## 5. Adapter pareado — sempre real + InMemory

Vernon recomenda — e nosso projeto adota — **dois adapters mínimos por port**:

1. **Real** (`*.mysql.ts`, `*.s3.ts`, `*.http.ts`) — para produção.
2. **InMemory** (`*.in-memory.ts`) — para testes do domínio E para a CLI da P.O. validar regras sem subir banco.

Esse par é o que viabiliza a fase atual do projeto: **dar uma CLI funcional para a P.O. antes de gastar 1 minuto em SQL**.

---

## 6. Erros: domínio → application → adapter

Camada vê o erro que precisa, não mais:

```
Domain:    'contrato-encerrado' | 'aditivo-sem-documento' | ...
              ▲ erro de regra de negócio
              │
Application: domínio-error | repo-error | bus-error | clock-error
              ▲ erro composto do use case
              │
Adapter:    decide se é Result<...> ou exceção pra logar
```

`throw` só vive em adapter, **convertido em `Result` antes de devolver à application**.

---

## 7. Quando NÃO inverter dependência

Não é dogma. Casos onde inverter é desnecessário:

- **Logger** — todos os módulos usam o mesmo logger; expô-lo via port adiciona ruído. Importar `pino`/`winston` direto é aceitável.
- **Erros de programação** (programação errada, asserções) — `throw` é OK.
- **Helpers puros sem efeito colateral** — não precisam de port.

Use port quando: (a) há mais de uma implementação esperada (real + fake), (b) o efeito colateral muda comportamento observável (DB, clock, network, eventos).

---

## 8. Glossário

| Termo | Definição |
| :--- | :--- |
| Port | Type contract que descreve uma dependência externa |
| Adapter | Implementação concreta de um Port |
| Driving port | Quem chama o domínio (use case é a porta direta) |
| Driven port | O que o domínio precisa de fora (Repository, Clock, EventBus) |
| Dependency inversion | Domínio define o contrato, adapter o satisfaz |
| Anti-corruption layer | Adapter que isola domínio de um sistema legado/externo |
