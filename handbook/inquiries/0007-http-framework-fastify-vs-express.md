# Inquiry-0007: Framework HTTP — Fastify vs Express

- **Status:** Decided
- **Opened:** 2026-04-28
- **Closed/Decided:** 2026-04-28
- **Opened by:** Gabriel Aderaldo
- **Asked to:** Análise interna comparativa
- **Impact:** Documento `architecture/05-runtime-decisions.md` (atualização), [ADR-0008](../architecture/adr/0008-bradesco-integration-architecture.md) (referência implícita)

---

## 1. Contexto

Recomendação inicial foi Fastify, com justificativa imprecisa ("governance OpenJS Foundation"). Express também é OpenJS Foundation desde 2016 — esse argumento não diferencia.

Necessidade: refazer comparação rigorosa Fastify vs Express para o caso específico do `core-api`.

---

## 2. Pergunta(s) feita(s)

> "Por que Fastify e não Express, considerando que Express tem 15 anos e ecossistema gigantesco?"

---

## 3. Respostas / Investigação

### 2026-04-28 — Análise comparativa

| Critério | Express 5 | Fastify 5 | Hono |
| :--- | :--- | :--- | :--- |
| Idade | ~15 anos | ~7 anos | ~3 anos |
| Foundation | OpenJS | OpenJS | — |
| Async-first | Adaptado | Nativo | Nativo |
| TypeScript | `@types/express` | First-class | First-class |
| Schema validation | Externa (Joi/Zod) | Embutida (JSON Schema/Ajv) | Externa |
| Plugin encapsulation | ❌ middleware global | ✅ scoped | ✅ |
| Performance | Baseline | ~2-3× Express | ~3× Express |
| Ecosystem | Gigante | Médio crescendo | Pequeno |
| Bus factor | Comunidade | Comunidade | 1 mantenedor (Yusuke Wada) |
| Edge runtime ready | ❌ | 🟡 | ✅ |

---

## 4. Análise interna

### Por que Fastify para ESTE projeto

1. **Modular Monolith com 4 BCs** ([ADR-0006](../architecture/adr/0006-modular-monolith-core-api.md)): encapsulation de plugins do Fastify se encaixa naturalmente — cada `contexts/<bc>/` vira plugin Fastify isolado.
2. **Estilo de código exige Result, smart constructors, validação rígida**: schema validation embutida do Fastify é alinhada.
3. **TS 7.0 chegará em Q3/Q4 2026** ([Inquiry-0004](./0004-node-version-and-typescript-future.md)): ecossistema TS-first absorve mudanças com menos atrito.
4. **Auditoria + correlation IDs**: `request.id` automático + Pino integrado por padrão.
5. **OpenAPI gerado**: `@fastify/swagger` extrai dos schemas — ideal para documentar dezenas de endpoints.

### Por que Hono foi descartado

- Bus factor preocupante (1 mantenedor central).
- Sistema financeiro de 5+ anos exige governance distribuído.
- Vantagens de Hono (edge-ready, Web Standards puro) não são prioridade aqui.

### Quando Express seria a escolha

- Time com 10+ anos de Express e zero Fastify (não é o caso — time absorve paradigma novo de qualquer jeito).
- Heritage do legado é Express raw (não é o caso — legado é NestJS).
- Necessidade de middleware específico que só existe em Express (raro hoje; `@fastify/express` resolve via adapter).

Nenhum desses se aplica.

---

## 5. Decisão final

**Fastify 5.x** no `core-api` e `bff-gateway`.

Plugins iniciais:
- `@fastify/swagger` + `@fastify/swagger-ui` (OpenAPI gerado).
- `@fastify/cors`.
- `@fastify/helmet`.
- `@fastify/rate-limit` (no BFF).

---

## 6. Saídas

- [x] Decisão registrada nesta inquiry.
- [ ] Atualizar `architecture/05-runtime-decisions.md` com seção sobre framework HTTP.
- [ ] (Sem ADR dedicado — é decisão tática de implementação, não estrutural.)

---

## 7. Referências

- [ADR-0006](../architecture/adr/0006-modular-monolith-core-api.md) — encapsulation de BCs.
- Documentação Fastify: https://fastify.dev/
- Express 5 release notes (out/2024).
